import { useEffect, useState } from 'react';
import { fetchGroupCovers } from '../../api/vkGroups';

const FALLBACK = '/assets/rooms/club-neon.png';

/**
 * Общий загрузчик на весь список: собирает id за один тик,
 * делает один запрос к groups.getById и раздаёт результат всем карточкам.
 */
let queue = new Set<number>();
let timer: number | null = null;
const listeners = new Map<number, Set<(url: string) => void>>();

function request(id: number, cb: (url: string) => void) {
  if (!listeners.has(id)) listeners.set(id, new Set());
  listeners.get(id)!.add(cb);
  queue.add(id);

  if (timer === null) {
    timer = window.setTimeout(async () => {
      const ids = [...queue];
      queue = new Set();
      timer = null;
      const map = await fetchGroupCovers(ids);
      for (const id of ids) {
        const url = map[id];
        if (!url) continue;
        listeners.get(id)?.forEach((fn) => fn(url));
        listeners.delete(id);
      }
    }, 30);
  }

  return () => listeners.get(id)?.delete(cb);
}

type Props = {
  vkGroupId?: number | null;
  /** уже сохранённая в базе обложка — показываем сразу, без запроса */
  cachedUrl?: string | null;
  alt?: string;
  className?: string;
  /** вызывается, когда обложка подтянулась впервые — чтобы сохранить в Supabase */
  onResolved?: (url: string) => void;
};

export default function ClubCover({
  vkGroupId, cachedUrl, alt = '', className = '', onResolved,
}: Props) {
  const [url, setUrl] = useState<string>(cachedUrl || FALLBACK);
  const [loaded, setLoaded] = useState(Boolean(cachedUrl));

  useEffect(() => {
    if (cachedUrl || !vkGroupId) return;
    let alive = true;
    const off = request(vkGroupId, (u) => {
      if (!alive) return;
      setUrl(u);
      onResolved?.(u);
    });
    return () => {
      alive = false;
      off?.();
    };
  }, [vkGroupId, cachedUrl]);

  return (
    <div className={`club-cover ${className}`}>
      <img
        src={url}
        alt={alt}
        loading="lazy"
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (url !== FALLBACK) setUrl(FALLBACK);
        }}
        style={{ opacity: loaded ? 1 : 0 }}
      />
      <span className="club-cover__shade" />
    </div>
  );
}
