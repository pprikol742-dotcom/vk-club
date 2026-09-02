import React, { useMemo, useRef, useState } from 'react';
import { ClubScene } from './ClubScene';
import type { Clubber } from './ClubberAvatar';
import { ChatPanel, type ChatMessage } from './ChatPanel';
import {
  GiftModal, QueueModal, TrackResultModal, ClubGroupModal, HelpModal, type GiftItem,
} from '../modals/ClubModals';
import { ProfileModal, HaremModal, type ClubberProfile } from '../modals/ProfileModal';
import { WelcomeEditModal, BanConfirmModal, BlockedScreen } from '../modals/ModerationModals';
import { useUi } from '../../store/uiStore';
import { canBan, canEditWelcome, type ClubRole } from '../../config/frames';
import type { TrackState } from './TrackPlayer';
import type { RoomId } from '../../config/clubTheme';
import { captureStage, shareStory, bragText, inviteText, joinClubGroup } from '../../lib/vkShare';
import { inviteFriends } from '../../lib/vkClub';
import '../../styles/club.css';
import '../../styles/club-extra.css';
import '../../styles/club-frames.css';
import '../../styles/club-fx.css';

interface Props {
  roomId: RoomId;
  clubId: string;
  clubName: string;
  /** что горит на вывеске: имя паблика владельца */
  signText?: string;
  clubGroupId: number;
  isGroupMember: boolean;
  /** приветствие клуба — падает в чат каждому входящему */
  welcomeText: string;
  /** игрок забанен в этом клубе */
  banned: boolean;
  myId: string;
  myRole: ClubRole;
  coins: number;
  votes: number;
  track: TrackState | null;
  dj: Clubber | null;
  crowd: Clubber[];
  queuePosition: number | null;
  queueMinutes: number;
  messages: ChatMessage[];
  floorGift?: string | null;
  decor?: string | null;
  appUrl: string;
  emojiSubscribed: boolean;
  emojiPrice: number;
  openedProfile: ClubberProfile | null;
  savingWelcome?: boolean;
  onExit: () => void;
  onBecomeDj: () => void;
  onVote: (v: 'up' | 'down') => void;
  /** подарок: userId === null — угощение диджею */
  onSendGift: (g: GiftItem, userId: string | null) => void;
  onSkipQueue: () => void;
  onSendMessage: (text: string) => void;
  onClap: () => void;
  onDecorate: () => void;
  onOpenShop: () => void;
  onOpenTop: () => void;
  onOpenProfile: (userId: string) => void;
  onCloseProfile: () => void;
  onBuyout: (userId: string) => void;
  onBan: (userId: string) => void;
  onSaveWelcome: (text: string) => void;
  onSubscribeEmoji: () => void;
  onChooseAnotherClub: () => void;
  /** каталоги подарков: диджею и обычному клабберу */
  djGifts?: GiftItem[];
  playerGifts?: GiftItem[];
  giftBusy?: boolean;
  extraButtons?: React.ReactNode;
  overlay?: React.ReactNode;
}

const SKIP_PRICE = 20;

export const ClubPage: React.FC<Props> = (p) => {
  const { modal, open, close, lastResult } = useUi();
  const stageRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [harem, setHarem] = useState<ClubberProfile | null>(null);
  const [banTarget, setBanTarget] = useState<{ id: string; name: string } | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [giftTarget, setGiftTarget] = useState<{ id: string | null; name?: string } | null>(null);

  /** приветствие клуба всегда первая строка чата — при каждом входе */
  const messages = useMemo<ChatMessage[]>(() => {
    if (!p.welcomeText.trim()) return p.messages;
    return [{ id: `welcome-${p.clubId}`, kind: 'admin', text: p.welcomeText }, ...p.messages];
  }, [p.welcomeText, p.messages, p.clubId]);

  if (p.banned) {
    return (
      <BlockedScreen
        votes={p.votes}
        onChooseClub={p.onChooseAnotherClub}
        onHelp={() => open('help')}
      />
    );
  }

  const share = async (text: string) => {
    if (!stageRef.current || busy) return;
    setBusy(true);
    try {
      const img = await captureStage(stageRef.current);
      await shareStory(img, text, p.appUrl);
    } catch (e) {
      console.warn('share failed', e);
    } finally {
      setBusy(false);
    }
  };

  const profile = p.openedProfile;
  const banAllowed = !!profile && canBan(p.myRole, profile.role, profile.id === p.myId);

  return (
    <div className="app">
      <div ref={stageRef} style={{ display: 'contents' }}>
        <ClubScene
          roomId={p.roomId}
          signText={p.signText ?? p.clubName}
          myId={p.myId}
          myRole={p.myRole}
          coins={p.coins}
          votes={p.votes}
          track={p.track}
          dj={p.dj}
          crowd={p.crowd}
          queuePosition={p.queuePosition}
          floorGift={p.floorGift}
          decor={p.decor}
          onExit={p.onExit}
          onBecomeDj={p.onBecomeDj}
          onScreenshot={() => share(inviteText(p.clubName))}
          onClap={p.onClap}
          onVote={p.onVote}
          onGiftDj={() => setGiftTarget({ id: null })}
          onGiftUser={(id) => {
            const c = p.crowd.find((x) => x.id === id);
            setGiftTarget({ id, name: c?.name });
          }}
          onQueue={() => open('queue')}
          onCoins={p.onOpenShop}
          onTop={p.onOpenTop}
          onHelp={() => open('help')}
          onDecorate={p.onDecorate}
          onOpenProfile={p.onOpenProfile}
          onEditWelcome={() => canEditWelcome(p.myRole) && setWelcomeOpen(true)}
          onInviteFriends={() => inviteFriends().catch(() => {})}
          extraButtons={p.extraButtons}
          overlay={p.overlay}
        />
      </div>

      <ChatPanel
        messages={messages}
        emojiSubscribed={p.emojiSubscribed}
        emojiPrice={p.emojiPrice}
        onSend={p.onSendMessage}
        onOpenProfile={p.onOpenProfile}
        onSubscribeEmoji={p.onSubscribeEmoji}
      />

      {/* профиль клаббера */}
      {profile && !harem && !banTarget && (
        <ProfileModal
          profile={profile}
          canBan={banAllowed}
          canBuyout={profile.id !== p.myId && profile.owner?.id !== p.myId}
          onClose={p.onCloseProfile}
          onBan={() => setBanTarget({ id: profile.id, name: profile.name })}
          onBuyout={() => setHarem(profile)}
          onOpenOwner={(id) => p.onOpenProfile(id)}
        />
      )}

      {/* подтверждение бана — только с жёлтой рамки */}
      {banTarget && (
        <BanConfirmModal
          targetName={banTarget.name}
          onClose={() => setBanTarget(null)}
          onConfirm={() => {
            p.onBan(banTarget.id);
            setBanTarget(null);
            p.onCloseProfile();
          }}
        />
      )}

      {/* перекуп в гарем */}
      {harem && (
        <HaremModal
          targetName={harem.name}
          ownerName={harem.owner?.name ?? null}
          price={harem.buyoutPrice}
          coins={p.coins}
          onClose={() => setHarem(null)}
          onConfirm={() => { p.onBuyout(harem.id); setHarem(null); p.onCloseProfile(); }}
        />
      )}

      {/* приветствие клуба — только владелец */}
      {welcomeOpen && canEditWelcome(p.myRole) && (
        <WelcomeEditModal
          initial={p.welcomeText}
          saving={p.savingWelcome}
          onClose={() => setWelcomeOpen(false)}
          onSave={(t) => { p.onSaveWelcome(t); setWelcomeOpen(false); }}
        />
      )}

      {/* подарки */}
      {giftTarget && (
        <GiftModal
          coins={p.coins}
          targetName={giftTarget.name}
          items={giftTarget.id === null ? p.djGifts : p.playerGifts}
          busy={p.giftBusy}
          onClose={() => setGiftTarget(null)}
          onSend={(g) => { p.onSendGift(g, giftTarget.id); setGiftTarget(null); }}
        />
      )}

      {modal === 'queue' && (
        <QueueModal
          minutes={p.queueMinutes}
          skipPrice={SKIP_PRICE}
          coins={p.coins}
          onClose={close}
          onSkip={() => { p.onSkipQueue(); close(); }}
        />
      )}

      {modal === 'trackResult' && lastResult && (
        <TrackResultModal
          {...lastResult}
          onClose={close}
          onBrag={() => share(bragText(lastResult.clubName, lastResult.likes))}
        />
      )}

      {modal === 'clubGroup' && (
        <ClubGroupModal
          clubName={p.clubName}
          isMember={p.isGroupMember}
          onClose={close}
          onJoin={() => joinClubGroup(p.clubGroupId).finally(close)}
        />
      )}

      {modal === 'help' && <HelpModal onClose={close} />}
    </div>
  );
};
