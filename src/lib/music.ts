import bridge from '@vkontakte/vk-bridge';

/**
 * Трек, который играет в клубе.
 * url может отсутствовать до тех пор, пока источник его не отдаст.
 */
export interface ClubTrack {
  id: string;
  artist: string;
  title: string;
  duration: number;
  url?: string;
}

/** Источник музыки. Меняется без правок игры. */
export interface MusicSource {
  name: string;
  search(query: string): Promise<ClubTrack[]>;
  /** дотянуть ссылку на файл, если поиск её не вернул */
  resolve(track: ClubTrack): Promise<string | null>;
}

/* ---------------- аудио ВКонтакте ---------------- */

let audioToken: string | null = null;

/** Токен с правом на аудио. Если приложению не разрешено — вернёт null. */
export async function getAudioToken(appId: number): Promise<string | null> {
  if (audioToken) return audioToken;
  try {
    const res = await bridge.send('VKWebAppGetAuthToken', { app_id: appId, scope: 'audio' });
    audioToken = res.access_token ?? null;
    return audioToken;
  } catch {
    return null;
  }
}

export function vkMusicSource(appId: number): MusicSource {
  const call = async (method: string, params: Record<string, unknown>) => {
    const token = await getAudioToken(appId);
    if (!token) throw new Error('Нет доступа к аудио ВК');
    const res: any = await bridge.send('VKWebAppCallAPIMethod', {
      method,
      params: { ...params, v: '5.199', access_token: token },
    });
    if (res?.error_type) throw new Error(res?.error_data?.error_msg ?? 'Ошибка API');
    return res?.response;
  };

  return {
    name: 'vk',
    async search(query) {
      const r = await call('audio.search', { q: query, count: 30, auto_complete: 1 });
      return (r?.items ?? []).map((a: any) => ({
        id: `${a.owner_id}_${a.id}`,
        artist: a.artist,
        title: a.title,
        duration: a.duration,
        url: a.url || undefined,
      }));
    },
    async resolve(track) {
      if (track.url) return track.url;
      const [ownerId, id] = track.id.split('_');
      const r = await call('audio.getById', { audios: `${ownerId}_${id}` });
      return r?.[0]?.url ?? null;
    },
  };
}

/* ---------------- запасной источник: свои файлы ---------------- */

/**
 * Треки, залитые в Supabase Storage или на любой CDN.
 * Используется, если аудио ВК приложению не отдали.
 */
export function directMusicSource(catalog: ClubTrack[]): MusicSource {
  return {
    name: 'direct',
    async search(query) {
      const q = query.trim().toLowerCase();
      if (!q) return catalog.slice(0, 30);
      return catalog.filter(
        (t) => t.artist.toLowerCase().includes(q) || t.title.toLowerCase().includes(q),
      );
    },
    async resolve(track) {
      return track.url ?? null;
    },
  };
}

/* ---------------- синхронное воспроизведение ---------------- */

/**
 * Один трек на всех: позиция считается от времени старта на сервере,
 * поэтому вошедший в середине песни услышит её с середины.
 */
export class ClubPlayer {
  private el: HTMLAudioElement;
  private currentUrl: string | null = null;

  constructor() {
    this.el = new Audio();
    this.el.preload = 'auto';
    this.el.crossOrigin = 'anonymous';
  }

  get audio() {
    return this.el;
  }

  setMuted(muted: boolean) {
    this.el.muted = muted;
  }

  setVolume(v: number) {
    this.el.volume = Math.max(0, Math.min(1, v));
  }

  /** startedAt — момент старта трека на сервере (ISO или ms). */
  async play(url: string, startedAt: string | number) {
    const started = typeof startedAt === 'number' ? startedAt : Date.parse(startedAt);
    const offset = Math.max(0, (Date.now() - started) / 1000);

    if (this.currentUrl !== url) {
      this.currentUrl = url;
      this.el.src = url;
    }

    // если ушли больше чем на полторы секунды — подтягиваем позицию
    if (Math.abs(this.el.currentTime - offset) > 1.5) {
      try {
        this.el.currentTime = offset;
      } catch {
        /* браузер ещё не готов перематывать */
      }
    }

    try {
      await this.el.play();
    } catch {
      // автозапуск заблокирован до первого касания экрана — не страшно
    }
  }

  stop() {
    this.el.pause();
    this.currentUrl = null;
  }

  /** Сколько секунд трек уже играет. */
  get position() {
    return this.el.currentTime;
  }
}
