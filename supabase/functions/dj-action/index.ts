// Управление очередью "Стать DJ": join / leave / advance.
// advance вызывается клиентом текущего DJ, когда трек закончился (таймер дошёл до 0),
// либо через минуту неактивности — защиту от накрутки добавим отдельным TODO (rate limit).
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyVkLaunchParams, corsHeaders, type VkLaunchParams } from "../_shared/vkVerify.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });

  try {
    const body = await req.json() as {
      launchParams: VkLaunchParams;
      club_id: string;
      action: "join" | "leave" | "advance";
      track?: { title: string; artist: string; source: "user_upload" | "library"; url: string; duration_sec: number };
    };

    const vkUserId = await verifyVkLaunchParams(body.launchParams, Deno.env.get("VK_CLIENT_SECRET")!);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (body.action === "join") {
      const { count } = await supabase
        .from("dj_queue")
        .select("*", { count: "exact", head: true })
        .eq("club_id", body.club_id);

      const { data, error } = await supabase
        .from("dj_queue")
        .insert({ club_id: body.club_id, vk_id: vkUserId, position: (count ?? 0) + 1 })
        .select()
        .single();
      if (error) throw error;

      return new Response(JSON.stringify({ queueEntry: data }), {
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    if (body.action === "leave") {
      const { error } = await supabase
        .from("dj_queue")
        .delete()
        .eq("club_id", body.club_id)
        .eq("vk_id", vkUserId);
      if (error) throw error;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    if (body.action === "advance") {
      const { data: session } = await supabase
        .from("club_sessions")
        .select("dj_vk_id")
        .eq("club_id", body.club_id)
        .single();

      // только текущий DJ (или система, если DJ никого нет) может передать очередь
      if (session?.dj_vk_id && session.dj_vk_id !== vkUserId) {
        throw new Error("Только текущий DJ может завершить сет");
      }

      const { data: next } = await supabase
        .from("dj_queue")
        .select("*")
        .eq("club_id", body.club_id)
        .order("position", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!next) {
        await supabase
          .from("club_sessions")
          .update({ dj_vk_id: null, track_title: null, track_artist: null, track_url: null })
          .eq("club_id", body.club_id);
        return new Response(JSON.stringify({ ok: true, nextDj: null }), {
          headers: { ...corsHeaders(), "Content-Type": "application/json" },
        });
      }

      await supabase.from("dj_queue").delete().eq("id", next.id);

      // сдвигаем позиции остальных
      await supabase.rpc("shift_dj_queue_positions", { p_club_id: body.club_id });

      await supabase
        .from("club_sessions")
        .update({
          dj_vk_id: next.vk_id,
          track_title: body.track?.title ?? null,
          track_artist: body.track?.artist ?? null,
          track_source: body.track?.source ?? null,
          track_url: body.track?.url ?? null,
          track_duration_sec: body.track?.duration_sec ?? null,
          track_started_at: new Date().toISOString(),
          likes: 0,
          dislikes: 0,
        })
        .eq("club_id", body.club_id);

      return new Response(JSON.stringify({ ok: true, nextDj: next.vk_id }), {
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    throw new Error("Неизвестное действие");
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
