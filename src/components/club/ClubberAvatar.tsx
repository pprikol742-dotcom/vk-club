import React, { useState } from 'react';
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
  /** поднятая рука: лайк или дизлайк */
  reaction?: { kind: 'up' | 'down'; skin: string | null } | null;
  x: number;
  y: number;
  delay?: number;
  /** это сам игрок */
  isSelf?: boolean;
  onOpenProfile: (id: string) => void;
  onGift: (id: string) => void;
}

export const ClubberAvatar: React.FC<Props> = ({
  clubber, x, y, delay = 0, isSelf, reaction, onOpenProfile, onGift,
}) => {
  // на десктопе — ховер, на телефоне — тап по аватарке раскрывает иконки
  const [open, setOpen] = useState(false);
  const frame = frameOf(clubber);

  const hint = [
    clubber.name,
    FRAME_TITLE[frame],
    clubber.ownerName ? `хозяин: ${clubber.ownerName}` : '',
  ].filter(Boolean).join(' — ');

  return (
    <div
      className={
        'clubber-slot' +
        (open ? ' is-open' : '') +
        (reaction?.kind === 'up' ? ' is-dancing' : '')
      }
      style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s` }}
      title={hint}
      onMouseLeave={() => setOpen(false)}
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
          onClick={() => setOpen((s) => !s)}
        />
      ) : (
        <div
          className={`clubber clubber--${frame} clubber--letter`}
          onClick={() => setOpen((s) => !s)}
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
