import bridge from "@vkontakte/vk-bridge";
import type { VkLaunchParams } from "./types";

let cachedLaunchParams: VkLaunchParams | null = null;

/** Разбирает query-строку мини-приложения (vk_user_id, sign, и т.д.) один раз и кэширует. */
export function getLaunchParams(): VkLaunchParams {
  if (cachedLaunchParams) return cachedLaunchParams;

  const params = new URLSearchParams(window.location.search);
  const result = {} as VkLaunchParams;
  for (const [key, value] of params.entries()) {
    (result as Record<string, string>)[key] = value;
  }
  cachedLaunchParams = result;
  return result;
}

export async function initVkBridge() {
  await bridge.send("VKWebAppInit");
}

export async function getVkUserInfo() {
  return bridge.send("VKWebAppGetUserInfo");
}

/**
 * Список пабликов, где текущий пользователь — админ/руководитель.
 * Нужен scope "groups" — запрашиваем токен именно с ним. Возвращаем и сам
 * токен: пригодится при создании клуба, чтобы проверить админство ТЕМ ЖЕ
 * токеном (сервисный токен спотыкается о приватность списка участников).
 */
export async function getAdminGroups(): Promise<{
  groups: Array<{ id: number; name: string; photo_100: string }>;
  accessToken: string;
}> {
  const auth = await bridge.send("VKWebAppGetAuthToken", {
    app_id: Number(import.meta.env.VITE_VK_APP_ID),
    scope: "groups",
  });

  const res = await bridge.send("VKWebAppCallAPIMethod", {
    method: "groups.get",
    params: {
      filter: "admin",
      extended: "1",
      access_token: auth.access_token,
      v: "5.199",
    },
  });

  return {
    groups: (res.response?.items ?? []) as Array<{ id: number; name: string; photo_100: string }>,
    accessToken: auth.access_token,
  };
}

export { bridge };
