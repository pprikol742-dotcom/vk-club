-- ============================================================
--  20260905010000_modes_library_harem.sql
--  Режимы комнат, фонотека у каждой комнаты, модераторы,
--  защита гарема от перекупа.
--  Идемпотентна: можно гонять повторно.
-- ============================================================

-- ---------- режим комнаты ----------

alter table public.clubs
  add column if not exists mode text not null default 'queue';

alter table public.clubs drop constraint if exists clubs_mode_check;
alter table public.clubs
  add constraint clubs_mode_check check (mode in ('radio', 'queue'));

comment on column public.clubs.mode is
  'radio — играет фонотека комнаты, очереди нет; queue — сеты по очереди';

-- ---------- фонотека каждой комнаты ----------

alter table public.tracks
  add column if not exists club_id uuid references public.clubs(id) on delete cascade,
  add column if not exists added_by_vk_id bigint;

create index if not exists tracks_club_idx on public.tracks (club_id);

-- ---------- модераторы комнаты ----------
-- Сюда попадают те, у кого клиент подтвердил права в паблике ВК.

create table if not exists public.club_moderators (
  club_id    uuid   not null references public.clubs(id) on delete cascade,
  vk_id      bigint not null,
  role       text   not null default 'moderator',
  granted_at timestamptz not null default now(),
  primary key (club_id, vk_id)
);

alter table public.club_moderators enable row level security;

drop policy if exists club_moderators_read on public.club_moderators;
create policy club_moderators_read
  on public.club_moderators for select using (true);

/**
 * Клиент спросил у VK API groups.getById с фильтром по правам
 * и убедился, что игрок админ или редактор — записываем.
 */
create or replace function public.ensure_club_moderator(
  p_club   uuid,
  p_vk_id  bigint,
  p_role   text default 'moderator'
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.club_moderators (club_id, vk_id, role)
  values (p_club, p_vk_id, coalesce(p_role, 'moderator'))
  on conflict (club_id, vk_id) do update set role = excluded.role;
$$;

/**
 * Право распоряжаться комнатой: владелец клуба в игре
 * либо подтверждённый модератор паблика.
 * Имя колонки владельца ищем через jsonb — в разных клубах
 * оно может быть owner_vk_id или creator_vk_id.
 */
create or replace function public.can_manage_club(
  p_club  uuid,
  p_vk_id bigint
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select true
       from public.clubs c
      where c.id = p_club
        and (
          (to_jsonb(c) ->> 'owner_vk_id')::bigint   = p_vk_id or
          (to_jsonb(c) ->> 'creator_vk_id')::bigint = p_vk_id
        )
     limit 1),
    (select true
       from public.club_moderators m
      where m.club_id = p_club and m.vk_id = p_vk_id
     limit 1),
    false);
$$;

-- ---------- переключение режима ----------

create or replace function public.set_club_mode(
  p_club  uuid,
  p_vk_id bigint,
  p_mode  text
) returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_mode not in ('radio', 'queue') then
    raise exception 'Неизвестный режим';
  end if;

  if not public.can_manage_club(p_club, p_vk_id) then
    raise exception 'Менять режим может только админ клуба';
  end if;

  update public.clubs set mode = p_mode where id = p_club;
  return p_mode;
end;
$$;

-- ---------- удаление трека из фонотеки ----------
-- id трека принимаем текстом, чтобы не зависеть от его типа.

create or replace function public.delete_club_track(
  p_track_id text,
  p_vk_id    bigint
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club uuid;
begin
  select club_id into v_club
    from public.tracks
   where id::text = p_track_id;

  if v_club is null then
    raise exception 'Трек не найден или он общий, а не клубный';
  end if;

  if not public.can_manage_club(v_club, p_vk_id) then
    raise exception 'Удалять треки может только админ клуба';
  end if;

  delete from public.tracks where id::text = p_track_id;
end;
$$;

-- ---------- защита гарема от перекупа ----------

alter table public.profiles
  add column if not exists harem_locked boolean not null default false;

comment on column public.profiles.harem_locked is
  'Включён — гарем этого игрока перекупить нельзя';

create or replace function public.set_harem_lock(
  p_vk_id bigint,
  p_value boolean
) returns boolean
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set harem_locked = coalesce(p_value, false)
   where vk_id = p_vk_id
  returning harem_locked;
$$;

-- ---------- права ----------

grant execute on function public.ensure_club_moderator(uuid, bigint, text) to anon, authenticated;
grant execute on function public.can_manage_club(uuid, bigint)             to anon, authenticated;
grant execute on function public.set_club_mode(uuid, bigint, text)         to anon, authenticated;
grant execute on function public.delete_club_track(text, bigint)           to anon, authenticated;
grant execute on function public.set_harem_lock(bigint, boolean)           to anon, authenticated;

-- ---------- отчёт ----------

select 'КОЛОНКИ' as блок, table_name || '.' || column_name as имя, data_type as тип
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'clubs'    and column_name = 'mode') or
    (table_name = 'tracks'   and column_name in ('club_id', 'added_by_vk_id')) or
    (table_name = 'profiles' and column_name = 'harem_locked')
  )

union all
select 'ФУНКЦИИ', routine_name, ''
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'ensure_club_moderator', 'can_manage_club',
    'set_club_mode', 'delete_club_track', 'set_harem_lock'
  )
order by 1, 2;
