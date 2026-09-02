// Ежедневная награда: 1 монета в 1-й день серии, 2 во 2-й, ... 7 в 7-й,
// дальше цикл начинается заново. Если пропустил день — серия сбрасывается.
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyVkLaunchParams, corsHeaders, type VkLaunchParams } from "../_shared/vkVerify.ts";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function isYesterday(dateStr: string, today: string): boolean {
  const d = new Date(dateStr + "T00:00:00Z");
  const t = new Date(today + "T00:00:00Z");
  const diffDays = Math.round((t.getTime() - d.getTime()) / 86_400_000);
  return diffDays === 1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });

  try {
    const body = await req.json() as { launchParams: VkLaunchParams };
    const vkUserId = await verifyVkLaunchParams(body.launchParams, Deno.env.get("VK_CLIENT_SECRET")!);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile, error: fetchErr } = await supabase
      .from("profiles")
      .select("coins, daily_streak, last_daily_claim_at")
      .eq("vk_id", vkUserId)
      .single();
    if (fetchErr) throw fetchErr;

    const today = todayUtc();

    if (profile.last_daily_claim_at === today) {
      return new Response(JSON.stringify({ error: "Награда за сегодня уже получена", alreadyClaimed: true }), {
        status: 409,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    const continuesStreak = profile.last_daily_claim_at
      ? isYesterday(profile.last_daily_claim_at, today)
      : false;

    // daily_streak хранится как 0..6 (индекс дня цикла)
    const newStreak = continuesStreak ? (profile.daily_streak + 1) % 7 : 0;
    const coinsAwarded = newStreak + 1; // 1..7

    const { data: updated, error: updErr } = await supabase
      .from("profiles")
      .update({
        coins: profile.coins + coinsAwarded,
        daily_streak: newStreak,
        last_daily_claim_at: today,
      })
      .eq("vk_id", vkUserId)
      .select("coins, daily_streak")
      .single();
    if (updErr) throw updErr;

    return new Response(
      JSON.stringify({ coinsAwarded, dayInCycle: newStreak + 1, profile: updated }),
      { headers: { ...corsHeaders(), "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
