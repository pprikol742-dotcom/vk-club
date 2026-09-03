-- Диджей голосует за свой трек наравне со всеми.

create or replace function public.vote_track(p_club uuid, p_vk_id bigint, p_vote text)
returns table (likes int, dislikes int)
language plpgsql security definer set search_path = public as $$
declare
  v_started timestamptz;
begin
  if p_vote not in ('up','down') then
    raise exception 'Неизвестный голос';
  end if;

  select track_started_at into v_started
  from public.club_sessions where club_id = p_club;

  if v_started is null then
    raise exception 'Сейчас ничего не играет';
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
