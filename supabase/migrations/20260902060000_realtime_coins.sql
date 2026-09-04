-- 1. Realtime: без этого второе окно не узнаёт о смене трека и диджея.
alter table public.club_sessions replica identity full;
alter table public.chat_messages replica identity full;
alter table public.dj_queue      replica identity full;

do $$
begin
  begin execute 'alter publication supabase_realtime add table public.club_sessions'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.chat_messages'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.dj_queue';      exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.gift_transactions'; exception when duplicate_object then null; end;
end $$;

-- 2. Безлимитные монеты для владельца игры.
alter table public.profiles
  add column if not exists unlimited_coins boolean not null default false;

/**
 * Монеты у владельца не кончаются: любое списание тут же возвращается.
 * Код Edge Functions при этом менять не нужно.
 */
create or replace function public.keep_coins_unlimited()
returns trigger language plpgsql as $$
begin
  if new.unlimited_coins and new.coins < 1000000 then
    new.coins := 1000000;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_unlimited_coins on public.profiles;
create trigger profiles_unlimited_coins
  before insert or update on public.profiles
  for each row execute function public.keep_coins_unlimited();

-- 3. Покупка монет за голоса ВК: 50 монет = 5 голосов.
create table if not exists public.coin_orders (
  id          uuid primary key default gen_random_uuid(),
  vk_id       bigint not null,
  pack        text not null,
  coins       int not null,
  votes       int not null,
  order_id    text,
  status      text not null default 'pending' check (status in ('pending','paid','failed')),
  created_at  timestamptz not null default now()
);

alter table public.coin_orders enable row level security;

drop policy if exists coin_orders_read on public.coin_orders;
create policy coin_orders_read on public.coin_orders for select using (true);

drop policy if exists coin_orders_insert on public.coin_orders;
create policy coin_orders_insert on public.coin_orders for insert with check (true);

/** Зачислить монеты после оплаты. */
create or replace function public.credit_coins(p_vk_id bigint, p_coins int, p_order text)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_coins int;
begin
  if p_coins <= 0 then
    raise exception 'Неверное количество монет';
  end if;

  update public.profiles
    set coins = coins + p_coins
    where vk_id = p_vk_id
    returning coins into v_coins;

  update public.coin_orders
    set status = 'paid'
    where vk_id = p_vk_id and order_id = p_order;

  return v_coins;
end;
$$;
