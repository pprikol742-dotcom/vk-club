-- Лайки и дизлайки текущего трека.

create table if not exists public.track_votes (
  club_id    uuid not null references public.clubs(id) on delete cascade,
  vk_id      bigint not null,
  /** к какому запуску трека относится голос */
  started_at timestamptz not null,
  vote       text not null check (vote in ('up','down')),
  created_at timestamptz not null default now(),
  primary key (club_id, vk_id, started_at)
);

alter table public.track_votes enable row level security;

drop policy if exists track_votes_read on public.track_votes;
create policy track_votes_read on public.track_votes for select using (true);

/**
 * Голос за трек. Один игрок — один голос за запуск.
 * Диджей за себя не голосует. Возвращает свежие счётчики.
 */
create or replace function public.vote_track(p_club uuid, p_vk_id bigint, p_vote text)
returns table (likes int, dislikes int)
language plpgsql security definer set search_path = public as $$
declare
  v_started timestamptz;
  v_dj      bigint;
begin
  if p_vote not in ('up','down') then
    raise exception 'Неизвестный голос';
  end if;

  select track_started_at, dj_vk_id into v_started, v_dj
  from public.club_sessions where club_id = p_club;

  if v_started is null then
    raise exception 'Сейчас ничего не играет';
  end if;
  if v_dj = p_vk_id then
    raise exception 'Диджей не голосует за свой трек';
  end if;

  insert into public.track_votes (club_id, vk_id, started_at, vote)
  values (p_club, p_vk_id, v_started, p_vote);

  if p_vote = 'up' then
    update public.club_sessions
      set likes = likes + 1, updated_at = now()
      where club_id = p_club;
  else
    update public.club_sessions
      set dislikes = dislikes + 1, updated_at = now()
      where club_id = p_club;
  end if;

  return query
    select s.likes, s.dislikes from public.club_sessions s where s.club_id = p_club;
exception
  when unique_violation then
    raise exception 'Ты уже голосовал за этот трек';
end;
$$;

/** За какой трек игрок уже голосовал. */
create or replace function public.my_vote(p_club uuid, p_vk_id bigint)
returns text language sql stable as $$
  select v.vote
  from public.track_votes v
  join public.club_sessions s
    on s.club_id = v.club_id and s.track_started_at = v.started_at
  where v.club_id = p_club and v.vk_id = p_vk_id;
$$;
