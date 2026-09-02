-- Версия под твою схему на vk_id (заменяет 019, ту накатывать не нужно).

alter table public.clubs
  add column if not exists welcome_text text not null default '';

-- роли в клубе
create table if not exists public.club_members (
  club_id   uuid not null references public.clubs(id) on delete cascade,
  vk_id     bigint not null,
  role      text not null default 'member' check (role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  primary key (club_id, vk_id)
);

-- баны на сутки
create table if not exists public.club_bans (
  club_id    uuid not null references public.clubs(id) on delete cascade,
  vk_id      bigint not null,
  banned_by  bigint not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  primary key (club_id, vk_id)
);
create index if not exists club_bans_active_idx on public.club_bans (club_id, vk_id, expires_at);

-- гарем: кто чей хозяин
create table if not exists public.harem_owners (
  vk_id      bigint primary key,
  owner_vk_id bigint not null,
  price      int not null default 32,
  updated_at timestamptz not null default now()
);

/* ---------- проверки ---------- */

create or replace function public.club_role_vk(p_club uuid, p_vk bigint)
returns text language sql stable as $$
  select coalesce(
    (select m.role from public.club_members m where m.club_id = p_club and m.vk_id = p_vk),
    case when exists (
      select 1 from public.clubs c where c.id = p_club and c.owner_vk_id = p_vk
    ) then 'owner' else 'member' end
  );
$$;

create or replace function public.is_banned_vk(p_club uuid, p_vk_id bigint)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.club_bans b
    where b.club_id = p_club and b.vk_id = p_vk_id and b.expires_at > now()
  );
$$;

/* ---------- бан: только жёлтая рамка ---------- */

create or replace function public.ban_user_vk(p_club uuid, p_target_vk bigint, p_actor_vk bigint default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_actor bigint := coalesce(p_actor_vk, (current_setting('request.jwt.claims', true)::json ->> 'vk_id')::bigint);
  v_name  text;
begin
  if v_actor is null then
    raise exception 'Не удалось определить, кто выгоняет';
  end if;
  if public.club_role_vk(p_club, v_actor) not in ('owner','admin') then
    raise exception 'Выгонять может только хозяин клуба';
  end if;
  if p_target_vk = v_actor then
    raise exception 'Нельзя выгнать самого себя';
  end if;
  if public.club_role_vk(p_club, p_target_vk) in ('owner','admin') then
    raise exception 'Нельзя выгнать хозяина клуба';
  end if;

  insert into public.club_bans (club_id, vk_id, banned_by)
  values (p_club, p_target_vk, v_actor)
  on conflict (club_id, vk_id)
  do update set created_at = now(), expires_at = now() + interval '24 hours', banned_by = v_actor;

  select first_name into v_name from public.profiles where vk_id = p_target_vk;

  insert into public.chat_messages (club_id, vk_id, message)
  values (p_club, 0, 'Владелец выгнал ' || coalesce(v_name, 'пользователя') || ' из клуба');
end;
$$;

/* ---------- приветствие: только хозяин ---------- */

create or replace function public.set_welcome_vk(p_club uuid, p_text text, p_actor_vk bigint default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_actor bigint := coalesce(p_actor_vk, (current_setting('request.jwt.claims', true)::json ->> 'vk_id')::bigint);
begin
  if public.club_role_vk(p_club, v_actor) <> 'owner' then
    raise exception 'Приветствие меняет только хозяин клуба';
  end if;
  update public.clubs set welcome_text = left(coalesce(p_text, ''), 1000) where id = p_club;
end;
$$;

/* ---------- гарем: перекуп ---------- */

create or replace function public.buyout_vk(p_club uuid, p_target_vk bigint, p_actor_vk bigint default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_actor bigint := coalesce(p_actor_vk, (current_setting('request.jwt.claims', true)::json ->> 'vk_id')::bigint);
  v_price int;
  v_coins int;
begin
  if p_target_vk = v_actor then
    raise exception 'Себя перекупить нельзя';
  end if;

  select coalesce(price, 32) into v_price from public.harem_owners where vk_id = p_target_vk;
  v_price := coalesce(v_price, 32);

  select coins into v_coins from public.profiles where vk_id = v_actor;
  if coalesce(v_coins, 0) < v_price then
    raise exception 'Не хватает монет';
  end if;

  update public.profiles set coins = coins - v_price where vk_id = v_actor;

  insert into public.harem_owners (vk_id, owner_vk_id, price)
  values (p_target_vk, v_actor, ceil(v_price * 1.5))
  on conflict (vk_id)
  do update set owner_vk_id = v_actor, price = ceil(public.harem_owners.price * 1.5), updated_at = now();
end;
$$;

/* ---------- RLS ---------- */

alter table public.club_members  enable row level security;
alter table public.club_bans     enable row level security;
alter table public.harem_owners  enable row level security;

drop policy if exists club_members_read on public.club_members;
create policy club_members_read on public.club_members for select using (true);

drop policy if exists club_bans_read on public.club_bans;
create policy club_bans_read on public.club_bans for select using (true);

drop policy if exists club_bans_no_write on public.club_bans;
create policy club_bans_no_write on public.club_bans for insert with check (false);

drop policy if exists harem_read on public.harem_owners;
create policy harem_read on public.harem_owners for select using (true);

drop policy if exists harem_no_write on public.harem_owners;
create policy harem_no_write on public.harem_owners for insert with check (false);

-- уборка просроченных банов
select cron.schedule(
  'purge-club-bans',
  '7 * * * *',
  $$ delete from public.club_bans where expires_at < now() $$
) where not exists (select 1 from cron.job where jobname = 'purge-club-bans');
