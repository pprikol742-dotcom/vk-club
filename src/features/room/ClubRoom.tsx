import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { useClubRealtime, type PresenceMe } from "./useClubRealtime";
import { getLaunchParams } from "../../lib/vkBridge";
import { callEdgeFunction, supabase } from "../../lib/supabase";
import { GiftFxLayer } from "./GiftFxLayer";
import { HandSkinShop } from "../gifts/HandSkinShop";
import { DecorateClubModal } from "./DecorateClubModal";
import { LeaderboardModal } from "./LeaderboardModal";
import { handSkinIconUrl } from "../../lib/handSkins";
import { giftIconUrl } from "../../lib/giftIcons";

import { ClubPage } from "../../components/club/ClubPage";
import type { Clubber } from "../../components/club/ClubberAvatar";
import type { ChatMessage as UiMessage } from "../../components/club/ChatPanel";
import type { GiftItem } from "../../components/modals/ClubModals";
import type { ClubberProfile } from "../../components/modals/ProfileModal";
import { genderFromVk, type ClubRole } from "../../config/frames";
import { addToMyTracks } from "../../lib/library";
import { CoinShopModal } from "../shop/CoinShopModal";
import { useClubMusic } from "./useClubMusic";
import { MusicPickerModal } from "./MusicPickerModal";
import type { ClubTrack } from "../../lib/music";

/** ID приложения берём из окружения — иначе ВК ответит «Wrong app id». */
const APP_ID = Number(import.meta.env.VITE_VK_APP_ID ?? 0);
/** Дольше шести минут за пультом не задерживаемся. */
const MAX_SET_SEC = 360;
const APP_URL = `https://vk.com/app${APP_ID}`;

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

type SideModal = "hands" | "decorate" | "leaderboard" | "music" | "coins" | null;

/** Достаём настоящий текст ошибки из ответа Edge Function. */
async function describeError(e: unknown): Promise<string> {
  const err = e as any;
  const ctx = err?.context;
  if (ctx && typeof ctx.text === "function") {
    try {
      const body = await ctx.text();
      if (body) {
        try {
          const parsed = JSON.parse(body);
          return parsed.error ?? parsed.message ?? body;
        } catch {
          return body;
        }
      }
    } catch {
      /* тело уже прочитано */
    }
  }
  return err?.message ?? "Неизвестная ошибка";
}

export function ClubRoom({ onLeaveClub }: { onLeaveClub?: () => void } = {}) {
  const leaveClub = onLeaveClub ?? (() => useAppStore.setState({ club: null } as any));
  const profile = useAppStore((s) => s.profile);
  const setSession = useAppStore((s) => s.setSession);
  const club = useAppStore((s) => s.club);
  const session = useAppStore((s) => s.session);
  const chatMessages = useAppStore((s) => s.chatMessages);
  const resonanceActive = useAppStore((s) => s.resonanceActive);
  const addCoins = useAppStore((s) => s.addCoins);
  const activeGifts = useAppStore((s) => s.activeGifts);

  const [sideModal, setSideModal] = useState<SideModal>(null);
  const [myLightOn, setMyLightOn] = useState(true);
  const [giftBusy, setGiftBusy] = useState(false);
  const [banned, setBanned] = useState(false);
  const [welcome, setWelcome] = useState<string>((club as any)?.welcome_text ?? "");
  const [savingWelcome, setSavingWelcome] = useState(false);
  const [openedProfile, setOpenedProfile] = useState<ClubberProfile | null>(null);
  const djActionRef = useRef<((a: "join" | "advance") => void) | null>(null);

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

  const { toggleMyLightShow, occupants, reactions, sendReaction } = useClubRealtime(
    club?.id ?? null,
    me,
  );
  const { position: musicPosition, unlock: unlockAudio } = useClubMusic(APP_ID, session as any);

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

  const crowd: Clubber[] = useMemo(() => {
    const list = occupants
      .filter((o) => o.vkId !== djVkId)
      .map((o) => ({
        id: String(o.vkId),
        name: o.name,
        photo: o.photo,
        gender: o.gender,
        role: o.role,
      }));

    // себя показываем всегда: presence может ещё не догнать
    if (me && me.vkId !== djVkId && !list.some((c) => c.id === String(me.vkId))) {
      list.unshift({
        id: String(me.vkId),
        name: me.name,
        photo: me.photo,
        gender: me.gender,
        role: me.role,
      });
    }
    return list;
  }, [occupants, djVkId, me]);

  const track = useMemo(() => {
    if (!session?.dj_vk_id) return null;
    return {
      artist: session.track_artist ?? "",
      title: session.track_title ?? "",
      position: musicPosition,
      duration: (session as any).track_duration_sec ?? 0,
      likes: session.likes ?? 0,
      dislikes: session.dislikes ?? 0,
      gifts: (session as any).gifts ?? 0,
    };
  }, [session, musicPosition]);

  /** Realtime иногда молчит — подстраховываемся опросом сессии. */
  useEffect(() => {
    if (!club) return;
    let stop = false;

    const pull = async () => {
      const { data } = await supabase
        .from("club_sessions")
        .select("*")
        .eq("club_id", club.id)
        .maybeSingle();
      if (!stop && data) setSession(data as any);
    };

    pull();
    const timer = setInterval(pull, 4000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [club, setSession]);

  /** Сет закончился или упёрся в лимит — уступаем пульт следующему. */
  useEffect(() => {
    if (!club || !profile) return;
    if ((session as any)?.dj_vk_id !== profile.vk_id) return;

    const startedAt = Date.parse((session as any)?.track_started_at ?? '');
    if (!startedAt) return;

    const trackSec = (session as any)?.track_duration_sec ?? MAX_SET_SEC;
    const limit = Math.min(trackSec || MAX_SET_SEC, MAX_SET_SEC);
    const left = limit * 1000 - (Date.now() - startedAt);

    const timer = setTimeout(() => {
      djActionRef.current?.('advance');
    }, Math.max(1000, left));

    return () => clearTimeout(timer);
  }, [club, profile, session]);

  /** Реакции по строковым id — в таком виде их ждёт сцена. */
  const reactionMap = useMemo(() => {
    const out: Record<string, { kind: "up" | "down"; skin: string | null }> = {};
    for (const r of Object.values(reactions)) {
      out[String(r.vkId)] = { kind: r.kind, skin: r.skin };
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
  /** Лайк и дизлайк: голос в базу и поднятая рука над аватаркой. */
  const vote = useCallback(
    async (kind: "up" | "down") => {
      if (!club || !profile) return;
      sendReaction(kind, handSkinIconUrl(profile.hand_skin) ?? null);
      const { error } = await supabase.rpc("vote_track", {
        p_club: club.id,
        p_vk_id: profile.vk_id,
        p_vote: kind,
      });
      if (error) alert(error.message);
    },
    [club, profile, sendReaction],
  );

  /** Плюсик в плеере — трек уезжает в личный плейлист. */
  const addCurrentTrack = useCallback(async () => {
    const url = (session as any)?.track_url;
    if (!profile || !url) return;
    try {
      const { data, error } = await supabase
        .from("tracks")
        .select("id")
        .eq("url", url)
        .maybeSingle();
      if (error) throw error;
      if (data?.id) await addToMyTracks(profile.vk_id, data.id);
    } catch (e) {
      console.warn("add track failed", e);
    }
  }, [profile, session]);

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

  const djAction = useCallback(
    async (action: "join" | "advance", track?: ClubTrack) => {
      if (!club) return;
      try {
        await callEdgeFunction("dj-action", {
          launchParams: getLaunchParams(),
          club_id: club.id,
          action,
          track: track
            ? {
                title: track.title,
                artist: track.artist,
                source: (track as any).video_url
                  ? "clip"
                  : String(track.id).startsWith("clip_")
                    ? "clip"
                    : "library",
                url: track.url ?? null,
                video_url: (track as any).video_url ?? null,
                duration_sec: track.duration,
              }
            : undefined,
        });
      } catch (e) {
        alert(await describeError(e));
      }
    },
    [club],
  );

  djActionRef.current = djAction;

  /** «Стать DJ» — сперва выбираем, что заряжать. */
  const pickTrack = useCallback(
    async (track: ClubTrack) => {
      setSideModal(null);
      await djAction("join", track);
    },
    [djAction],
  );

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
        coins={(profile as any).unlimited_coins ? Infinity : profile.coins}
        votes={(profile as any).votes ?? 0}
        track={track}
        dj={dj}
        crowd={crowd}
        queuePosition={(session as any)?.my_queue_position ?? null}
        queueMinutes={15}
        messages={messages}
        appUrl={APP_URL}
        videoUrl={(session as any)?.track_video_url ?? null}
        videoOffset={musicPosition}
        emojiSubscribed={Boolean((profile as any).emoji_until)}
        emojiPrice={5}
        openedProfile={openedProfile}
        savingWelcome={savingWelcome}
        djGifts={DJ_GIFTS}
        playerGifts={PLAYER_GIFTS}
        giftBusy={giftBusy}
        onExit={() => {
          if (djVkId === profile.vk_id) {
            alert("Ты за пультом — сначала доиграй трек или уступи очередь");
            return;
          }
          leaveClub();
        }}
        onBecomeDj={() => setSideModal("music")}
        onVote={vote}
        onAddTrack={addCurrentTrack}
        reactions={reactionMap}
        onSendGift={sendGift}
        onSkipQueue={() => {}}
        onSendMessage={sendChat}
        onClap={() => {}}
        onDecorate={() => setSideModal("decorate")}
        onOpenShop={() => setSideModal("coins")}
        onOpenTop={() => setSideModal("leaderboard")}
        onOpenProfile={loadProfile}
        onCloseProfile={() => setOpenedProfile(null)}
        onBuyout={buyout}
        onBan={banUser}
        onSaveWelcome={saveWelcome}
        onSubscribeEmoji={() => {}}
        onChooseAnotherClub={leaveClub}
        extraButtons={
          <>
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
          </>
        }
        overlay={
          <>
            {resonanceActive && <div className="resonance-flash" />}
            <GiftFxLayer gifts={activeGifts} />
          </>
        }
      />

      {sideModal === "hands" && <HandSkinShop onClose={() => setSideModal(null)} />}
      {sideModal === "decorate" && <DecorateClubModal onClose={() => setSideModal(null)} />}
      {sideModal === "leaderboard" && (
        <LeaderboardModal clubId={club.id} onClose={() => setSideModal(null)} />
      )}
      {sideModal === "coins" && (
        <CoinShopModal
          vkId={profile.vk_id}
          coins={profile.coins}
          unlimited={Boolean((profile as any).unlimited_coins)}
          onClose={() => setSideModal(null)}
          onBought={(total) => useAppStore.setState({ profile: { ...profile, coins: total } } as any)}
        />
      )}
      {sideModal === "music" && (
        <MusicPickerModal
          vkId={profile.vk_id}
          onClose={() => setSideModal(null)}
          onPick={pickTrack}
          onPickClip={(v) =>
            pickTrack({
              id: `clip_${Date.now()}`,
              artist: v.artist,
              title: v.title,
              duration: v.duration,
              video_url: v.url,
            } as any)
          }
        />
      )}
    </div>
  );
}
