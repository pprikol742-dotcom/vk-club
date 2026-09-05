// Очередь диджеев: join / leave / advance.
// join — встать за пульт с заряженным треком. Если пульт свободен, играем сразу,
// иначе занимаем место в очереди (повторный join просто меняет трек).
// advance — сет закончен, зовём следующего вместе с его треком.
//           Обычно это делает сам диджей, но если трек доиграл, а он пропал —
//           передать очередь может любой, кто остался в зале.
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyVkLaunchParams, corsHeaders, type VkLaunchParams } from "../_shared/vkVerify.ts";

interface TrackInput {
  title: string;
  artist: string;
  source?: "user_upload" | "library" | "clip";
  url?: string | null;
  video_url?: string | null;
  duration_sec?: number | null;
}

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
      action: "join" | "leave" | "advance" | "radio";
      track?: TrackInput;
    };

    const vkUserId = await verifyVkLaunchParams(
      body.launchParams,
      Deno.env.get("VK_CLIENT_SECRET")!,
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    /** Поля трека для club_sessions. */
    const sessionTrack = (t?: TrackInput | null) => ({
      track_title: t?.title ?? null,
      track_artist: t?.artist ?? null,
      track_source: t?.source ?? null,
      track_url: t?.url ?? null,
      track_video_url: t?.video_url ?? null,
      track_duration_sec: t?.duration_sec ?? null,
      track_started_at: t ? new Date().toISOString() : null,
      is_radio: false,
      likes: 0,
      dislikes: 0,
      updated_at: new Date().toISOString(),
    });

    /** Режим комнаты: 'radio' или 'queue'. */
    const clubMode = async (): Promise<string> => {
      const { data } = await supabase
        .from("clubs").select("mode").eq("id", body.club_id).maybeSingle();
      return (data?.mode as string) ?? "queue";
    };

    /** Ставит случайный трек из фонотеки комнаты без живого диджея. */
    const startRadio = async (): Promise<boolean> => {
      const { data: t } = await supabase
        .rpc("random_club_track", { p_club: body.club_id })
        .maybeSingle();

      if (!t?.url) return false;

      await supabase.from("club_sessions").upsert(
        {
          club_id: body.club_id,
          dj_vk_id: null,
          track_title: t.title,
          track_artist: t.artist,
          track_source: "library",
          track_url: t.url,
          track_video_url: null,
          track_duration_sec: t.duration ?? 180,
          track_started_at: new Date().toISOString(),
          is_radio: true,
          likes: 0,
          dislikes: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "club_id" },
      );

      await supabase.rpc("bump_track_plays", { p_track_id: String(t.id) });
      return true;
    };

    if (body.action === "join") {
      if (!body.track) throw new Error("Сначала выбери трек");

      const { data: session } = await supabase
        .from("club_sessions")
        .select("dj_vk_id")
        .eq("club_id", body.club_id)
        .maybeSingle();

      const boothFree = !session?.dj_vk_id;
      const alreadyDj = session?.dj_vk_id === vkUserId;

      // пульт свободен или это и есть текущий диджей — играем сразу
      if (boothFree || alreadyDj) {
        const { error } = await supabase
          .from("club_sessions")
          .upsert(
            { club_id: body.club_id, dj_vk_id: vkUserId, ...sessionTrack(body.track) },
            { onConflict: "club_id" },
          );
        if (error) throw error;

        // если стояли в очереди — освобождаем место
        await supabase
          .from("dj_queue")
          .delete()
          .eq("club_id", body.club_id)
          .eq("vk_id", vkUserId);
        await supabase.rpc("shift_dj_queue_positions", { p_club_id: body.club_id });

        return json({ ok: true, playing: true });
      }

      // в радио-комнате очереди нет — пульт либо свободен, либо занят
      if (await clubMode() === "radio") {
        throw new Error("За пультом уже кто-то есть, дождись конца трека");
      }

      // за пультом кто-то другой — встаём в очередь.
      // повторный заход не ломается, а просто меняет заряженный трек.
      const { count } = await supabase
        .from("dj_queue")
        .select("*", { count: "exact", head: true })
        .eq("club_id", body.club_id);

      const { data: mine } = await supabase
        .from("dj_queue")
        .select("id, position")
        .eq("club_id", body.club_id)
        .eq("vk_id", vkUserId)
        .maybeSingle();

      const row = {
        club_id: body.club_id,
        vk_id: vkUserId,
        position: mine?.position ?? (count ?? 0) + 1,
        track_title: body.track.title,
        track_artist: body.track.artist,
        track_source: body.track.source ?? null,
        track_url: body.track.url ?? null,
        track_video_url: body.track.video_url ?? null,
        track_duration_sec: body.track.duration_sec ?? null,
      };

      const { data, error } = await supabase
        .from("dj_queue")
        .upsert(row, { onConflict: "club_id,vk_id" })
        .select()
        .single();
      if (error) throw error;

      return json({ ok: true, playing: false, queueEntry: data });
    }

    // Радио: включить фонотеку комнаты. Зовёт любой клиент,
    // когда за пультом пусто, а комната работает в режиме радио.
    if (body.action === "radio") {
      if (await clubMode() !== "radio") {
        return json({ ok: false, reason: "Комната работает по очереди" });
      }

      const { data: session } = await supabase
        .from("club_sessions").select("dj_vk_id").eq("club_id", body.club_id).maybeSingle();

      if (session?.dj_vk_id) return json({ ok: false, reason: "За пультом диджей" });

      const started = await startRadio();
      return json({ ok: started, radio: started });
    }

    if (body.action === "leave") {
      const { error } = await supabase
        .from("dj_queue")
        .delete()
        .eq("club_id", body.club_id)
        .eq("vk_id", vkUserId);
      if (error) throw error;

      await supabase.rpc("shift_dj_queue_positions", { p_club_id: body.club_id });
      return json({ ok: true });
    }

    if (body.action === "advance") {
      const { data: session } = await supabase
        .from("club_sessions")
        .select("dj_vk_id, track_started_at, track_duration_sec")
        .eq("club_id", body.club_id)
        .maybeSingle();

      /**
       * Трек уже доиграл? Тогда передать очередь может кто угодно —
       * иначе зал зависнет навсегда, если диджей закрыл вкладку.
       */
      const startedMs = session?.track_started_at
        ? Date.parse(session.track_started_at as string)
        : NaN;
      const finished =
        !Number.isFinite(startedMs) ||
        Date.now() - startedMs >= (((session?.track_duration_sec as number) ?? 0) + 5) * 1000;

      if (session?.dj_vk_id && session.dj_vk_id !== vkUserId && !finished) {
        throw new Error("Только текущий DJ может завершить сет");
      }

      const { data: next } = await supabase
        .from("dj_queue")
        .select("*")
        .eq("club_id", body.club_id)
        .order("position", { ascending: true })
        .limit(1)
        .maybeSingle();

      // очередь пуста — пульт освобождается, а в радио-комнате включается фонотека
      if (!next) {
        await supabase
          .from("club_sessions")
          .upsert(
            { club_id: body.club_id, dj_vk_id: null, ...sessionTrack(null) },
            { onConflict: "club_id" },
          );

        if (await clubMode() === "radio") {
          const started = await startRadio();
          return json({ ok: true, nextDj: null, radio: started });
        }

        return json({ ok: true, nextDj: null });
      }

      await supabase.from("dj_queue").delete().eq("id", next.id);
      await supabase.rpc("shift_dj_queue_positions", { p_club_id: body.club_id });

      await supabase
        .from("club_sessions")
        .upsert(
          {
            club_id: body.club_id,
            dj_vk_id: next.vk_id,
            ...sessionTrack({
              title: next.track_title,
              artist: next.track_artist,
              source: next.track_source,
              url: next.track_url,
              video_url: next.track_video_url,
              duration_sec: next.track_duration_sec,
            }),
          },
          { onConflict: "club_id" },
        );

      return json({ ok: true, nextDj: next.vk_id });
    }

    throw new Error("Неизвестное действие");
  } catch (err) {
    return json({ error: (err as Error).message }, 400);
  }
});
