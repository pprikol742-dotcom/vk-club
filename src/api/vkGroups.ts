import bridge from '@vkontakte/vk-bridge';

/**
 * Обложки клубов = картинки их сообществ ВК.
 * Берём в таком порядке: обложка сообщества (широкая) -> photo_400 -> photo_200.
 * Всё складывается в память, чтобы не дёргать API на каждый рендер.
 */

const VK_APP_ID = 54746228;
const API_VERSION = '5.199';

const memCache = new Map<number, string | null>();
let tokenPromise: Promise<string> | null = null;

async function getToken(): Promise<string> {
  if (!tokenPromise) {
    tokenPromise = bridge
      .send('VKWebAppGetAuthToken', { app_id: VK_APP_ID, scope: '' })
      .then((r: any) => r.access_token as string)
      .catch((e) => {
        tokenPromise = null;
        throw e;
      });
  }
  return tokenPromise;
}

function pickCover(g: any): string | null {
  // широкая обложка сообщества — берём самую крупную версию
  const imgs = g?.cover?.images;
  if (Array.isArray(imgs) && imgs.length) {
    const best = [...imgs].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
    if (best?.url) return best.url as string;
  }
  return (g?.photo_400 ?? g?.photo_200 ?? g?.photo_100 ?? null) as string | null;
}

/**
 * Тянет обложки пачкой. ids — числовые id сообществ (без минуса).
 * Возвращает { [groupId]: url }. Те, что не отдались, просто отсутствуют.
 */
export async function fetchGroupCovers(
  ids: number[],
): Promise<Record<number, string>> {
  const out: Record<number, string> = {};
  const need: number[] = [];

  for (const id of ids) {
    if (!id) continue;
    const hit = memCache.get(id);
    if (hit === undefined) need.push(id);
    else if (hit) out[id] = hit;
  }
  if (!need.length) return out;

  try {
    const token = await getToken();
    // groups.getById переваривает до 500 id за раз
    for (let i = 0; i < need.length; i += 200) {
      const chunk = need.slice(i, i + 200);
      const res: any = await bridge.send('VKWebAppCallAPIMethod', {
        method: 'groups.getById',
        params: {
          group_ids: chunk.join(','),
          fields: 'photo_100,photo_200,photo_400,cover',
          access_token: token,
          v: API_VERSION,
        },
      });

      // 5.199 отдаёт { groups: [...] }, версии постарше — просто массив
      const raw = res?.response;
      const groups: any[] = Array.isArray(raw) ? raw : (raw?.groups ?? []);

      for (const g of groups) {
        const url = pickCover(g);
        memCache.set(Number(g.id), url);
        if (url) out[Number(g.id)] = url;
      }
      // те, что не вернулись (закрытые, забаненные) — помечаем, чтобы не долбить API
      for (const id of chunk) if (!memCache.has(id)) memCache.set(id, null);
    }
  } catch (e) {
    console.warn('[covers] не удалось получить обложки сообществ', e);
  }

  return out;
}

/** Одна группа — обёртка над пачкой. */
export async function fetchGroupCover(id: number): Promise<string | null> {
  const map = await fetchGroupCovers([id]);
  return map[id] ?? null;
}

/** Сбросить кэш, если пользователь сменил аватарку паблика. */
export function clearCoverCache(id?: number) {
  if (id) memCache.delete(id);
  else memCache.clear();
}
