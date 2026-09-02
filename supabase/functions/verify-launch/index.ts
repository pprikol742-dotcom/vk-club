// Вызывается один раз при старте мини-приложения.
// Проверяет подпись VK, создаёт/обновляет профиль игрока, возвращает его данные.
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyVkLaunchParams, corsHeaders, type VkLaunchParams } from "../_shared/vkVerify.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });

  try {
    const body = await req.json() as {
      launchParams: VkLaunchParams;
      vkProfile: { first_name: string; last_name: string; photo_200?: string };
    };

    const vkUserId = await verifyVkLaunchParams(
      body.launchParams,
      Deno.env.get("VK_CLIENT_SECRET")!,
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Атомарная функция: если это новый игрок и он в первых трёх зарегистрированных
    // в игре вообще (не в клубе) — выдаёт founder_rank 1..3.
    const { data, error } = await supabase
      .rpc("upsert_profile_with_founder", {
        p_vk_id: vkUserId,
        p_first_name: body.vkProfile.first_name,
        p_last_name: body.vkProfile.last_name,
        p_avatar_url: body.vkProfile.photo_200 ?? null,
      })
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ profile: data }), {
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
