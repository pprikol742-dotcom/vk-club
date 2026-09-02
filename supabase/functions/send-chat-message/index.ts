// Отправка сообщения в чат клуба. Простая защита от спама: не чаще раза в 1.5 сек.
// TODO следующего этапа: мат-фильтр (это правило видно на скринах: "оскорбление — бан").
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyVkLaunchParams, corsHeaders, type VkLaunchParams } from "../_shared/vkVerify.ts";

const MIN_INTERVAL_MS = 1500;
const lastMessageAt = new Map<number, number>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });

  try {
    const body = await req.json() as {
      launchParams: VkLaunchParams;
      club_id: string;
      message: string;
      reply_to_vk_id?: number;
    };

    const vkUserId = await verifyVkLaunchParams(body.launchParams, Deno.env.get("VK_CLIENT_SECRET")!);

    const now = Date.now();
    const last = lastMessageAt.get(vkUserId) ?? 0;
    if (now - last < MIN_INTERVAL_MS) {
      return new Response(JSON.stringify({ error: "Слишком часто, подожди немного" }), {
        status: 429,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }
    lastMessageAt.set(vkUserId, now);

    const trimmed = body.message.trim().slice(0, 500);
    if (!trimmed) throw new Error("Пустое сообщение");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        club_id: body.club_id,
        vk_id: vkUserId,
        reply_to_vk_id: body.reply_to_vk_id ?? null,
        message: trimmed,
      })
      .select()
      .single();
    if (error) throw error;

    return new Response(JSON.stringify({ message: data }), {
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
