// "Перекуп": игрок платит монеты, чтобы стать владельцем другого игрока в клубе.
// Если у цели уже есть владелец — тому возвращается его прошлая цена (компенсация),
// а новая ставка должна быть строго больше текущей.
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyVkLaunchParams, corsHeaders, type VkLaunchParams } from "../_shared/vkVerify.ts";

const MIN_FIRST_PRICE = 10; // стартовая цена, если владельца ещё не было

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });

  try {
    const body = await req.json() as {
      launchParams: VkLaunchParams;
      club_id: string;
      target_vk_id: number;
      offer_price: number;
    };

    const vkUserId = await verifyVkLaunchParams(body.launchParams, Deno.env.get("VK_CLIENT_SECRET")!);

    if (vkUserId === body.target_vk_id) {
      throw new Error("Нельзя перекупить самого себя");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existing } = await supabase
      .from("ownerships")
      .select("owner_vk_id, price_paid")
      .eq("club_id", body.club_id)
      .eq("target_vk_id", body.target_vk_id)
      .maybeSingle();

    const minRequired = existing ? existing.price_paid + 1 : MIN_FIRST_PRICE;
    if (body.offer_price < minRequired) {
      return new Response(
        JSON.stringify({ error: `Минимальная ставка: ${minRequired} монет`, minRequired }),
        { status: 409, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
      );
    }

    const { data: buyer, error: buyerErr } = await supabase
      .from("profiles")
      .select("coins")
      .eq("vk_id", vkUserId)
      .single();
    if (buyerErr) throw buyerErr;

    if (buyer.coins < body.offer_price) {
      return new Response(JSON.stringify({ error: "Недостаточно монет" }), {
        status: 402,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    // списываем у покупателя
    await supabase.from("profiles").update({ coins: buyer.coins - body.offer_price }).eq("vk_id", vkUserId);

    // возвращаем компенсацию прошлому владельцу
    if (existing) {
      const { data: prevOwner } = await supabase
        .from("profiles")
        .select("coins")
        .eq("vk_id", existing.owner_vk_id)
        .single();
      if (prevOwner) {
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
          price_paid: body.offer_price,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "club_id,target_vk_id" },
      )
      .select()
      .single();
    if (ownErr) throw ownErr;

    return new Response(JSON.stringify({ ownership }), {
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
