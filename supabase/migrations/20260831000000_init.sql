-- =========================================================
-- VK Club (диджей-клуб) — базовая схема
-- Все изменения баланса монет / владения / очереди DJ идут
-- ТОЛЬКО через Edge Functions под service_role.
-- Клиент (anon key) — только SELECT, никаких прямых UPDATE/INSERT
-- на денежные и игровые поля. Это защита от читерства через devtools.
-- =========================================================

-- ---------- PROFILES ----------
create table if not exists profiles (
  vk_id bigint primary key,
  first_name text not null default '',
  last_name text not null default '',
  avatar_url text,
  coins integer not null default 0 check (coins >= 0),
  hand_skin text not null default 'standard',        -- текущая купленная "рука"
  owned_hand_skins text[] not null default array['standard'],
  daily_streak int not null default 0,                -- 0..6, день недели цикла
  last_daily_claim_at date,
  founder_rank smallint check (founder_rank between 1 and 3),  -- 1..3 = один из первых трёх игроков в игре
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles are readable by everyone"
  on profiles for select
  using (true);

create unique index if not exists idx_profiles_founder_rank on profiles (founder_rank) where founder_rank is not null;

-- Глобальный атомарный счётчик регистраций — нужен, чтобы честно раздать
-- founder_rank 1..3 даже если несколько человек регистрируются одновременно.
create table if not exists game_counters (
  id text primary key,
  registered_count int not null default 0
);
insert into game_counters (id, registered_count) values ('global', 0)
on conflict (id) do nothing;

-- INSERT/UPDATE профиля только через service_role (edge function verify-launch,
-- вызывает функцию upsert_profile_with_founder ниже), поэтому отдельных
-- policy на insert/update для anon/authenticated не создаём.

create or replace function upsert_profile_with_founder(
  p_vk_id bigint, p_first_name text, p_last_name text, p_avatar_url text
) returns profiles
language plpgsql
security definer
as $$
declare
  v_profile profiles;
  v_is_new boolean := false;
  v_count int;
begin
  select * into v_profile from profiles where vk_id = p_vk_id for update;

  if not found then
    v_is_new := true;
    insert into profiles (vk_id, first_name, last_name, avatar_url)
    values (p_vk_id, p_first_name, p_last_name, p_avatar_url)
    returning * into v_profile;
  else
    update profiles
      set first_name = p_first_name, last_name = p_last_name, avatar_url = p_avatar_url
      where vk_id = p_vk_id
      returning * into v_profile;
  end if;

  if v_is_new then
    update game_counters set registered_count = registered_count + 1
      where id = 'global'
      returning registered_count into v_count;

    if v_count <= 3 then
      update profiles set founder_rank = v_count where vk_id = p_vk_id
        returning * into v_profile;
    end if;
  end if;

  return v_profile;
end;
$$;


-- ---------- CLUBS ----------
-- club = паблик ВК. Создать может только админ паблика (проверяется в edge function create-club).
create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  vk_group_id bigint not null unique,
  name text not null,
  owner_vk_id bigint not null references profiles(vk_id),
  theme text not null default 'neon-violet',
  light_show_default boolean not null default true,
  is_featured boolean not null default false,   -- всегда первой строкой в списке клубов
  created_at timestamptz not null default now()
);

alter table clubs enable row level security;

create policy "clubs are readable by everyone"
  on clubs for select
  using (true);

-- Пригодится, когда сделаем список/каталог клубов (Этап 2): выдаёт featured-клуб первым.
create index if not exists idx_clubs_featured on clubs (is_featured desc, created_at asc);


-- ---------- CURRENT TRACK / DJ SESSION ----------
-- Одна строка на клуб = что сейчас играет и кто DJ.
create table if not exists club_sessions (
  club_id uuid primary key references clubs(id) on delete cascade,
  dj_vk_id bigint references profiles(vk_id),
  track_title text,
  track_artist text,
  track_source text,              -- 'user_upload' | 'library' (см. ограничение VK Audio API)
  track_url text,
  track_duration_sec int,
  track_started_at timestamptz,
  likes int not null default 0,
  dislikes int not null default 0,
  updated_at timestamptz not null default now()
);

alter table club_sessions enable row level security;

create policy "sessions are readable by everyone"
  on club_sessions for select
  using (true);


-- ---------- DJ QUEUE ----------
create table if not exists dj_queue (
  id bigint generated always as identity primary key,
  club_id uuid not null references clubs(id) on delete cascade,
  vk_id bigint not null references profiles(vk_id),
  position int not null,
  paid_coins int not null default 0,   -- если влез вне очереди за монеты
  created_at timestamptz not null default now(),
  unique (club_id, vk_id)
);

alter table dj_queue enable row level security;

create policy "queue is readable by everyone"
  on dj_queue for select
  using (true);


-- ---------- GIFTS CATALOG ----------
create table if not exists gifts_catalog (
  id text primary key,               -- 'ice_cream', 'chocolate', 'cigar', ...
  category text not null,            -- 'player' | 'dj' | 'decoration' | 'hand_skin'
  name text not null,
  icon text not null,                -- имя файла иконки в /assets
  price int not null
);

alter table gifts_catalog enable row level security;

create policy "catalog is readable by everyone"
  on gifts_catalog for select
  using (true);

insert into gifts_catalog (id, category, name, icon, price) values
  ('ice_cream',      'player', 'Мороженое',            'ice_cream.png',      5),
  ('chocolate',      'player', 'Шоколадная конфета',   'chocolate.png',      5),
  ('cigar',          'dj',     'Сигара',                'cigar.png',          7),
  -- напитки/угощения DJ (переосмысленные, оригинальная графика)
  ('hookah',         'dj',     'Кальян',                'hookah.png',         7),
  ('wine_glass',     'dj',     'Бокал вина',            'wine_glass.png',     5),
  ('cognac_glass',   'dj',     'Бокал коньяка',         'cognac_glass.png',   6),
  ('beer_bottle',    'dj',     'Бутылка пива',          'beer_bottle.png',    5),
  ('coffee',         'dj',     'Чашечка кофе',          'coffee.png',         4),
  ('chifir',         'dj',     'Кружка чифира',         'chifir.png',         6),
  -- милые подарки игрокам
  ('raspberry',      'player', 'Малинка',               'raspberry.png',      4),
  ('kiss',           'player', 'Поцелуйчик',            'kiss.png',           5),
  ('heart',          'player', 'Сердечко',              'heart.png',          5),
  ('snowball',       'player', 'Снежок',                'snowball.png',       3),
  -- троллинг-подарки: прилетают в аватарку и "пачкают" её на пару секунд (UI - следующий этап)
  ('rotten_tomato',  'player', 'Гнилой помидор',        'rotten_tomato.png',  3),
  ('egg',            'player', 'Яйцо',                  'egg.png',            3),
  -- от меня: диско-шар (украшение), конфетти-пушка (общий эффект на весь зал), винил (DJ)
  ('disco_ball',     'decoration', 'Диско-шар',         'disco_ball.png',     12),
  ('confetti_popper','dj',     'Конфетти-пушка',        'confetti_popper.png', 9),
  ('vinyl_record',   'dj',     'Виниловая пластинка',   'vinyl_record.png',    6)
on conflict (id) do nothing;

-- ---------- РУКИ (магазин рук) ----------
insert into gifts_catalog (id, category, name, icon, price) values
  ('standard',  'hand_skin', 'Стандарт',            '',                    0),
  ('rocker',    'hand_skin', 'Рокер',               'hand_rocker.png',    150),
  ('lady',      'hand_skin', 'Леди',                'hand_lady.png',      150),
  ('muzhik',    'hand_skin', 'Мужик',               'hand_muzhik.png',    100),
  ('vader',     'hand_skin', 'Д. Вейдер',           'hand_vader.png',     200),
  ('zombie_1',  'hand_skin', 'Зомби',               'hand_zombie_1.png',  150),
  ('zombie_2',  'hand_skin', 'Зомби (кровавый)',    'hand_zombie_2.png',  200),
  ('cyborg',    'hand_skin', 'Киберпанк',           'hand_cyborg.png',    200),
  ('arestant',  'hand_skin', 'Арестант',            'hand_arestant.png',  150)
on conflict (id) do nothing;


-- ---------- GIFT TRANSACTIONS ----------
create table if not exists gift_transactions (
  id bigint generated always as identity primary key,
  club_id uuid not null references clubs(id) on delete cascade,
  from_vk_id bigint not null references profiles(vk_id),
  to_vk_id bigint references profiles(vk_id),   -- null, если подарок диджею "в общее"
  gift_id text not null references gifts_catalog(id),
  created_at timestamptz not null default now()
);

alter table gift_transactions enable row level security;

create policy "gift log is readable by everyone"
  on gift_transactions for select
  using (true);


-- ---------- HAREM / ПЕРЕКУП ----------
-- owner_vk_id "владеет" target_vk_id в рамках клуба, пока кто-то не перекупит дороже.
create table if not exists ownerships (
  club_id uuid not null references clubs(id) on delete cascade,
  target_vk_id bigint not null references profiles(vk_id),
  owner_vk_id bigint not null references profiles(vk_id),
  price_paid int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (club_id, target_vk_id)
);

alter table ownerships enable row level security;

create policy "ownerships are readable by everyone"
  on ownerships for select
  using (true);


-- ---------- DECORATIONS ----------
create table if not exists decorations_placed (
  id bigint generated always as identity primary key,
  club_id uuid not null references clubs(id) on delete cascade,
  decoration_id text not null references gifts_catalog(id),
  placed_by_vk_id bigint not null references profiles(vk_id),
  created_at timestamptz not null default now()
);

alter table decorations_placed enable row level security;

create policy "decorations are readable by everyone"
  on decorations_placed for select
  using (true);


-- ---------- CHAT ----------
create table if not exists chat_messages (
  id bigint generated always as identity primary key,
  club_id uuid not null references clubs(id) on delete cascade,
  vk_id bigint not null references profiles(vk_id),
  reply_to_vk_id bigint references profiles(vk_id),
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table chat_messages enable row level security;

create policy "chat is readable by everyone"
  on chat_messages for select
  using (true);

-- Вставка сообщений тоже идёт через edge function (простая rate-limit + мат-фильтр),
-- поэтому insert policy для anon не создаём.

create index if not exists idx_chat_club_created on chat_messages (club_id, created_at desc);
create index if not exists idx_gift_tx_club_created on gift_transactions (club_id, created_at desc);


-- ---------- HELPER: сдвиг позиций в очереди DJ после того, как кто-то стал DJ ----------
create or replace function shift_dj_queue_positions(p_club_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update dj_queue
  set position = position - 1
  where club_id = p_club_id;
end;
$$;
