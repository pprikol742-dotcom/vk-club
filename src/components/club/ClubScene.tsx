import React from 'react';
import { ROOMS, LAYOUT, CROWD_SLOTS, assignSlots, type RoomId } from '../../config/clubTheme';
import { useUi } from '../../store/uiStore';
import { TrackPlayer, type TrackState } from './TrackPlayer';
import { ClubberAvatar, type Clubber } from './ClubberAvatar';
import { NeonSign } from './NeonSign';
import { ClubFxLayer } from './ClubFxLayer';
import { EffectsMenu } from './EffectsMenu';
import { LayoutTuner, tuned } from './LayoutTuner';
import { VideoScreen } from './VideoScreen';
import { canEditWelcome, type ClubRole } from '../../config/frames';

export type { Clubber };

interface Props {
  roomId: RoomId;
  /** название сообщества владельца — горит на вывеске */
  signText: string;
  myId: string;
  myRole: ClubRole;
  coins: number;
  votes: number;
  track: TrackState | null;
  dj: Clubber | null;
  /** позиция игрока в очереди: null — не в очереди */
  queuePosition: number | null;
  crowd: Clubber[];
  floorGift?: string | null;
  /** ссылка на клип, который крутится в зале */
  videoUrl?: string | null;
  /** сколько секунд клип уже идёт */
  videoOffset?: number;
  /** поднятые руки: ключ — id клаббера */
  reactions?: Record<string, { kind: 'up' | 'down'; skin: string | null }>;
  decor?: string | null;
  onExit: () => void;
  onBecomeDj: () => void;
  onScreenshot: () => void;
  onClap: () => void;
  onVote: (v: 'up' | 'down') => void;
  onGiftDj: () => void;
  onAddTrack?: () => void;
  onGiftUser: (userId: string) => void;
  onQueue: () => void;
  onCoins: () => void;
  onTop: () => void;
  onHelp: () => void;
  onDecorate: () => void;
  onOpenProfile: (userId: string) => void;
  onEditWelcome: () => void;
  onInviteFriends: () => void;
  /** доп. кнопки в панели действий (светомузыка, скины рук, рейтинги) */
  extraButtons?: React.ReactNode;
  /** слой поверх зала: эффекты подарков, вспышка резонанса */
  overlay?: React.ReactNode;
}

export const ClubScene: React.FC<Props> = (p) => {
  const room = ROOMS[p.roomId];
  const { muted, toggleMute, fx, toggleFxMenu, toggleTuner, tweak, avatarSize } = useUi();
  const meIsDj = !!p.dj && p.dj.id === p.myId;

  const cssVars = {
    ['--neon' as any]: room.neon,
    ['--neon-soft' as any]: room.neonSoft,
  };

  return (
    <div className="stage-wrap" style={cssVars}>
      <div className="hud">
        {/* панель действий */}
        <div className="actionbar" style={{ left: LAYOUT.actionBar.left, top: LAYOUT.actionBar.top }}>
          <button className="btn-exit" onClick={p.onExit}>🚪 ВЫХОД</button>
          <button className="btn-round" title="Декор клуба" onClick={p.onDecorate}>♠</button>
          <button className="btn-round" title="Группа клуба" onClick={() => useUi.getState().open('clubGroup')}>⬆</button>
          <button
            className={'btn-round' + (muted ? ' btn-round--off' : '')}
            title={muted ? 'Включить звук' : 'Выключить звук'}
            onClick={toggleMute}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button className="btn-round" title="Похлопать" onClick={p.onClap}>👏</button>
          <button className="btn-round" title="Снимок клуба" onClick={p.onScreenshot}>📷</button>
          {canEditWelcome(p.myRole) && (
            <button className="btn-round" title="Приветствие клуба" onClick={p.onEditWelcome}>📝</button>
          )}
          <button className="btn-round" title="Свет и эффекты" onClick={toggleFxMenu}>⚙</button>
          <button className="btn-round" title="Подгонка раскладки" onClick={toggleTuner}>📐</button>
          <button className="btn-round" title="Помощь" onClick={p.onHelp}>?</button>
          {p.extraButtons}
        </div>

        {/* монеты */}
        <div className="coins" style={{ right: LAYOUT.coins.right, top: LAYOUT.coins.top }} onClick={p.onCoins}>
          <span className="coins__icon">▶</span>
          {p.coins}
        </div>

        {/* топ клуба */}
        <div className="top-badge" style={{ right: LAYOUT.topBadge.right, top: LAYOUT.topBadge.top }} onClick={p.onTop}>
          ТОП<br />КЛУБА
        </div>
      </div>

      <div className="stage" style={{ backgroundImage: `url(${room.background})` }}>
        <ClubFxLayer fx={fx} />

        <NeonSign
          text={p.signText}
          color={room.signColor}
          glow={room.signGlow}
          flicker={fx.signFlicker}
          style={tuned('sign', tweak)}
        />

        {p.decor && (
          <div className="decor" style={{ right: LAYOUT.decorSlot.right, top: LAYOUT.decorSlot.top }}>
            {p.decor}
          </div>
        )}

        {/* плеер: пустой, когда никто не играет */}
        <TrackPlayer
          track={p.track}
          style={tuned('player', tweak)}
          onVote={p.onVote}
          onAdd={p.onAddTrack}
          onGift={p.onGiftDj}
        />

        {p.videoUrl && (
          <VideoScreen
            url={p.videoUrl}
            offset={p.videoOffset ?? 0}
            muted={muted}
            style={tuned('videoScreen', tweak)}
          />
        )}

        {/* место диджея */}
        {p.dj ? (
          <div
            className="dj-slot"
            style={tuned('djSlot', tweak)}
            onClick={() => p.onOpenProfile(p.dj!.id)}
          >
            <span className="dj-headphones">🎧</span>
            <img className="dj-avatar" src={p.dj.photo} alt={p.dj.name} title={p.dj.name} />
          </div>
        ) : (
          <div
            className="dj-slot dj-slot--empty"
            style={tuned('djSlot', tweak)}
            onClick={p.onBecomeDj}
            title="Пульт свободен — вставай за вертушки"
          />
        )}

        {/* кнопка у пульта */}
        {meIsDj ? null : p.queuePosition === null ? (
          <button
            className="dj-button"
            style={tuned('djButton', tweak)}
            onClick={p.onBecomeDj}
          >
            Стать DJ
          </button>
        ) : (
          <button
            className="dj-button dj-button--queue"
            style={tuned('djButton', tweak)}
            onClick={p.onQueue}
          >
            <span className="dj-button__bolt" onClick={(e) => { e.stopPropagation(); p.onQueue(); }}>⚡</span>
            Ты {p.queuePosition}
          </button>
        )}

        {p.floorGift && (
          <div className="gift-on-floor" style={tuned('giftSpot', tweak)}>
            {p.floorGift}
          </div>
        )}

        {/* танцпол */}
        <div
          className={'floor' + (fx.dance ? '' : ' floor--static')}
          style={{
            ...tuned('danceFloor', tweak),
            height: LAYOUT.danceFloor.height,
            ['--avatar-size' as any]: `${avatarSize}px`,
          }}
        >
          {assignSlots(p.crowd).map(({ person: c, slot, index }) => (
            <ClubberAvatar
              key={c.id}
              clubber={c}
              x={slot.x}
              y={slot.y}
              delay={(index % 5) * 0.18}
              isSelf={c.id === p.myId}
              reaction={p.reactions?.[c.id] ?? null}
              onOpenProfile={p.onOpenProfile}
              onGift={p.onGiftUser}
            />
          ))}
        </div>

        {p.overlay}
        <EffectsMenu />
        <LayoutTuner />
      </div>
    </div>
  );
};
