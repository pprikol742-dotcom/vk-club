import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useClubMusic } from "./useClubMusic";

const APP_URL = "https://vk.com/app54737632";
const APP_ID = 54737632;

/** РџРѕРґР°СЂРєРё РєР»Р°Р±Р±РµСЂСѓ Рё РґРёРґР¶РµСЋ вЂ” РёРєРѕРЅРєРё Р±РµСЂС‘Рј РёР· С‚РІРѕРµРіРѕ giftIcons. */
const withIcons = (list: Array<{ id: string; name: string; price: number }>): GiftItem[] =>
  list.map((g) => ({ ...g, icon: giftIconUrl(g.id) ?? undefined }));

const PLAYER_GIFTS = withIcons([
  { id: "ice_cream", name: "РњРѕСЂРѕР¶РµРЅРѕРµ", price: 5 },
  { id: "chocolate", name: "РљРѕРЅС„РµС‚Р°", price: 5 },
  { id: "raspberry", name: "РњР°Р»РёРЅРєР°", price: 4 },
  { id: "kiss", name: "РџРѕС†РµР»СѓР№", price: 5 },
  { id: "heart", name: "РЎРµСЂРґРµС‡РєРѕ", price: 5 },
  { id: "snowball", name: "РЎРЅРµР¶РѕРє", price: 3 },
  { id: "rotten_tomato", name: "РџРѕРјРёРґРѕСЂ", price: 3 },
  { id: "egg", name: "РЇР№С†Рѕ", price: 3 },
]);

const DJ_GIFTS = withIcons([
  { id: "cigar", name: "РЎРёРіР°СЂР°", price: 7 },
  { id: "hookah", name: "РљР°Р»СЊСЏРЅ", price: 7 },
  { id: "wine_glass", name: "Р’РёРЅРѕ", price: 5 },
  { id: "cognac_glass", name: "РљРѕРЅСЊСЏРє", price: 6 },
  { id: "beer_bottle", name: "РџРёРІРѕ", price: 5 },
  { id: "coffee", name: "РљРѕС„Рµ", price: 4 },
  { id: "chifir", name: "Р§РёС„РёСЂ", price: 6 },
]);

type SideModal = "hands" | "decorate" | "leaderboard" | null;

export function ClubRoom({ onLeaveClub }: { onLeaveClub?: () => void } = {}) {
  const leaveClub = onLeaveClub ?? (() => useAppStore.setState({ club: null } as any));
  const profile = useAppStore((s) => s.profile);
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
  const [tick, setTick] = useState(0);

  /** СЂРѕР»СЊ РІ РєР»СѓР±Рµ: С…РѕР·СЏРёРЅ СЃРѕРѕР±С‰РµСЃС‚РІР° вЂ” Р¶С‘Р»С‚Р°СЏ СЂР°РјРєР° */
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
    armed: deckArmed,
    loadTrack,
    stop: stopMusic,
  } = useClubMusic(APP_ID, session as any, profile?.vk_id ?? null);

  /* ---------- Р±Р°РЅ Рё РїСЂРёРІРµС‚СЃС‚РІРёРµ ---------- */
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

  /** СЃРµРєСѓРЅРґРЅС‹Р№ С‚РёРє вЂ” С‡С‚РѕР±С‹ РїРѕР»РѕСЃР° С€Р»Р° Рё Сѓ С‚РµС…, РєС‚Рѕ РЅРµ Р·Р° РїСѓР»СЊС‚РѕРј */
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  /* ---------- РјР°РїРїРёРЅРі РґР°РЅРЅС‹С… РІ СЃС†РµРЅСѓ ---------- */
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

  /**
   * РџРѕР»РѕСЃР° С‚СЂРµРєР°. Р—Р° РїСѓР»СЊС‚РѕРј Р±РµСЂС‘Рј РЅР°СЃС‚РѕСЏС‰РµРµ РІСЂРµРјСЏ Р·РІСѓРєР°,
   * РѕСЃС‚Р°Р»СЊРЅС‹Рј СЃС‡РёС‚Р°РµРј РѕС‚ СЃС‚Р°СЂС‚Р° РЅР° СЃРµСЂРІРµСЂРµ вЂ” РІРёРґСЏС‚, РЅРѕ РЅРµ СЃР»С‹С€Р°С‚.
   */
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

  /* ---------- РґРµР№СЃС‚РІРёСЏ ---------- */
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
    async (action: "join" | "advance") => {
      if (!club) return;
      try {
        await callEdgeFunction("dj-action", {
          launchParams: getLaunchParams(),
          club_id: club.id,
          action,
        });
      } catch (e) {
        alert((e as Error).message);
      }
    },
    [club],
  );

  /** В«Р—Р°СЂСЏРґРёС‚СЊВ» вЂ” РµРґРёРЅСЃС‚РІРµРЅРЅР°СЏ РєРЅРѕРїРєР°, СЃ РєРѕС‚РѕСЂРѕР№ РЅР°С‡РёРЅР°РµС‚СЃСЏ Р·РІСѓРє. */
  const chargeDeck = useCallback(() => {
    const url = (session as any)?.track_url;
    if (!url) {
      alert("РЎРЅР°С‡Р°Р»Р° РІС‹Р±РµСЂРё С‚СЂРµРє");
      return;
    }
    void loadTrack(url, (session as any)?.track_started_at).then((ok) => {
      if (!ok) alert("Р‘СЂР°СѓР·РµСЂ РЅРµ РїСѓСЃС‚РёР» Р·РІСѓРє вЂ” РЅР°Р¶РјРё В«Р—Р°СЂСЏРґРёС‚СЊВ» РµС‰С‘ СЂР°Р·");
    });
  }, [session, loadTrack]);

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

      // Р±Р°Р·РѕРІР°СЏ РєР°СЂС‚РѕС‡РєР° РёР· presence вЂ” РїРѕРєР°Р¶РµС‚СЃСЏ РјРіРЅРѕРІРµРЅРЅРѕ
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
        /* РѕСЃС‚Р°С‘РјСЃСЏ РЅР° Р±Р°Р·РѕРІРѕР№ РєР°СЂС‚РѕС‡РєРµ */
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

  /** Р’С‹С…РѕРґ РёР· РєР»СѓР±Р°: СЃРЅР°С‡Р°Р»Р° РіР»СѓС€РёРј Р·РІСѓРє, РїРѕС‚РѕРј СѓС…РѕРґРёРј. */
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

  const isDj = djVkId === profile.vk_id;
  const hasTrack = Boolean((session as any)?.track_url);

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
        onBecomeDj={() => djAction("join")}
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
            {/* Р—Р°СЂСЏРґРёС‚СЊ: С‚РѕР»СЊРєРѕ РґРёРґР¶РµСЋ, С‚РѕР»СЊРєРѕ РєРѕРіРґР° С‚СЂРµРє РІС‹Р±СЂР°РЅ */}
            {atBooth && hasTrack && !deckArmed && (
              <button className="btn-round btn-round--charge" title="Р—Р°СЂСЏРґРёС‚СЊ" onClick={chargeDeck}>
                в–¶
              </button>
            )}
            {atBooth && deckArmed && (
              <button className="btn-round" title="РЎРЅСЏС‚СЊ СЃ РїСѓР»СЊС‚Р°" onClick={stopMusic}>
                вЏ№
              </button>
            )}
            <button
              className={"btn-round" + (myLightOn ? "" : " btn-round--off")}
              title="РЎРІРµС‚РѕРјСѓР·С‹РєР°"
              onClick={toggleLight}
            >
              рџ’Ў
            </button>
            <button className="btn-round" title="РњР°РіР°Р·РёРЅ СЂСѓРє" onClick={() => setSideModal("hands")}>
              {handSkinIconUrl(profile.hand_skin) ? (
                <img src={handSkinIconUrl(profile.hand_skin)!} alt="" width={18} height={18} />
              ) : (
                "рџ‘Ќ"
              )}
            </button>
            {isDj && (
              <button
                className="btn-round"
                title="Р—Р°РІРµСЂС€РёС‚СЊ СЃРµС‚"
                onClick={() => djAction("advance")}
              >
                вЏ­
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

      {sideModal === "hands" && <HandSkinShop onClose={() => setSideModal(null)} />}
      {sideModal === "decorate" && <DecorateClubModal onClose={() => setSideModal(null)} />}
      {sideModal === "leaderboard" && (
        <LeaderboardModal clubId={club.id} onClose={() => setSideModal(null)} />
      )}
    </div>
  );
}

