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

/** Как часто подтягиваем позицию к серверной. */
const RESYNC_MS = 10_000;

type Session = {
  track_url?: string | null;
  track_started_at?: string | null;
  track_duration_sec?: number | null;
  dj_vk_id?: number | null;
} | null;

/**
 * Трек слышат все в зале, синхронно: позиция считается от момента
 * старта на сервере, поэтому зашедший в середине песни попадает в середину.
 *
 * Включить может только диджей — через выбор трека. Остальные просто
 * подхватывают то, что уже играет.
 *
 * Браузер не даёт звук до первого касания экрана. Касание ловится в
 * ClubRoom и зовёт unlock(); если звук всё же не пустили, поднимается
 * флаг needsGesture и в панели появляется кнопка «Включить звук».
 */
export function useClubMusic(appId: number, session: Session, myVkId?: number | null) {
  const muted = useUi((s) => s.muted);
  const playerRef = useRef<ClubPlayer | null>(null);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);

  if (!playerRef.current) playerRef.current = new ClubPlayer();

  const source: MusicSource = useMemo(
    () => (FALLBACK_CATALOG.length ? directMusicSource(FALLBACK_CATALOG) : vkMusicSource(appId)),
    [appId],
  );

  const djVkId = session?.dj_vk_id ?? null;
  const trackUrl = session?.track_url ?? null;
  const startedAt = session?.track_started_at ?? null;

  /** Я за пультом — нужно только для кнопки «Завершить сет». */
  const atBooth = myVkId != null && djVkId != null && djVkId === myVkId;

  useEffect(() => {
    playerRef.current?.setMuted(muted);
  }, [muted]);

  /* ---- главное: что стоит в сессии, то и играет ---- */
  useEffect(() => {
    const player = playerRef.current!;
    let alive = true;

    // радио играет без живого диджея, поэтому смотрим только на ссылку
    if (!trackUrl) {
      player.stop();
      setPlaying(false);
      setPosition(0);
      setNeedsGesture(false);
      return;
    }

    void player.start(trackUrl, startedAt).then((ok) => {
      if (!alive) return;
      setPlaying(ok);
      setNeedsGesture(!ok);
    });

    return () => {
      alive = false;
    };
  }, [trackUrl, startedAt]);

  /* ---- подтягивание позиции: чтобы зал не расползался ---- */
  useEffect(() => {
    if (!playing || !trackUrl) return;
    const player = playerRef.current!;
    const timer = setInterval(() => {
      void player.start(trackUrl, startedAt);
    }, RESYNC_MS);
    return () => clearInterval(timer);
  }, [playing, trackUrl, startedAt]);

  /* ---- живая позиция для полосы ---- */
  useEffect(() => {
    if (!playing) {
      setPosition(0);
      return;
    }
    const player = playerRef.current!;
    const timer = setInterval(() => setPosition(player.position), 500);
    return () => clearInterval(timer);
  }, [playing]);

  /* ---- ушли из зала ---- */
  useEffect(() => () => playerRef.current?.stop(), []);

  /**
   * Разблокировка по касанию экрана. Ничего не проигрывает сама,
   * только берёт у браузера разрешение заранее.
   */
  const unlock = useCallback(() => {
    playerRef.current?.unlock();
  }, []);

  /** Кнопка «Включить звук» — если автозапуск не прошёл. */
  const enableSound = useCallback(async () => {
    const player = playerRef.current!;
    if (!trackUrl) return false;
    const ok = await player.start(trackUrl, startedAt);
    setPlaying(ok);
    setNeedsGesture(!ok);
    return ok;
  }, [trackUrl, startedAt]);

  /**
   * Явный запуск трека сразу после того, как сервер подтвердил,
   * что мы встали за пульт, — сессия по realtime ещё не дошла.
   */
  const loadTrack = useCallback(async (url?: string | null, at?: string | number | null) => {
    const player = playerRef.current!;
    const src = url ?? trackUrl;
    if (!src) return false;
    const ok = await player.start(src, at ?? startedAt);
    setPlaying(ok);
    setNeedsGesture(!ok);
    return ok;
  }, [trackUrl, startedAt]);

  const stop = useCallback(() => {
    playerRef.current?.stop();
    setPlaying(false);
    setPosition(0);
  }, []);

  return {
    position,
    source,
    unlock,
    player: playerRef.current!,
    atBooth,
    playing,
    needsGesture,
    enableSound,
    loadTrack,
    stop,
  };
}
