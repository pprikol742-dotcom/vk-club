import { useEffect, useMemo, useRef, useState } from 'react';
import { ClubPlayer, vkMusicSource, directMusicSource, type MusicSource, type ClubTrack } from '../../lib/music';
import { useUi } from '../../store/uiStore';

/** Резервный каталог: заливается в Supabase Storage, если аудио ВК не дадут. */
const FALLBACK_CATALOG: ClubTrack[] = [];

/**
 * Играет то, что стоит в сессии клуба, синхронно у всех,
 * и отдаёт живую позицию для полосы в плеере.
 */
export function useClubMusic(
  appId: number,
  session: {
    track_url?: string | null;
    track_started_at?: string | null;
    track_duration_sec?: number | null;
    track_video_url?: string | null;
    dj_vk_id?: number | null;
  } | null,
) {
  const muted = useUi((s) => s.muted);
  const playerRef = useRef<ClubPlayer | null>(null);
  const [position, setPosition] = useState(0);

  if (!playerRef.current) playerRef.current = new ClubPlayer();

  /** Основной источник — аудио ВК, запасной — свои файлы. */
  const source: MusicSource = useMemo(
    () => (FALLBACK_CATALOG.length ? directMusicSource(FALLBACK_CATALOG) : vkMusicSource(appId)),
    [appId],
  );

  useEffect(() => {
    playerRef.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    const player = playerRef.current!;
    const url = session?.track_url;
    const startedAt = session?.track_started_at;

    // без диджея за пультом в клубе тишина
    if (!session?.dj_vk_id) {
      player.stop();
      setPosition(0);
      return;
    }

    // звук клипа идёт из встроенного плеера — свой не включаем
    if (session?.track_video_url) {
      player.stop();
      const timer = setInterval(() => {
        const started = Date.parse(session.track_started_at ?? '');
        setPosition(started ? Math.max(0, (Date.now() - started) / 1000) : 0);
      }, 500);
      return () => clearInterval(timer);
    }

    if (!url || !startedAt || !session?.dj_vk_id) {
      player.stop();
      setPosition(0);
      return;
    }

    player.play(url, startedAt);

    const timer = setInterval(() => setPosition(player.position), 500);
    return () => clearInterval(timer);
  }, [session?.track_url, session?.track_started_at, session?.dj_vk_id, session?.track_video_url]);

  useEffect(() => () => playerRef.current?.stop(), []);

  /** Браузеры не дают играть до первого касания — зовём после клика по залу. */
  const unlock = () => {
    const el = playerRef.current?.audio;
    if (el && el.paused && el.src) el.play().catch(() => {});
  };

  return { position, source, unlock, player: playerRef.current! };
}
