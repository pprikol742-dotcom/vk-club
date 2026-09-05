-- ============================================================
--  20260905020000_radio_and_club_library.sql
--  Радио-режим и фонотека, привязанная к комнате.
--  Идемпотентна.
-- ============================================================

-- ---------- пометка радио в сессии ----------

alter table public.club_sessions
  add column if not exists is_radio boolean not null default false;

comment on column public.club_sessions.is_radio is
  'true — играет фонотека комнаты, живого диджея за пультом нет';

-- ---------- фонотека комнаты ----------
-- club_id уже добавлен предыдущей миграцией; здесь только поиск и выбор.

/** Треки конкретной комнаты. Пустой запрос — самые заигранные. */
create or replace function public.search_club_tracks(
  p_club  uuid,
  p_query text default '',
  p_limit int  default 50
) returns setof public.tracks
language sql
stable
as $$
  select *
    from public.tracks
   where club_id = p_club
     and (p_query is null or trim(p_query) = ''
          or artist ilike '%' || p_query || '%'
          or title  ilike '%' || p_query || '%')
   order by plays desc, created_at desc
   limit least(coalesce(p_limit, 50), 100);
$$;

/** Случайный трек комнаты — им питается радио. */
create or replace function public.random_club_track(p_club uuid)
returns setof public.tracks
language sql
stable
as $$
  select * from public.tracks
   where club_id = p_club and url is not null and url <> ''
   order by random()
   limit 1;
$$;

/**
 * Положить трек в фонотеку комнаты.
 * Если трек уже клубный — просто вернём его.
 * Если общий — заводим клубную копию, чтобы удаление в одной
 * комнате не выдёргивало музыку из другой.
 */
create or replace function public.add_track_to_club(
  p_track_id text,
  p_club     uuid,
  p_vk_id    bigint
) returns public.tracks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src public.tracks;
  v_new public.tracks;
begin
  select * into v_src from public.tracks where id::text = p_track_id;
  if v_src.id is null then
    raise exception 'Трек не найден';
  end if;

  if v_src.club_id = p_club then
    return v_src;
  end if;

  -- такой же трек уже в этой комнате?
  select * into v_new
    from public.tracks
   where club_id = p_club and url = v_src.url
   limit 1;
  if v_new.id is not null then
    return v_new;
  end if;

  insert into public.tracks
    (artist, title, duration, url, storage_path, uploaded_by, club_id, added_by_vk_id)
  values
    (v_src.artist, v_src.title, v_src.duration, v_src.url,
     v_src.storage_path, v_src.uploaded_by, p_club, p_vk_id)
  returning * into v_new;

  return v_new;
end;
$$;

-- ---------- счётчик прослушиваний ----------

create or replace function public.bump_track_plays(p_track_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.tracks set plays = plays + 1 where id::text = p_track_id;
$$;

-- ---------- права ----------

grant execute on function public.search_club_tracks(uuid, text, int)  to anon, authenticated;
grant execute on function public.random_club_track(uuid)              to anon, authenticated;
grant execute on function public.add_track_to_club(text, uuid, bigint) to anon, authenticated;
grant execute on function public.bump_track_plays(text)               to anon, authenticated;

-- ---------- отчёт ----------

select 'ФУНКЦИИ' as блок, routine_name as имя
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'search_club_tracks', 'random_club_track',
    'add_track_to_club', 'bump_track_plays'
  )
union all
select 'КОЛОНКА', 'club_sessions.is_radio'
from information_schema.columns
where table_schema = 'public' and table_name = 'club_sessions' and column_name = 'is_radio'
order by 1, 2;
