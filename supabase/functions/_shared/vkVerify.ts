// Проверка подписи launch_params, которые VK передаёт мини-приложению.
// Алгоритм: https://dev.vk.com/mini-apps/development/launch-params#Проверка-launch-params
// Без этой проверки любой человек через devtools может подставить чужой vk_user_id
// и, например, стать "владельцем" чужого клуба или получить чужие монеты.

export interface VkLaunchParams {
  vk_user_id: string;
  vk_app_id: string;
  vk_is_app_user?: string;
  vk_are_notifications_enabled?: string;
  vk_language?: string;
  vk_ref?: string;
  vk_access_token_settings?: string;
  vk_group_id?: string;
  vk_platform?: string;
  vk_ts?: string;
  sign: string;
  [key: string]: string | undefined;
}

async function hmacSha256Base64Url(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const bytes = new Uint8Array(sigBuf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Возвращает vk_user_id (number), если подпись верна, иначе бросает Error.
 */
export async function verifyVkLaunchParams(
  params: VkLaunchParams,
  clientSecret: string,
): Promise<number> {
  const entries = Object.entries(params)
    .filter(([key]) => key.startsWith("vk_"))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const queryString = entries
    .map(([k, v]) => `${k}=${v ?? ""}`)
    .join("&");

  const expected = await hmacSha256Base64Url(clientSecret, queryString);

  if (expected !== params.sign) {
    throw new Error("Invalid VK launch params signature");
  }

  const vkUserId = Number(params.vk_user_id);
  if (!Number.isFinite(vkUserId) || vkUserId <= 0) {
    throw new Error("Invalid vk_user_id in launch params");
  }
  return vkUserId;
}

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}
