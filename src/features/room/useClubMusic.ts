import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ClubPlayer,
  vkMusicSource,
  directMusicSource,
  type MusicSource,
  type ClubTrack,
} from '../../lib/music';
import { useUi } from '../../store/uiStore';

/** Резервный каталог: заливается в Supabase Storage, если аудио ВК не дадут. */
const FALLBACK_CATALOG: ClubTrack[] = [];

type Session = {
  track_url?: string | null;
  track_started_at?: string | null;
  track_duration_sec?: number | null;
  dj_vk_id?: number | null;
} | null;

/**
 * Звук слышит только тот, кто стоит за пультом, и только после
 * нажатия «Зарядить». Слушатели видят трек в плеере, но молчат.
 *
 * Сам по себе хук музыку не включает никогда: он умеет только глушить.
 * Запуск — исключительно через loadTrack() из обработчика нажатия.
 */
export function useClubMusic(appId: number, session: Session, myVkId?: number | null) {
  const muted = useUi((s) => s.muted);
  const playerRef = useRef<ClubPlayer | null>(null);
  const [position, setPosition] = useState(0);
  const [armed, setArmed] = useState(false);

  /**
   * Окно тишины после ручного запуска. Сразу после «Зарядить» сессия
   * ещё не успела прийти по realtime, и без этой паузы наш же эффект
   * глушил бы только что включённый трек.
   */
  const graceUntil = useRef(0);

  if (!playerRef.current) playerRef.current = new ClubPlayer();

  /** Основной источник — аудио ВК, запасной — свои файлы. */
  const source: MusicSource = useMemo(
    () => (FALLBACK_CATALOG.length ? directMusicSource(FALLBACK_CATALOG) : vkMusicSource(appId)),
    [appId],
  );

  const djVkId = session?.dj_vk_id ?? null;
  const trackUrl = session?.track_url ?? null;
  const startedAt = session?.track_started_at ?? null;

  /** Я за пультом? Только при этом звук вообще возможен. */
  const atBooth = myVkId != null && djVkId != null && djVkId === myVkId;

  useEffect(() => {
    playerRef.current?.setMuted(muted);
  }, [muted]);

  /* ---- глушение: ушёл с пульта, перекупили, трек сняли ---- */
  useEffect(() => {
    const player = playerRef.current!;
    if (Date.now() < graceUntil.current) return;
    if (!atBooth || !trackUrl) {
      player.stop();
      setArmed(false);
      setPosition(0);
    }
  }, [atBooth, trackUrl]);

  /* ---- смена трека, пока пульт заряжен ---- */
  useEffect(() => {
    const player = playerRef.current!;
    if (!atBooth || !trackUrl || !player.armed) return;
    void player.start(trackUrl, startedAt);
  }, [trackUrl]);

  /* ---- живая позиция для полосы ---- */
  useEffect(() => {
    const player = playerRef.current!;
    if (!armed) {
      setPosition(0);
      return;
    }
    const timer = setInterval(() => setPosition(player.position), 500);
    return () => clearInterval(timer);
  }, [armed]);

  /* ---- размонтирование ---- */
  useEffect(() => () => playerRef.current?.stop(), []);

  /**
   * Кнопка «Зарядить». Вешать прямо на onClick.
   * force — когда сервер уже подтвердил, что мы за пультом,
   * а сессия по realtime ещё не дошла.
   */
  const loadTrack = useCallback(
    async (url?: string | null, at?: string | number | null, force = false) => {
      const player = playerRef.current!;
      if (!atBooth && !force) return false;

      const src = url ?? trackUrl;
      if (!src) return false;

      graceUntil.current = Date.now() + 8000;
      const ok = await player.start(src, at ?? startedAt);
      setArmed(ok);
      if (!ok) graceUntil.current = 0;
      return ok;
    },
    [atBooth, trackUrl, startedAt],
  );

  /** Снять трек с пульта вручную. */
  const stop = useCallback(() => {
    graceUntil.current = 0;
    playerRef.current?.stop();
    setArmed(false);
    setPosition(0);
  }, []);

  /**
   * Разблокировка звука по касанию экрана.
   * Ничего не проигрывает — только берёт у браузера разрешение заранее,
   * чтобы «Зарядить» сработало с первого нажатия.
   */
  const unlock = useCallback(() => {
    playerRef.current?.unlock();
  }, []);

  return {
    position,
    source,
    unlock,
    player: playerRef.current!,
    atBooth,
    armed,
    loadTrack,
    stop,
  };
}
