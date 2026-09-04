import React from 'react';
import { Icon, ICONS } from '../ui/Icon';

export interface TrackState {
  artist: string;
  title: string;
  position: number;
  duration: number;
  likes: number;
  dislikes: number;
  gifts: number;
  myVote?: 'up' | 'down' | null;
}

interface Props {
  /** null — за пультом никого */
  track: TrackState | null;
  style?: React.CSSProperties;
  /** место игрока в очереди, null — не в очереди */
  queuePosition: number | null;
  /** игрок сам за пультом */
  isDj: boolean;
  onVote: (v: 'up' | 'down') => void;
  onGift: () => void;
  onAdd?: () => void;
  onBecomeDj: () => void;
  onQueue: () => void;
}

const mmss = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
};

export const TrackPlayer: React.FC<Props> = ({
  track, style, queuePosition, isDj, onVote, onGift, onAdd, onBecomeDj, onQueue,
}) => {
  const [added, setAdded] = React.useState(false);
  React.useEffect(() => { setAdded(false); }, [track?.artist, track?.title]);

  const empty = !track;
  const pct = track?.duration ? Math.min(100, (track.position / track.duration) * 100) : 0;

  return (
    <div className={'player' + (empty ? ' player--empty' : '')} style={style}>
      <div className="player__top">
        <span className="player__note">♪</span>

        <div className="player__meta">
          <div className="player__title">{track?.title ?? 'Пульт свободен'}</div>
          <div className="player__artist">{track?.artist ?? 'Вставай за вертушки'}</div>
        </div>

        <div className="player__controls">
          <button
            className="player__btn"
            title="Не нравится"
            disabled={empty || !!track?.myVote}
            onClick={() => onVote('down')}
          >
            <Icon className="player__ico" src={ICONS.dislike} fallback="👎" />
            <i>{track?.dislikes ?? 0}</i>
          </button>
          <button
            className="player__btn"
            title="Нравится"
            disabled={empty || !!track?.myVote}
            onClick={() => onVote('up')}
          >
            <Icon className="player__ico" src={ICONS.like} fallback="👍" />
            <i>{track?.likes ?? 0}</i>
          </button>
          <button className="player__btn" title="Угостить DJ" disabled={empty} onClick={onGift}>
            🍹<i>{track?.gifts ?? 0}</i>
          </button>
          <button
            className={'player__btn player__btn--add' + (added ? ' is-added' : '')}
            title={added ? 'Трек у тебя в плейлисте' : 'Добавить к себе'}
            disabled={empty || added || !onAdd}
            onClick={() => { onAdd?.(); setAdded(true); }}
          >
            {added ? '✓' : '+'}
          </button>

          {/* вместо «плей» — место за пультом */}
          {isDj ? (
            <span className="player__dj player__dj--live" title="Ты за пультом">🎧</span>
          ) : queuePosition === null ? (
            <button className="player__dj" title="Стать диджеем" onClick={onBecomeDj}>
              Стать<br />DJ
            </button>
          ) : (
            <button className="player__dj player__dj--queue" title="Твоя очередь" onClick={onQueue}>
              Ты {queuePosition}
            </button>
          )}
        </div>
      </div>

      <div className="player__bottom">
        <div className="player__bar">
          <div className="player__bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="player__time">
          {mmss(track?.position ?? 0)} <span>/ {mmss(track?.duration ?? 0)}</span>
        </div>
      </div>
    </div>
  );
};
