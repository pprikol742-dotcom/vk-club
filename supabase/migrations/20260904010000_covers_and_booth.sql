-- ============================================================
--  В КЛУБЕ — все миграции одним файлом
--  Проект Supabase: sghgkhljvgrvhmmkihkh
--
--  Файл идемпотентный: гоняй сколько угодно раз подряд,
--  ничего не сломается и не задвоится.
--  Ничего не удаляет, только добавляет недостающее.
-- ============================================================


-- ------------------------------------------------------------
--  0. Проверка почвы
-- ------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'clubs'
  ) then
    raise exception 'Нет таблицы public.clubs — сначала накати базовые миграции 001-020';
  end if;
end $$;


-- ------------------------------------------------------------
--  021. Обложки клубов из пабликов ВК
-- ------------------------------------------------------------

alter table public.clubs
  add column if not exists cover_url        text,
  add column if not exists cover_updated_at timestamptz;

create or replace function public.set_club_cover(
  p_club_id uuid,
  p_url     text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_url is null or length(p_url) < 8 or p_url !~ '^https://' then
    return;
  end if;

  update public.clubs
     set cover_url = p_url,
         cover_updated_at = now()
   where id = p_club_id
     and (cover_url is null
          or cover_url <> p_url
          or cover_updated_at < now() - interval '1 day');
end;
$$;


-- ------------------------------------------------------------
--  022. Пульт и текущий трек
-- ------------------------------------------------------------

alter table public.clubs
  add column if not exists dj_vk_id          bigint,
  add column if not exists dj_since          timestamptz,
  add column if not exists now_playing_title text,
  add column if not exists now_playing_url   text,
  add column if not exists track_started_at  timestamptz,
  add column if not exists track_ends_at     timestamptz;

create index if not exists clubs_dj_idx on public.clubs (dj_vk_id);


-- встать за пульт: пускаем, только если он свободен
create or replace function public.take_booth(
  p_club_id uuid,
  p_vk_id   bigint
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current bigint;
begin
  select dj_vk_id into v_current
    from public.clubs
   where id = p_club_id
     for update;

  if v_current is null or v_current = p_vk_id then
    update public.clubs
       set dj_vk_id = p_vk_id,
           dj_since = coalesce(dj_since, now())
     where id = p_club_id;
    return true;
  end if;

  return false;
end;
$$;


-- уйти с пульта: заодно снимаем трек
create or replace function public.leave_booth(
  p_club_id uuid,
  p_vk_id   bigint
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.clubs
     set dj_vk_id          = null,
         dj_since          = null,
         now_playing_title = null,
         now_playing_url   = null,
         track_started_at  = null,
         track_ends_at     = null
   where id = p_club_id
     and dj_vk_id = p_vk_id;
end;
$$;


-- зарядить трек: только если зовущий реально за пультом.
-- клиент по ответу решает, запускать звук или нет
create or replace function public.set_now_playing(
  p_club_id  uuid,
  p_vk_id    bigint,
  p_title    text,
  p_url      text,
  p_duration int default 180
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.clubs
     set now_playing_title = p_title,
         now_playing_url   = p_url,
         track_started_at  = now(),
         track_ends_at     = now() + make_interval(secs => greatest(p_duration, 1))
   where id = p_club_id
     and dj_vk_id = p_vk_id;

  return found;
end;
$$;


-- уборка: трек кончился, а диджей отвалился
create or replace function public.clear_finished_tracks()
returns void
language sql
security definer
set search_path = public
as $$
  update public.clubs
     set now_playing_title = null,
         now_playing_url   = null,
         track_started_at  = null,
         track_ends_at     = null
   where track_ends_at is not null
     and track_ends_at < now() - interval '30 seconds';
$$;


-- ------------------------------------------------------------
--  Права
-- ------------------------------------------------------------

grant execute on function public.set_club_cover(uuid, text)                     to anon, authenticated;
grant execute on function public.take_booth(uuid, bigint)                       to anon, authenticated;
grant execute on function public.leave_booth(uuid, bigint)                      to anon, authenticated;
grant execute on function public.set_now_playing(uuid, bigint, text, text, int) to anon, authenticated;
grant execute on function public.clear_finished_tracks()                        to anon, authenticated;


-- ------------------------------------------------------------
--  Расписание уборки (если pg_cron включён)
-- ------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('clear_finished_tracks');
    exception when others then
      null;
    end;

    perform cron.schedule(
      'clear_finished_tracks',
      '* * * * *',
      $cron$ select public.clear_finished_tracks(); $cron$
    );
  else
    raise notice 'pg_cron не включён — уборка треков не запланирована';
  end if;
end $$;


-- ------------------------------------------------------------
--  Отчёт: что получилось
-- ------------------------------------------------------------

select 'КОЛОНКИ clubs' as блок, column_name as имя, data_type as тип
from information_schema.columns
where table_schema = 'public'
  and table_name = 'clubs'
  and column_name in (
    'cover_url','cover_updated_at','dj_vk_id','dj_since',
    'now_playing_title','now_playing_url','track_started_at','track_ends_at'
  )

union all
select 'ФУНКЦИИ', routine_name, ''
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'set_club_cover','take_booth','leave_booth',
    'set_now_playing','clear_finished_tracks'
  )
order by 1, 2;
