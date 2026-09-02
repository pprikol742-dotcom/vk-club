import React from 'react';
import { ROOMS, LAYOUT, CROWD_SLOTS, type RoomId } from '../../config/clubTheme';
import { useUi } from '../../store/uiStore';
import { TrackPlayer, type TrackState } from './TrackPlayer';
import { ClubberAvatar, type Clubber } from './ClubberAvatar';
import { canEditWelcome, type ClubRole } from '../../config/frames';

export type { Clubber };

interface Props {
  roomId: RoomId;
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
  decor?: string | null;
  onExit: () => void;
  onBecomeDj: () => void;
  onScreenshot: () => void;
  onClap: () => void;
  onVote: (v: 'up' | 'down') => void;
  onGiftDj: () => void;
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
  const { muted, toggleMute } = useUi();
  const meIsDj = !!p.dj && p.dj.id === p.myId;

  const cssVars = {
    ['--neon' as any]: room.neon,
    ['--neon-soft' as any]: room.neonSoft,
  };

  return (
    <div className="stage-wrap" style={cssVars}>
      <div className="topbar">
        <div className="topbar__left">▶ {room.title}</div>
        <div className="topbar__right">
          <span className="topbar__link" onClick={p.onHelp}>Помощь</span>
          <span className="topbar__votes">У вас <b>{p.votes}</b> голосов</span>
          <span className="topbar__link">Действия ⌄</span>
        </div>
      </div>

      <div className="stage" style={{ backgroundImage: `url(${room.background})` }}>
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

        {p.decor && (
          <div className="decor" style={{ right: LAYOUT.decorSlot.right, top: LAYOUT.decorSlot.top }}>
            {p.decor}
          </div>
        )}

        {/* плеер: пустой, когда никто не играет */}
        <TrackPlayer
          track={p.track}
          style={{ left: LAYOUT.player.left, top: LAYOUT.player.top, width: LAYOUT.player.width }}
          onVote={p.onVote}
          onGift={p.onGiftDj}
        />

        {/* место диджея */}
        {p.dj ? (
          <div
            className="dj-slot"
            style={{ left: LAYOUT.djSlot.left, top: LAYOUT.djSlot.top }}
            onClick={() => p.onOpenProfile(p.dj!.id)}
          >
            <span className="dj-headphones">🎧</span>
            <img className="dj-avatar" src={p.dj.photo} alt={p.dj.name} title={p.dj.name} />
          </div>
        ) : (
          <div
            className="dj-slot dj-slot--empty"
            style={{ left: LAYOUT.djSlot.left, top: LAYOUT.djSlot.top }}
            onClick={p.onBecomeDj}
            title="Пульт свободен — вставай за вертушки"
          />
        )}

        {/* кнопка у пульта */}
        {meIsDj ? (
          <button
            className="dj-button dj-button--invite"
            style={{ left: LAYOUT.djButton.left, top: LAYOUT.djButton.top }}
            onClick={p.onInviteFriends}
          >
            Позвать<br />друзей
          </button>
        ) : p.queuePosition === null ? (
          <button
            className="dj-button"
            style={{ left: LAYOUT.djButton.left, top: LAYOUT.djButton.top }}
            onClick={p.onBecomeDj}
          >
            Стать DJ
          </button>
        ) : (
          <button
            className="dj-button dj-button--queue"
            style={{ left: LAYOUT.djButton.left, top: LAYOUT.djButton.top }}
            onClick={p.onQueue}
          >
            <span className="dj-button__bolt" onClick={(e) => { e.stopPropagation(); p.onQueue(); }}>⚡</span>
            Ты {p.queuePosition}
          </button>
        )}

        {p.floorGift && (
          <div className="gift-on-floor" style={{ left: LAYOUT.giftSpot.left, top: LAYOUT.giftSpot.top }}>
            {p.floorGift}
          </div>
        )}

        {/* танцпол */}
        <div
          className="floor"
          style={{
            left: LAYOUT.danceFloor.left,
            top: LAYOUT.danceFloor.top,
            width: LAYOUT.danceFloor.width,
            height: LAYOUT.danceFloor.height,
          }}
        >
          {p.crowd.slice(0, CROWD_SLOTS.length).map((c, i) => (
            <ClubberAvatar
              key={c.id}
              clubber={c}
              x={CROWD_SLOTS[i].x}
              y={CROWD_SLOTS[i].y}
              delay={(i % 5) * 0.18}
              isSelf={c.id === p.myId}
              onOpenProfile={p.onOpenProfile}
              onGift={p.onGiftUser}
            />
          ))}
        </div>

        {p.overlay}
      </div>
    </div>
  );
};
