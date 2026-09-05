// Единая точка для всех трат монет на подарки/украшения/скины рук.
// Всё в одной транзакции: списываем монеты у отправителя, пишем запись.
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyVkLaunchParams, corsHeaders, type VkLaunchParams } from "../_shared/vkVerify.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });

  try {
    const body = await req.json() as {
      launchParams: VkLaunchParams;
      club_id: string | null;   // не нужен для hand_skin (руку можно купить вне клуба)
      gift_id: string;          // id из gifts_catalog
      to_vk_id?: number;        // получатель (нет для decoration / hand_skin)
    };

    const vkUserId = await verifyVkLaunchParams(body.launchParams, Deno.env.get("VK_CLIENT_SECRET")!);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: gift, error: giftErr } = await supabase
      .from("gifts_catalog")
      .select("*")
      .eq("id", body.gift_id)
      .single();
    if (giftErr || !gift) throw new Error("Подарок не найден");

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("coins, owned_hand_skins, unlimited_coins")
      .eq("vk_id", vkUserId)
      .single();
    if (profErr) throw profErr;

    // Уже купленный скин руки можно надеть заново бесплатно — платим только за первую покупку.
    const alreadyOwnedHandSkin =
      gift.category === "hand_skin" && (profile.owned_hand_skins ?? []).includes(gift.id);
    const priceToCharge = alreadyOwnedHandSkin ? 0 : gift.price;

    // безлимитный баланс: платить не нужно, дарить можно всем и сколько угодно
    const unlimited = Boolean(profile.unlimited_coins);

    if (!unlimited && profile.coins < priceToCharge) {
      return new Response(JSON.stringify({ error: "Недостаточно монет" }), {
        status: 402,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    // списываем монеты (0, если скин уже куплен или баланс безлимитный)
    if (priceToCharge > 0 && !unlimited) {
      const { error: deductErr } = await supabase
        .from("profiles")
        .update({ coins: profile.coins - priceToCharge })
        .eq("vk_id", vkUserId);
      if (deductErr) throw deductErr;
    }

    if (gift.category === "player" || gift.category === "dj") {
      const { error: txErr } = await supabase.from("gift_transactions").insert({
        club_id: body.club_id,
        from_vk_id: vkUserId,
        to_vk_id: body.to_vk_id ?? null,
        gift_id: gift.id,
      });
      if (txErr) throw txErr;
    } else if (gift.category === "decoration") {
      const { error: decErr } = await supabase.from("decorations_placed").insert({
        club_id: body.club_id,
        decoration_id: gift.id,
        placed_by_vk_id: vkUserId,
      });
      if (decErr) throw decErr;
    } else if (gift.category === "hand_skin") {
      const owned = new Set(profile.owned_hand_skins ?? []);
      owned.add(gift.id);
      const { error: skinErr } = await supabase
        .from("profiles")
        .update({ owned_hand_skins: Array.from(owned), hand_skin: gift.id })
        .eq("vk_id", vkUserId);
      if (skinErr) throw skinErr;
    }

    return new Response(JSON.stringify({ ok: true, spent: unlimited ? 0 : priceToCharge }), {
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
