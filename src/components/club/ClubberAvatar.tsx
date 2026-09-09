import React, { useRef, useState } from 'react';
import { TITLES, type TitleId } from '../../config/titles';
import { frameOf, FRAME_TITLE, canGift, type ClubRole, type Gender } from '../../config/frames';
import { Icon, ICONS } from '../ui/Icon';

export interface Clubber {
  id: string;
  name: string;
  photo: string;
  gender: Gender;
  role: ClubRole;
  /** первый в недельном ТОПе клуба — красная рамка */
  isTopLeader?: boolean;
  /** звание — значок над аватаром */
  title?: TitleId | null;
  /** хозяин в «гареме» */
  ownerName?: string | null;
}

interface Props {
  clubber: Clubber;
  /** поднятая рука: лайк или дизлайк, живёт пару секунд */
  reaction?: { kind: 'up' | 'down'; skin: string | null } | null;
  /** танцует до конца текущего трека — ставится лайком */
  dancing?: boolean;
  x: number;
  y: number;
  delay?: number;
  /** это сам игрок */
  isSelf?: boolean;
  onOpenProfile: (id: string) => void;
  onGift: (id: string) => void;
}

export const ClubberAvatar: React.FC<Props> = ({
  clubber, x, y, delay = 0, isSelf, reaction, dancing, onOpenProfile, onGift,
}) => {
  // Короткое нажатие сразу открывает выбор подарков.
  // Долгое (или правая кнопка) раскрывает обычное меню с профилем.
  const [open, setOpen] = useState(false);
  const longPress = useRef<number | null>(null);
  const wasLong = useRef(false);
  const frame = frameOf(clubber);

  const startPress = () => {
    wasLong.current = false;
    longPress.current = window.setTimeout(() => {
      wasLong.current = true;
      setOpen(true);
    }, 450);
  };

  const endPress = () => {
    if (longPress.current !== null) {
      clearTimeout(longPress.current);
      longPress.current = null;
    }
  };

  /** Тап по аватарке: подарок сразу, без промежуточного меню. */
  const tap = () => {
    endPress();
    if (wasLong.current || open) return;
    if (canGift(!!isSelf)) onGift(clubber.id);
    else onOpenProfile(clubber.id);
  };

  const hint = [
    clubber.name,
    FRAME_TITLE[frame],
    clubber.ownerName ? `хозяин: ${clubber.ownerName}` : '',
  ].filter(Boolean).join(' — ');

  return (
    <div
      data-vk={clubber.id}
      className={
        'clubber-slot' +
        (open ? ' is-open' : '') +
        (dancing ? ' is-dancing' : '')
      }
      style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s` }}
      title={hint}
      onMouseLeave={() => { setOpen(false); endPress(); }}
      onPointerDown={startPress}
      onPointerUp={tap}
      onPointerCancel={endPress}
      onContextMenu={(e) => { e.preventDefault(); setOpen(true); }}
    >
      {clubber.title && <span className="clubber__crown">{TITLES[clubber.title].icon}</span>}

      {reaction && (
        <span className={'clubber__hand clubber__hand--' + reaction.kind}>
          {reaction.skin ? (
            <img src={reaction.skin} alt="" />
          ) : (
            <Icon
              src={reaction.kind === 'up' ? ICONS.like : ICONS.dislike}
              fallback={reaction.kind === 'up' ? '👍' : '👎'}
            />
          )}
        </span>
      )}

      {clubber.photo ? (
        <img
          className={`clubber clubber--${frame}`}
          src={clubber.photo}
          alt={clubber.name}
        />
      ) : (
        <div
          className={`clubber clubber--${frame} clubber--letter`}
        >
          {clubber.name.trim().charAt(0).toUpperCase() || '?'}
        </div>
      )}

      <div className="clubber__actions">
        {canGift(!!isSelf) && (
          <button
            className="clubber__act"
            title={`Подарить подарок: ${clubber.name}`}
            onClick={(e) => { e.stopPropagation(); setOpen(false); onGift(clubber.id); }}
          >
            🎁
          </button>
        )}
        <button
          className="clubber__act"
          title={`Профиль: ${clubber.name}`}
          onClick={(e) => { e.stopPropagation(); setOpen(false); onOpenProfile(clubber.id); }}
        >
          👤
        </button>
      </div>
    </div>
  );
};
