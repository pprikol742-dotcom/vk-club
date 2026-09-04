-- 20260904020000_fix_booth.sql
-- Убирает ошибочные колонки и функции пульта: состояние диджея
-- живёт в club_sessions, дублировать его в clubs не нужно.

alter table public.clubs
  drop column if exists dj_vk_id,
  drop column if exists dj_since,
  drop column if exists now_playing_title,
  drop column if exists now_playing_url,
  drop column if exists track_started_at,
  drop column if exists track_ends_at;

drop index if exists public.clubs_dj_idx;

drop function if exists public.take_booth(uuid, bigint);
drop function if exists public.leave_booth(uuid, bigint);
drop function if exists public.set_now_playing(uuid, bigint, text, text, int);
drop function if exists public.clear_finished_tracks();

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('clear_finished_tracks');
    exception when others then
      null;
    end;
  end if;
end $$;

-- обложки остаются: они на clubs и это правильно
-- cover_url, cover_updated_at, set_club_cover() не трогаем