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
import { handSkinIconUrl } from "../../lib/handSkins";
import { giftIconUrl } from "../../lib/giftIcons";

import { ClubPage } from "../../components/club/ClubPage";
import type { Clubber } from "../../components/club/ClubberAvatar";
import type { ChatMessage as UiMessage } from "../../components/club/ChatPanel";
import type { GiftItem } from "../../components/modals/ClubModals";
import type { ClubberProfile } from "../../components/modals/ProfileModal";
import type { ClubTrack } from "../../lib/music";
import { genderFromVk, type ClubRole } from "../../config/frames";
import { useClubMusic } from "./useClubMusic";

const APP_URL = "https://vk.com/app54746228";
const APP_ID = 54746228;

/** Подарки клабберу и диджею — иконки берём из твоего giftIcons. */
const withIcons = (list: Array<{ id: string; name: string; price: number }>): GiftItem[] =>
  list.map((g) => ({ ...g, icon: giftIconUrl(g.id) ?? undefined }));

const PLAYER_GIFTS = withIcons([
  { id: "ice_cream", name: "Мороженое", price: 5 },
  { id: "chocolate", name: "Конфета", price: 5 },
  { id: "raspberry", name: "Малинка", price: 4 },
  { id: "kiss", name: "Поцелуй", price: 5 },
  { id: "heart", name: "Сердечко", price: 5 },
  { id: "snowball", name: "Снежок", price: 3 },
  { id: "rotten_tomato", name: "Помидор", price: 3 },
  { id: "egg", name: "Яйцо", price: 3 },
]);

const DJ_GIFTS = withIcons([
  { id: "cigar", name: "Сигара", price: 7 },
  { id: "hookah", name: "Кальян", price: 7 },
  { id: "wine_glass", name: "Вино", price: 5 },
  { id: "cognac_glass", name: "Коньяк", price: 6 },
  { id: "beer_bottle", name: "Пиво", price: 5 },
  { id: "coffee", name: "Кофе", price: 4 },
  { id: "chifir", name: "Чифир", price: 6 },
]);

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
  const [myLightOn, setMyLightOn] = useState(true);
  const [giftBusy, setGiftBusy] = useState(false);
  const [banned, setBanned] = useState(false);
  const [welcome, setWelcome] = useState<string>((club as any)?.welcome_text ?? "");
  const [savingWelcome, setSavingWelcome] = useState(false);
  const [openedProfile, setOpenedProfile] = useState<ClubberProfile | null>(null);
  const [tick, setTick] = useState(0);

  /** чтобы не отправить «следующий» дважды за один и тот же трек */
  const advancedFor = useRef<string | null>(null);

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

  const { toggleMyLightShow, occupants } = useClubRealtime(club?.id ?? null, me);

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
  }, [club]);

  /** секундный тик — полоса трека и проверка конца сета */
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  /* ---------- маппинг данных в сцену ---------- */
  const djVkId = session?.dj_vk_id ?? null;

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
    if (!session?.dj_vk_id) return null;
    return {
      artist: session.track_artist ?? "",
      title: session.track_title ?? "",
      position: shownPosition,
      duration: (session as any).track_duration_sec ?? (session as any).track_duration ?? 0,
      likes: session.likes ?? 0,
      dislikes: session.dislikes ?? 0,
      gifts: (session as any).gifts ?? 0,
    };
  }, [session, shownPosition]);

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

  /**
   * join требует трек — без него функция отвечает «Сначала выбери трек».
   * Поэтому «Стать DJ» открывает выбор музыки, а join уходит уже с треком.
   */
  const djAction = useCallback(
    async (
      action: "join" | "leave" | "advance",
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
          buyoutPrice: (data as any).buyout_price ?? 32,
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
        });
        addCoins(-(res?.spent ?? 0));
      } catch (e) {
        alert((e as Error).message);
      }
    },
    [club, addCoins],
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

  /** Выход из клуба: сначала глушим звук, потом уходим. */
  const exitClub = useCallback(() => {
    stopMusic();
    leaveClub();
  }, [stopMusic, leaveClub]);

  const toggleLight = () => {
    const next = !myLightOn;
    setMyLightOn(next);
    toggleMyLightShow(next);
  };

  if (!club || !profile) return null;

  return (
    <div onPointerDown={unlockAudio}>
      <ClubPage
        roomId="neon"
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
        dj={dj}
        crowd={crowd}
        queuePosition={(session as any)?.my_queue_position ?? null}
        queueMinutes={15}
        messages={messages}
        appUrl={APP_URL}
        emojiSubscribed={Boolean((profile as any).emoji_until)}
        emojiPrice={5}
        openedProfile={openedProfile}
        savingWelcome={savingWelcome}
        djGifts={DJ_GIFTS}
        playerGifts={PLAYER_GIFTS}
        giftBusy={giftBusy}
        onExit={exitClub}
        onBecomeDj={() => setPickerOpen(true)}
        onVote={() => {}}
        onSendGift={sendGift}
        onSkipQueue={() => {}}
        onSendMessage={sendChat}
        onClap={() => {}}
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
            <button
              className={"btn-round" + (myLightOn ? "" : " btn-round--off")}
              title="Светомузыка"
              onClick={toggleLight}
            >
              💡
            </button>
            <button className="btn-round" title="Магазин рук" onClick={() => setSideModal("hands")}>
              {handSkinIconUrl(profile.hand_skin) ? (
                <img src={handSkinIconUrl(profile.hand_skin)!} alt="" width={18} height={18} />
              ) : (
                "👍"
              )}
            </button>
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
            <GiftFxLayer gifts={activeGifts} />
          </>
        }
      />

      {pickerOpen && (
        <MusicPickerModal
          vkId={profile.vk_id}
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
