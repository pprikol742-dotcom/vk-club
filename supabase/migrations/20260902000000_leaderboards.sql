-- Лидерборды: "Топ щедрых" / "Топ популярных" / "Топ ценных"

create or replace function get_top_givers(p_club_id uuid, p_limit int default 10)
returns table (vk_id bigint, first_name text, last_name text, avatar_url text, total int)
language sql
stable
as $$
  select p.vk_id, p.first_name, p.last_name, p.avatar_url,
         sum(gc.price)::int as total
  from gift_transactions gt
  join gifts_catalog gc on gc.id = gt.gift_id
  join profiles p on p.vk_id = gt.from_vk_id
  where gt.club_id = p_club_id and gc.category in ('player', 'dj')
  group by p.vk_id, p.first_name, p.last_name, p.avatar_url
  order by total desc
  limit p_limit;
$$;

create or replace function get_top_receivers(p_club_id uuid, p_limit int default 10)
returns table (vk_id bigint, first_name text, last_name text, avatar_url text, total int)
language sql
stable
as $$
  select p.vk_id, p.first_name, p.last_name, p.avatar_url,
         sum(gc.price)::int as total
  from gift_transactions gt
  join gifts_catalog gc on gc.id = gt.gift_id
  join profiles p on p.vk_id = gt.to_vk_id
  where gt.club_id = p_club_id and gc.category = 'player' and gt.to_vk_id is not null
  group by p.vk_id, p.first_name, p.last_name, p.avatar_url
  order by total desc
  limit p_limit;
$$;

create or replace function get_top_valuable(p_club_id uuid, p_limit int default 10)
returns table (vk_id bigint, first_name text, last_name text, avatar_url text, total int)
language sql
stable
as $$
  select p.vk_id, p.first_name, p.last_name, p.avatar_url,
         o.price_paid::int as total
  from ownerships o
  join profiles p on p.vk_id = o.target_vk_id
  where o.club_id = p_club_id
  order by o.price_paid desc
  limit p_limit;
$$;
