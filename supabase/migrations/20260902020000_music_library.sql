-- Фонотека игры: общий каталог, личные плейлисты, файлы в Storage.

-- 1. Хранилище файлов
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tracks', 'tracks', true, 20971520, array['audio/mpeg','audio/mp3','audio/mp4','audio/ogg','audio/wav'])
on conflict (id) do update
  set public = true,
      file_size_limit = 20971520,
      allowed_mime_types = array['audio/mpeg','audio/mp3','audio/mp4','audio/ogg','audio/wav'];

-- слушать может любой, заливать — авторизованный
drop policy if exists tracks_read on storage.objects;
create policy tracks_read on storage.objects
  for select using (bucket_id = 'tracks');

drop policy if exists tracks_upload on storage.objects;
create policy tracks_upload on storage.objects
  for insert with check (bucket_id = 'tracks');

-- 2. Общий каталог
create table if not exists public.tracks (
  id            uuid primary key default gen_random_uuid(),
  artist        text not null,
  title         text not null,
  duration      int  not null default 180,
  /** прямая ссылка на файл */
  url           text not null,
  /** путь внутри бакета, если файл залит нами */
  storage_path  text,
  uploaded_by   bigint,
  plays         int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists tracks_search_idx
  on public.tracks using gin (to_tsvector('russian', artist || ' ' || title));
create index if not exists tracks_created_idx on public.tracks (created_at desc);

-- 3. Личный плейлист игрока
create table if not exists public.user_tracks (
  vk_id     bigint not null,
  track_id  uuid not null references public.tracks(id) on delete cascade,
  added_at  timestamptz not null default now(),
  primary key (vk_id, track_id)
);
create index if not exists user_tracks_recent_idx on public.user_tracks (vk_id, added_at desc);

-- 4. Поиск по каталогу
create or replace function public.search_tracks(p_query text, p_limit int default 50)
returns setof public.tracks language sql stable as $$
  select *
  from public.tracks
  where p_query is null or trim(p_query) = ''
     or artist ilike '%' || p_query || '%'
     or title  ilike '%' || p_query || '%'
  order by plays desc, created_at desc
  limit least(coalesce(p_limit, 50), 100);
$$;

-- 5. Последние 50 треков игрока
create or replace function public.my_tracks(p_vk_id bigint)
returns setof public.tracks language sql stable as $$
  select t.*
  from public.user_tracks ut
  join public.tracks t on t.id = ut.track_id
  where ut.vk_id = p_vk_id
  order by ut.added_at desc
  limit 50;
$$;

-- 6. RLS: читают все, пишут через клиент с ключом проекта
alter table public.tracks       enable row level security;
alter table public.user_tracks  enable row level security;

drop policy if exists tracks_select on public.tracks;
create policy tracks_select on public.tracks for select using (true);

drop policy if exists tracks_insert on public.tracks;
create policy tracks_insert on public.tracks for insert with check (true);

drop policy if exists user_tracks_select on public.user_tracks;
create policy user_tracks_select on public.user_tracks for select using (true);

drop policy if exists user_tracks_insert on public.user_tracks;
create policy user_tracks_insert on public.user_tracks for insert with check (true);

drop policy if exists user_tracks_delete on public.user_tracks;
create policy user_tracks_delete on public.user_tracks for delete using (true);

-- Клип, который крутится в зале вместе с треком
alter table public.club_sessions
  add column if not exists track_video_url text;
