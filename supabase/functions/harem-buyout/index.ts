// "Перекуп": игрок платит монеты, чтобы стать владельцем другого игрока в клубе.
// Если у цели уже есть владелец — тому возвращается его прошлая цена (компенсация),
// а новая ставка должна быть строго больше текущей.
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyVkLaunchParams, corsHeaders, type VkLaunchParams } from "../_shared/vkVerify.ts";

const MIN_FIRST_PRICE = 10; // стартовая цена, если владельца ещё не было

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });

  try {
    const body = await req.json() as {
      launchParams: VkLaunchParams;
      club_id: string;
      target_vk_id: number;
      /** можно не присылать — тогда берём минимально допустимую ставку */
      offer_price?: number;
    };

    const vkUserId = await verifyVkLaunchParams(body.launchParams, Deno.env.get("VK_CLIENT_SECRET")!);

    if (vkUserId === body.target_vk_id) {
      throw new Error("Нельзя перекупить самого себя");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ---- защита гарема: владелец мог закрыть своих от перекупа ----
    const { data: existing } = await supabase
      .from("ownerships")
      .select("owner_vk_id, price_paid")
      .eq("club_id", body.club_id)
      .eq("target_vk_id", body.target_vk_id)
      .maybeSingle();

    if (existing?.owner_vk_id && existing.owner_vk_id !== vkUserId) {
      const { data: owner } = await supabase
        .from("profiles")
        .select("harem_locked")
        .eq("vk_id", existing.owner_vk_id)
        .maybeSingle();

      if (owner?.harem_locked) {
        return json({ error: "Гарем этого игрока закрыт от перекупа" }, 403);
      }
    }

    // ---- цена ----
    const minRequired = existing ? existing.price_paid + 1 : MIN_FIRST_PRICE;
    const offer = Number.isFinite(body.offer_price as number) && (body.offer_price as number) > 0
      ? Math.floor(body.offer_price as number)
      : minRequired;

    if (offer < minRequired) {
      return json({ error: `Минимальная ставка: ${minRequired} монет`, minRequired }, 409);
    }

    const { data: buyer, error: buyerErr } = await supabase
      .from("profiles")
      .select("coins, unlimited_coins")
      .eq("vk_id", vkUserId)
      .single();
    if (buyerErr) throw buyerErr;

    const unlimited = Boolean(buyer.unlimited_coins);

    if (!unlimited && buyer.coins < offer) {
      return json({ error: "Недостаточно монет" }, 402);
    }

    // списываем у покупателя (у безлимитного баланс не трогаем)
    if (!unlimited) {
      await supabase
        .from("profiles")
        .update({ coins: buyer.coins - offer })
        .eq("vk_id", vkUserId);
    }

    // возвращаем компенсацию прошлому владельцу
    if (existing) {
      const { data: prevOwner } = await supabase
        .from("profiles")
        .select("coins, unlimited_coins")
        .eq("vk_id", existing.owner_vk_id)
        .maybeSingle();

      if (prevOwner && !prevOwner.unlimited_coins) {
        await supabase
          .from("profiles")
          .update({ coins: prevOwner.coins + existing.price_paid })
          .eq("vk_id", existing.owner_vk_id);
      }
    }

    const { data: ownership, error: ownErr } = await supabase
      .from("ownerships")
      .upsert(
        {
          club_id: body.club_id,
          target_vk_id: body.target_vk_id,
          owner_vk_id: vkUserId,
          price_paid: offer,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "club_id,target_vk_id" },
      )
      .select()
      .single();
    if (ownErr) throw ownErr;

    return json({ ownership, spent: unlimited ? 0 : offer });
  } catch (err) {
    return json({ error: (err as Error).message }, 400);
  }
});
