-- Кэш обложки сообщества ВК прямо в карточке клуба.
-- Нужен, чтобы список открывался мгновенно и не ждал ответа VK API.

alter table public.clubs
  add column if not exists cover_url text,
  add column if not exists cover_updated_at timestamptz;

-- Обновить обложку может владелец клуба или любой участник,
-- но только если она пустая либо старше суток — чтобы не затирали друг друга.
create or replace function public.set_club_cover(
  p_club_id uuid,
  p_url text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_url is null or length(p_url) < 8 or p_url !~ '^https://' then
    return;
  end if;

  update public.clubs
     set cover_url = p_url,
         cover_updated_at = now()
   where id = p_club_id
     and (cover_url is null
          or cover_url <> p_url
          or cover_updated_at < now() - interval '1 day');
end;
$$;

grant execute on function public.set_club_cover(uuid, text) to anon, authenticated;
