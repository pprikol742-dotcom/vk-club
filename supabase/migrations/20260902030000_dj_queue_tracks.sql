-- Диджей заряжает трек заранее — храним его вместе с местом в очереди.

alter table public.dj_queue
  add column if not exists track_title        text,
  add column if not exists track_artist       text,
  add column if not exists track_source       text,
  add column if not exists track_url          text,
  add column if not exists track_video_url    text,
  add column if not exists track_duration_sec int;

alter table public.club_sessions
  add column if not exists track_video_url text;

-- на всякий случай: у каждого клуба должна быть строка сессии
insert into public.club_sessions (club_id)
select c.id from public.clubs c
where not exists (select 1 from public.club_sessions s where s.club_id = c.id);

-- сдвиг позиций после ухода диджея — пересчитываем по порядку,
-- чтобы не уползали в минус
create or replace function public.shift_dj_queue_positions(p_club_id uuid)
returns void language plpgsql security definer as $$
begin
  with ordered as (
    select id, row_number() over (order by position, created_at) as rn
    from public.dj_queue
    where club_id = p_club_id
  )
  update public.dj_queue q
  set position = o.rn
  from ordered o
  where q.id = o.id;
end;
$$;
