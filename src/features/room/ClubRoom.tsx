import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { useClubRealtime, type PresenceMe } from "./useClubRealtime";
import { getLaunchParams } from "../../lib/vkBridge";
import { callEdgeFunction, supabase } from "../../lib/supabase";
import { GiftFxLayer } from "./GiftFxLayer";
import { HandSkinShop } from "../gifts/HandSkinShop";
import { DecorateClubModal } from "./DecorateClubModal";
import { LeaderboardModal } from "./LeaderboardModal";
import { MusicPickerModal } from "./MusicPickerModal";
import { canManageClub } from "../../lib/library";
import { handSkinIconUrl } from "../../lib/handSkins";
import { giftIconUrl } from "../../lib/giftIcons";

import { ClubPage } from "../../components/club/ClubPage";
import type { Clubber } from "../../components/club/ClubberAvatar";
import type { ChatMessage as UiMessage } from "../../components/club/ChatPanel";
import type { GiftItem } from "../../components/modals/ClubModals";
import type { ClubberProfile } from "../../components/modals/ProfileModal";
import type { ClubTrack } from "../../lib/music";
import { genderFromVk, type ClubRole } from "../../config/frames";
import { STYLE_TO_ROOM, type ClubStyle } from "../../config/clubTheme";
import { useUi } from "../../store/uiStore";
import { useClubMusic } from "./useClubMusic";

const APP_URL = "https://vk.com/app54746228";
const APP_ID = 54746228;

/** Автор игры: только у него есть тумблер защиты гарема. */
const ADMIN_VK_ID = 1092428497;

/** Подарки читаем из каталога в базе, чтобы менять их без пересборки. */
const withIcons = (list: Array<{ id: string; name: string; price: number }>): GiftItem[] =>
  list.map((g) => ({ ...g, icon: giftIconUrl(g.id) ?? undefined }));

type SideModal = "hands" | "decorate" | "leaderboard" | null;

export function ClubRoom({ onLeaveClub }: { onLeaveClub?: () => void } = {}) {
  const leaveClub = onLeaveClub ?? (() => useAppStore.setState({ club: null } as any));
  const profile = useAppStore((s) => s.profile);
  const club = useAppStore((s) => s.club);
  const session = useAppStore((s) => s.session);
  const setSession = useAppStore((s) => s.setSession);
  const setChatMessages = useAppStore((s) => s.setChatMessages);
  const chatMessages = useAppStore((s) => s.chatMessages);
  const resonanceActive = useAppStore((s) => s.resonanceActive);
  const addCoins = useAppStore((s) => s.addCoins);
  const activeGifts = useAppStore((s) => s.activeGifts);

  const [sideModal, setSideModal] = useState<SideModal>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [djBusy, setDjBusy] = useState(false);
  const [myLightOn] = useState(true);
  const [giftBusy, setGiftBusy] = useState(false);
  const [banned, setBanned] = useState(false);
  const [welcome, setWelcome] = useState<string>((club as any)?.welcome_text ?? "");
  const [savingWelcome, setSavingWelcome] = useState(false);
  const [openedProfile, setOpenedProfile] = useState<ClubberProfile | null>(null);
  const [tick, setTick] = useState(0);
  const [playerGifts, setPlayerGifts] = useState<GiftItem[]>([]);
  const [djGifts, setDjGifts] = useState<GiftItem[]>([]);
  /** моё место в очереди диджеев, null — не в очереди */
  const [queuePos, setQueuePos] = useState<number | null>(null);
  /** кто танцует под текущий трек: лайкнул — танцует до конца */
  const [dancers, setDancers] = useState<Set<string>>(new Set());
  /** мой голос за текущий трек, чтобы кнопки залипали */
  const [myVote, setMyVote] = useState<"up" | "down" | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [mode, setMode] = useState<"radio" | "queue">(
    ((useAppStore.getState().club as any)?.mode as "radio" | "queue") ?? "queue",
  );
  const [haremLocked, setHaremLocked] = useState<boolean>(
    Boolean((useAppStore.getState().profile as any)?.harem_locked),
  );

  /** чтобы не отправить «следующий» дважды за один и тот же трек */
  const advancedFor = useRef<string | null>(null);

  /** чтобы не долбить сервер просьбами включить радио */
  const radioAsked = useRef(false);

  /** роль в клубе: хозяин сообщества — жёлтая рамка */
  const myRole: ClubRole = useMemo(() => {
    const ownerVk = (club as any)?.owner_vk_id ?? (club as any)?.creator_vk_id;
    return ownerVk && profile && ownerVk === profile.vk_id ? "owner" : "member";
  }, [club, profile]);

  const me: PresenceMe | null = useMemo(
    () =>
      profile
        ? {
            vkId: profile.vk_id,
            name: (profile as any).first_name ?? `id${profile.vk_id}`,
            photo: profile.avatar_url ?? "",
            gender: genderFromVk((profile as any).sex),
            role: myRole,
          }
        : null,
    [profile, myRole],
  );

  const { toggleMyLightShow, occupants, reactions, sendReaction, clearReactions } =
    useClubRealtime(club?.id ?? null, me);

  const {
    position: musicPosition,
    unlock: unlockAudio,
    atBooth,
    needsGesture,
    enableSound,
    loadTrack,
    stop: stopMusic,
  } = useClubMusic(APP_ID, session as any, profile?.vk_id ?? null);

  /**
   * Что играет прямо сейчас — читаем при входе.
   * Realtime приносит только изменения, поэтому зашедший в середине
   * сета без этого видел бы пустой пульт.
   */
  useEffect(() => {
    if (!club?.id) return;
    let cancelled = false;

    (async () => {
      const [sessionRes, chatRes] = await Promise.all([
        supabase.from("club_sessions").select("*").eq("club_id", club.id).maybeSingle(),
        supabase
          .from("chat_messages")
          .select("*")
          .eq("club_id", club.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (cancelled) return;
      if (sessionRes.data) setSession(sessionRes.data as any);
      if (chatRes.data) setChatMessages([...(chatRes.data as any[])].reverse());
    })();

    return () => {
      cancelled = true;
    };
  }, [club?.id, setSession, setChatMessages]);

  /* ---------- бан и приветствие ---------- */
  useEffect(() => {
    if (!club || !profile) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.rpc("is_banned_vk", {
          p_club: club.id,
          p_vk_id: profile.vk_id,
        });
        if (!cancelled) setBanned(Boolean(data));
      } catch {
        if (!cancelled) setBanned(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [club, profile]);

  useEffect(() => {
    setWelcome((club as any)?.welcome_text ?? "");
    setMode(((club as any)?.mode as "radio" | "queue") ?? "queue");
  }, [club]);

  /** Права распоряжаться комнатой: владелец в игре или модератор паблика. */
  useEffect(() => {
    if (!club?.id || !profile) return;
    let cancelled = false;
    canManageClub(club.id, profile.vk_id).then((ok) => {
      if (!cancelled) setCanManage(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [club?.id, profile]);

  /** Моё место в очереди: перечитываем при смене трека и раз в пять секунд. */
  useEffect(() => {
    if (!club?.id || !profile) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("dj_queue")
        .select("position")
        .eq("club_id", club.id)
        .eq("vk_id", profile.vk_id)
        .maybeSingle();
      if (!cancelled) setQueuePos((data as any)?.position ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [club?.id, profile, (session as any)?.track_started_at, Math.floor(tick / 5)]);

  /**
   * Пока стоишь за пультом — отмечаешься на сервере.
   * Перестал отмечаться, значит вкладка закрыта, и зал снимет тебя сам.
   */
  useEffect(() => {
    if (!atBooth || !club?.id || !profile) return;

    const beat = () => {
      void supabase.rpc("dj_heartbeat", { p_club: club.id, p_vk_id: profile.vk_id });
    };
    beat();
    const timer = setInterval(beat, 10000);
    return () => clearInterval(timer);
  }, [atBooth, club?.id, profile]);

  /** Ключ текущего трека — по нему отсекаем руки с прошлого. */
  const trackKey: string | null = (session as any)?.track_started_at ?? null;

  /** Новый трек — танцпол замирает, руки опускаются, голос сбрасывается. */
  useEffect(() => {
    setDancers(new Set());
    setMyVote(null);
    clearReactions();
  }, [trackKey, clearReactions]);

  /**
   * Кто уже танцует под этот трек.
   * Живые реакции ловят только тех, кто лайкнул при нас. Вошедший
   * в середине сета их не слышал, поэтому список поднимаем из базы:
   * все, кто проголосовал за текущий трек, уже на танцполе.
   */
  useEffect(() => {
    if (!club?.id || !trackKey) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("track_votes")
        .select("vk_id, vote")
        .eq("club_id", club.id)
        .eq("started_at", trackKey);

      if (cancelled || !data) return;

      const ups = (data as any[])
        .filter((v) => v.vote === "up")
        .map((v) => String(v.vk_id));

      if (!ups.length) return;

      setDancers((prev) => {
        const next = new Set(prev);
        let changed = false;
        for (const id of ups) if (!next.has(id)) { next.add(id); changed = true; }
        return changed ? next : prev;
      });

      // заодно вспоминаем свой голос, чтобы кнопки не разблокировались
      if (profile) {
        const mine = (data as any[]).find((v) => v.vk_id === profile.vk_id);
        if (mine) setMyVote(mine.vote === "up" ? "up" : "down");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [club?.id, trackKey, profile]);

  /**
   * Танцует только тот, кто поставил лайк текущему треку.
   * Хлопок руку поднимает, но танец не включает.
   */
  useEffect(() => {
    if (!trackKey) return;
    const ups = Object.entries(reactions ?? {})
      .filter(([, r]) => r.kind === "up" && r.dance && r.trackKey === trackKey)
      .map(([vkId]) => String(vkId));
    if (!ups.length) return;

    setDancers((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of ups) if (!next.has(id)) { next.add(id); changed = true; }
      return changed ? next : prev;
    });
  }, [reactions, trackKey]);

  /** Каталог подарков: цены и состав меняются прямо в базе. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("gifts_catalog")
        .select("id, name, price, category")
        .order("price", { ascending: true });

      if (cancelled || !data) return;

      const rows = data as Array<{ id: string; name: string; price: number; category: string }>;
      setPlayerGifts(withIcons(rows.filter((g) => g.category !== "dj")));
      setDjGifts(withIcons(rows.filter((g) => g.category === "dj")));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** секундный тик — полоса трека и проверка конца сета */
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  /* ---------- маппинг данных в сцену ---------- */
  const djVkId = session?.dj_vk_id ?? null;

  const isRadio = Boolean((session as any)?.is_radio) && !djVkId;

  const dj: Clubber | null = useMemo(() => {
    if (!djVkId) return null;
    const o = occupants.find((x) => x.vkId === djVkId);
    return {
      id: String(djVkId),
      name: o?.name ?? `id${djVkId}`,
      photo: o?.photo ?? "",
      gender: o?.gender ?? "m",
      role: o?.role ?? "member",
      title: "dj",
    };
  }, [djVkId, occupants]);

  const crowd: Clubber[] = useMemo(
    () =>
      occupants
        .filter((o) => o.vkId !== djVkId)
        .map((o) => ({
          id: String(o.vkId),
          name: o.name,
          photo: o.photo,
          gender: o.gender,
          role: o.role,
        })),
    [occupants, djVkId],
  );

  /** Полоса трека: живое время звука, а если он молчит — счёт от старта. */
  const shownPosition = useMemo(() => {
    if (musicPosition > 0) return musicPosition;
    const started = (session as any)?.track_started_at;
    if (!started) return 0;
    const ms = Date.parse(started);
    if (!Number.isFinite(ms)) return 0;
    return Math.max(0, (Date.now() - ms) / 1000);
  }, [musicPosition, session, tick]);

  const track = useMemo(() => {
    const s = session as any;
    if (!s?.dj_vk_id && !s?.is_radio) return null;
    return {
      artist: s.track_artist ?? (isRadio ? "Радио клуба" : ""),
      title: s.track_title ?? "",
      position: shownPosition,
      duration: s.track_duration_sec ?? s.track_duration ?? 0,
      likes: s.likes ?? 0,
      dislikes: s.dislikes ?? 0,
      gifts: s.gifts ?? 0,
      myVote,
    };
  }, [session, shownPosition, isRadio, myVote]);

  /** Поднятые руки над аватарками: ключи приводим к строкам, как ждёт сцена. */
  const uiReactions = useMemo(() => {
    const out: Record<string, { kind: "up" | "down"; skin: string | null }> = {};
    for (const [vkId, r] of Object.entries(reactions ?? {})) {
      out[String(vkId)] = { kind: r.kind, skin: r.skin };
    }
    return out;
  }, [reactions]);

  const messages: UiMessage[] = useMemo(() => {
    const nameOf = (vkId: number) =>
      occupants.find((o) => o.vkId === vkId)?.name ?? `id${vkId}`;
    return chatMessages.map((m: any) => ({
      id: String(m.id),
      kind: "text" as const,
      from: nameOf(m.vk_id),
      fromId: String(m.vk_id),
      text: m.message,
      mine: profile ? m.vk_id === profile.vk_id : false,
    }));
  }, [chatMessages, occupants, profile]);

  /* ---------- действия ---------- */
  const sendGift = useCallback(
    async (gift: GiftItem, userId: string | null) => {
      if (!club) return;
      setGiftBusy(true);
      try {
        const res = await callEdgeFunction<{ spent: number }>("gift-action", {
          launchParams: getLaunchParams(),
          club_id: club.id,
          gift_id: gift.id,
          to_vk_id: userId ? Number(userId) : undefined,
        });
        addCoins(-res.spent);
      } catch (e) {
        alert((e as Error).message);
      } finally {
        setGiftBusy(false);
      }
    },
    [club, addCoins],
  );

  /** Лайк или дизлайк текущему треку. */
  const vote = useCallback(
    async (v: "up" | "down") => {
      if (!club || !profile || myVote) return;

      // рука и танец поднимаются сразу — ждать сервер незачем
      setMyVote(v);
      sendReaction(v, handSkinIconUrl(profile.hand_skin) ?? null, {
        dance: v === "up",
        trackKey,
      });
      if (v === "up") setDancers((prev) => new Set(prev).add(String(profile.vk_id)));

      const { data, error } = await supabase.rpc("vote_track", {
        p_club: club.id,
        p_vk_id: profile.vk_id,
        p_vote: v,
      });
      if (error) {
        // сервер не принял голос — откатываем залипание кнопки
        setMyVote(null);
        alert(error.message);
        return;
      }

      const row: any = Array.isArray(data) ? data[0] : data;
      if (row && session) {
        setSession({ ...(session as any), likes: row.likes, dislikes: row.dislikes });
      }
    },
    [club, profile, session, sendReaction, setSession, myVote, trackKey],
  );

  /** Похлопать: рука вверх без голоса. */
  const clap = useCallback(() => {
    if (!profile) return;
    // рука поднимается, но танец не начинается — танцует только лайк
    sendReaction("up", handSkinIconUrl(profile.hand_skin) ?? null, {
      dance: false,
      trackKey,
    });
  }, [profile, sendReaction, trackKey]);

  /** Переключить режим комнаты: радио или очередь. */
  const switchMode = useCallback(async () => {
    if (!club || !profile) return;
    const next = mode === "radio" ? "queue" : "radio";
    const { data, error } = await supabase.rpc("set_club_mode", {
      p_club: club.id,
      p_vk_id: profile.vk_id,
      p_mode: next,
    });
    if (error) {
      alert(error.message);
      return;
    }
    setMode((data as any) ?? next);
    useAppStore.setState({ club: { ...(club as any), mode: next } } as any);
  }, [club, profile, mode]);

  /** Тумблер защиты гарема — только для автора игры. */
  const toggleHaremLock = useCallback(async () => {
    if (!profile) return;
    const next = !haremLocked;
    setHaremLocked(next);
    const { error } = await supabase.rpc("set_harem_lock", {
      p_vk_id: profile.vk_id,
      p_value: next,
    });
    if (error) {
      setHaremLocked(!next);
      alert(error.message);
    }
  }, [profile, haremLocked]);

  /**
   * join требует трек — без него функция отвечает «Сначала выбери трек».
   * Поэтому «Стать DJ» открывает выбор музыки, а join уходит уже с треком.
   */
  const djAction = useCallback(
    async (
      action: "join" | "leave" | "advance" | "radio",
      track?: Record<string, unknown>,
      silent = false,
    ): Promise<any | null> => {
      if (!club) return null;
      try {
        return await callEdgeFunction<any>("dj-action", {
          launchParams: getLaunchParams(),
          club_id: club.id,
          action,
          ...(track ? { track } : {}),
        });
      } catch (e) {
        if (!silent) alert((e as Error).message);
        return null;
      }
    },
    [club],
  );

  /** Покинуть очередь. */
  const leaveQueue = useCallback(async () => {
    const ok = await djAction("leave", undefined, true);
    if (ok) setQueuePos(null);
  }, [djAction]);

  /** Выбрали трек: встаём за пульт и сразу включаем звук — жест ещё живой. */
  const pickTrack = useCallback(
    async (t: ClubTrack) => {
      setDjBusy(true);
      const res = await djAction("join", {
        title: t.title,
        artist: t.artist,
        source: "library",
        url: t.url ?? null,
        duration_sec: t.duration ?? 180,
      });
      setDjBusy(false);
      if (!res) return;

      setPickerOpen(false);
      if (res.playing && t.url) void loadTrack(t.url, new Date().toISOString());
    },
    [djAction, loadTrack],
  );

  /** Клип играет видео, свой звук не нужен. */
  const pickClip = useCallback(
    async (v: { url: string; artist: string; title: string; duration: number }) => {
      setDjBusy(true);
      const res = await djAction("join", {
        title: v.title,
        artist: v.artist,
        source: "clip",
        video_url: v.url,
        duration_sec: v.duration ?? 300,
      });
      setDjBusy(false);
      if (res) setPickerOpen(false);
    },
    [djAction],
  );

  /** Завершить сет вручную. */
  const finishSet = useCallback(() => {
    stopMusic();
    void djAction("advance");
  }, [djAction, stopMusic]);

  /**
   * Сет — один трек. Доиграл, и пульт уходит следующему в очереди.
   * Отправляет диджей; если он пропал, через 15 секунд это сделает
   * любой оставшийся в зале, чтобы клуб не завис.
   */
  useEffect(() => {
    const started = (session as any)?.track_started_at;
    const duration = (session as any)?.track_duration_sec;
    const currentDj = session?.dj_vk_id;
    if (!started || !duration || !currentDj || !profile) return;

    const key = `${currentDj}:${started}`;
    if (advancedFor.current === key) return;

    const startedMs = Date.parse(started);
    if (!Number.isFinite(startedMs)) return;

    const elapsed = (Date.now() - startedMs) / 1000;
    const mine = currentDj === profile.vk_id;

    if (elapsed >= duration + (mine ? 1 : 15)) {
      advancedFor.current = key;
      void djAction("advance", undefined, true);
    }
  }, [tick, session, profile, djAction]);

  /** Радио: трек доиграл — ставим следующий из фонотеки. */
  useEffect(() => {
    if (mode !== "radio" || !club) return;
    const started = (session as any)?.track_started_at;
    const duration = (session as any)?.track_duration_sec;
    if (!started || !duration || session?.dj_vk_id) return;
    if (!(session as any)?.is_radio) return;

    const startedMs = Date.parse(started);
    if (!Number.isFinite(startedMs)) return;

    const key = `radio:${started}`;
    if (advancedFor.current === key) return;

    if ((Date.now() - startedMs) / 1000 >= duration + 2) {
      advancedFor.current = key;
      void djAction("radio", undefined, true);
    }
  }, [tick, mode, club, session, djAction]);

  /**
   * Радио-комната: если за пультом никого и ничего не играет,
   * просим сервер поставить случайный трек из фонотеки клуба.
   * Зовёт любой клиент — сервер сам отсеет лишние вызовы.
   */
  useEffect(() => {
    if (mode !== "radio" || !club) return;
    if (session?.dj_vk_id) return;
    if ((session as any)?.track_url) return;
    if (radioAsked.current) return;

    radioAsked.current = true;
    void djAction("radio", undefined, true).finally(() => {
      // разрешаем следующую попытку через полминуты
      setTimeout(() => {
        radioAsked.current = false;
      }, 30000);
    });
  }, [mode, club, session, djAction]);

  const sendChat = useCallback(
    async (text: string) => {
      if (!club || !text.trim()) return;
      try {
        await callEdgeFunction("send-chat-message", {
          launchParams: getLaunchParams(),
          club_id: club.id,
          message: text,
        });
      } catch (e) {
        alert((e as Error).message);
      }
    },
    [club],
  );

  const loadProfile = useCallback(
    async (userId: string) => {
      const vkId = Number(userId);
      const o = occupants.find((x) => x.vkId === vkId);

      // базовая карточка из presence — покажется мгновенно
      const base: ClubberProfile = {
        id: userId,
        name: o?.name ?? `id${vkId}`,
        photo: o?.photo ?? "",
        vkUrl: `https://vk.com/id${vkId}`,
        gender: o?.gender ?? "m",
        role: o?.role ?? "member",
        tracks: 0,
        played: 0,
        giftsGot: 0,
        giftsSent: 0,
        owner: null,
        buyoutPrice: 32,
      };
      setOpenedProfile(base);

      // кто владеет этим игроком в клубе — мини-аватарка и цена перекупа
      let owner: ClubberProfile["owner"] = null;
      let buyoutPrice = 10;
      try {
        const { data: own } = await supabase
          .from("ownerships")
          .select("owner_vk_id, price_paid")
          .eq("club_id", club!.id)
          .eq("target_vk_id", vkId)
          .maybeSingle();

        if (own?.owner_vk_id) {
          buyoutPrice = (own.price_paid ?? 0) + 1;
          const oc = occupants.find((x) => x.vkId === own.owner_vk_id);
          const { data: op } = await supabase
            .from("profiles")
            .select("first_name, avatar_url")
            .eq("vk_id", own.owner_vk_id)
            .maybeSingle();

          owner = {
            id: String(own.owner_vk_id),
            name: (op as any)?.first_name ?? oc?.name ?? `id${own.owner_vk_id}`,
            photo: (op as any)?.avatar_url ?? oc?.photo ?? "",
          };
        }
        setOpenedProfile({ ...base, owner, buyoutPrice });
      } catch {
        /* владельца нет или таблица недоступна */
      }

      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("vk_id", vkId)
          .maybeSingle();
        if (!data) return;
        setOpenedProfile({
          ...base,
          name: (data as any).first_name ?? base.name,
          photo: (data as any).avatar_url ?? base.photo,
          city: (data as any).city ?? undefined,
          status: (data as any).status ?? "",
          gender: genderFromVk((data as any).sex),
          tracks: (data as any).tracks_ordered ?? 0,
          played: (data as any).tracks_played ?? 0,
          giftsGot: (data as any).gifts_received ?? 0,
          giftsSent: (data as any).gifts_sent ?? 0,
          owner,
          buyoutPrice,
        });
      } catch {
        /* остаёмся на базовой карточке */
      }
    },
    [occupants],
  );

  const banUser = useCallback(
    async (userId: string) => {
      if (!club) return;
      const { error } = await supabase.rpc("ban_user_vk", {
        p_club: club.id,
        p_target_vk: Number(userId),
      });
      if (error) alert(error.message);
    },
    [club],
  );

  const buyout = useCallback(
    async (userId: string) => {
      if (!club) return;
      try {
        const res = await callEdgeFunction<{ spent: number }>("harem-buyout", {
          launchParams: getLaunchParams(),
          club_id: club.id,
          target_vk_id: Number(userId),
          offer_price: openedProfile?.buyoutPrice,
        });
        addCoins(-(res?.spent ?? 0));
      } catch (e) {
        alert((e as Error).message);
      }
    },
    [club, addCoins, openedProfile],
  );

  const saveWelcome = useCallback(
    async (text: string) => {
      if (!club) return;
      setSavingWelcome(true);
      const { error } = await supabase.rpc("set_welcome_vk", { p_club: club.id, p_text: text });
      setSavingWelcome(false);
      if (error) alert(error.message);
      else setWelcome(text);
    },
    [club],
  );

  /**
   * Выход из клуба. Если игрок за пультом — сначала передаём очередь,
   * иначе в зале останется «призрак»: диджей, которого тут уже нет.
   */
  const exitClub = useCallback(async () => {
    if (atBooth) {
      if (!confirm("Ты за пультом. Выйти и передать очередь дальше?")) return;
      stopMusic();
      await djAction("advance", undefined, true);
    } else {
      stopMusic();
    }
    leaveClub();
  }, [atBooth, stopMusic, leaveClub, djAction]);

  /**
   * Уборка призраков: диджей закрыл вкладку и пропал из зала,
   * а сессия всё ещё держит его за пультом. Через двадцать секунд
   * отсутствия любой оставшийся передаёт очередь дальше.
   */
  const ghostSince = useRef<number | null>(null);
  useEffect(() => {
    const currentDj = session?.dj_vk_id;
    if (!currentDj || !club || !profile) {
      ghostSince.current = null;
      return;
    }
    // сам себя призраком не считаю
    if (currentDj === profile.vk_id) {
      ghostSince.current = null;
      return;
    }
    // список присутствующих ещё не пришёл — не спешим
    if (!occupants.length) return;
    const present = occupants.some((o) => o.vkId === currentDj);
    if (present) {
      ghostSince.current = null;
      return;
    }
    if (ghostSince.current === null) {
      ghostSince.current = Date.now();
      return;
    }
    if (Date.now() - ghostSince.current >= 25000) {
      ghostSince.current = null;
      void djAction("advance", undefined, true);
    }
  }, [tick, session, occupants, club, profile, djAction]);

  /** Светомузыка у всех включена всегда — отдельной кнопки больше нет. */
  useEffect(() => {
    if (myLightOn) toggleMyLightShow(true);
  }, [myLightOn, toggleMyLightShow]);

  if (!club || !profile) return null;

  return (
    <div onPointerDown={unlockAudio}>
      <ClubPage
        roomId={STYLE_TO_ROOM[(((club as any).style as ClubStyle) ?? "candy")] ?? "neon"}
        clubId={club.id}
        clubName={club.name}
        signText={(club as any).group_name ?? club.name}
        clubGroupId={(club as any).vk_group_id ?? 0}
        isGroupMember={Boolean((club as any).is_member)}
        welcomeText={welcome}
        banned={banned}
        myId={String(profile.vk_id)}
        myRole={myRole}
        coins={profile.coins}
        votes={(profile as any).votes ?? 0}
        track={track}
        videoUrl={(session as any)?.track_video_url ?? null}
        reactions={uiReactions}
        dancers={dancers}
        dj={dj}
        crowd={crowd}
        queuePosition={queuePos}
        onLeaveQueue={leaveQueue}
        queueMinutes={15}
        messages={messages}
        appUrl={APP_URL}
        emojiSubscribed={Boolean((profile as any).emoji_until)}
        emojiPrice={5}
        openedProfile={openedProfile}
        savingWelcome={savingWelcome}
        djGifts={djGifts}
        playerGifts={playerGifts}
        giftBusy={giftBusy}
        onExit={exitClub}
        onBecomeDj={() => setPickerOpen(true)}
        onVote={vote}
        onSendGift={sendGift}
        onSkipQueue={() => {}}
        onSendMessage={sendChat}
        onClap={clap}
        onDecorate={() => setSideModal("decorate")}
        onOpenShop={() => setSideModal("hands")}
        onOpenTop={() => setSideModal("leaderboard")}
        onOpenProfile={loadProfile}
        onCloseProfile={() => setOpenedProfile(null)}
        onBuyout={buyout}
        onBan={banUser}
        onSaveWelcome={saveWelcome}
        onSubscribeEmoji={() => {}}
        onChooseAnotherClub={exitClub}
        extraButtons={
          <>
            {needsGesture && (
              <button
                className="btn-round btn-round--charge"
                title="Включить звук"
                onClick={() => void enableSound()}
              >
                🔈
              </button>
            )}
            <button className="btn-round" title="Магазин рук" onClick={() => setSideModal("hands")}>
              {handSkinIconUrl(profile.hand_skin) ? (
                <img src={handSkinIconUrl(profile.hand_skin)!} alt="" width={18} height={18} />
              ) : (
                "👍"
              )}
            </button>
            {canManage && (
              <button
                className="btn-round"
                title={mode === "radio" ? "Режим: радио" : "Режим: очередь"}
                onClick={switchMode}
              >
                {mode === "radio" ? "📻" : "🎚"}
              </button>
            )}
            {profile.vk_id === ADMIN_VK_ID && (
              <button
                className="btn-round"
                title="Подгонка раскладки"
                onClick={() => useUi.getState().toggleTuner()}
              >
                📐
              </button>
            )}
            {profile.vk_id === ADMIN_VK_ID && (
              <button
                className={"btn-round" + (haremLocked ? "" : " btn-round--off")}
                title={haremLocked ? "Гарем закрыт от перекупа" : "Гарем открыт"}
                onClick={toggleHaremLock}
              >
                {haremLocked ? "🔒" : "🔓"}
              </button>
            )}
            {atBooth && (
              <button className="btn-round" title="Завершить сет" onClick={finishSet}>
                ⏭
              </button>
            )}
          </>
        }
        overlay={
          <>
            {resonanceActive && <div className="resonance-flash" />}
            <GiftFxLayer gifts={activeGifts} djId={djVkId} />
          </>
        }
      />

      {pickerOpen && (
        <MusicPickerModal
          vkId={profile.vk_id}
          clubId={club.id}
          canManage={canManage}
          busy={djBusy}
          onClose={() => setPickerOpen(false)}
          onPick={pickTrack}
          onPickClip={pickClip}
        />
      )}

      {sideModal === "hands" && <HandSkinShop onClose={() => setSideModal(null)} />}
      {sideModal === "decorate" && <DecorateClubModal onClose={() => setSideModal(null)} />}
      {sideModal === "leaderboard" && (
        <LeaderboardModal clubId={club.id} onClose={() => setSideModal(null)} />
      )}
    </div>
  );
}
