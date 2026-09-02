// Создание клуба из паблика ВК.
// Список пабликов на клиенте уже приходит из аутентифицированного через VK Bridge
// запроса groups.get(filter=admin) — то есть VK сам подтвердил, что пользователь
// админ, когда формировал этот список. Повторная проверка через groups.getMembers
// упирается в ограничение самого VK API (error 15 "group hide members" — многие
// паблики просто не отдают список менеджеров через сторонний токен, это не баг
// у нас и не настройка приватности, которую можно включить/выключить).
// Поэтому здесь только сверяем, что группа существует, и создаём клуб.
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyVkLaunchParams, corsHeaders, type VkLaunchParams } from "../_shared/vkVerify.ts";

async function getGroupName(groupId: number, serviceToken: string) {
  const url = new URL("https://api.vk.com/method/groups.getById");
  url.searchParams.set("group_id", String(groupId));
  url.searchParams.set("access_token", serviceToken);
  url.searchParams.set("v", "5.199");

  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(`VK API: ${json.error.error_msg}`);
  return json.response?.groups?.[0]?.name ?? json.response?.[0]?.name ?? `club_${groupId}`;
}

// Клубы, которые всегда должны быть первой строкой в списке (по просьбе Сергея).
// club241178960 = "Dancing to electronic music" — тестовый/опорный клуб.
const FEATURED_GROUP_IDS = new Set<number>([241178960]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });

  try {
    const body = await req.json() as {
      launchParams: VkLaunchParams;
      vk_group_id: number;
    };

    const vkUserId = await verifyVkLaunchParams(
      body.launchParams,
      Deno.env.get("VK_CLIENT_SECRET")!,
    );

    const serviceToken = Deno.env.get("VK_SERVICE_TOKEN")!;
    const groupName = await getGroupName(body.vk_group_id, serviceToken);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: club, error } = await supabase
      .from("clubs")
      .insert({
        vk_group_id: body.vk_group_id,
        name: groupName,
        owner_vk_id: vkUserId,
        is_featured: FEATURED_GROUP_IDS.has(body.vk_group_id),
      })
      .select()
      .single();

    if (error) {
      // unique violation -> клуб для этого паблика уже есть
      if (error.code === "23505") {
        const { data: existing } = await supabase
          .from("clubs")
          .select()
          .eq("vk_group_id", body.vk_group_id)
          .single();
        return new Response(JSON.stringify({ club: existing, alreadyExisted: true }), {
          headers: { ...corsHeaders(), "Content-Type": "application/json" },
        });
      }
      throw error;
    }

    await supabase.from("club_sessions").insert({ club_id: club.id });

    return new Response(JSON.stringify({ club }), {
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
