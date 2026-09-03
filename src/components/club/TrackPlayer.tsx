import React from 'react';

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
  /** null — за пультом никого, плеер пустой */
  track: TrackState | null;
  style?: React.CSSProperties;
  onVote: (v: 'up' | 'down') => void;
  onGift: () => void;
  /** добавить трек в свой плейлист */
  onAdd?: () => void;
}

const fmtLeft = (pos: number, dur: number) => {
  const left = Math.max(0, dur - pos);
  const m = Math.floor(left / 60);
  const s = Math.floor(left % 60).toString().padStart(2, '0');
  return `-${m}.${s}`;
};

export const TrackPlayer: React.FC<Props> = ({ track, style, onVote, onGift, onAdd }) => {
  const [added, setAdded] = React.useState(false);
  const empty = !track;
  React.useEffect(() => { setAdded(false); }, [track?.artist, track?.title]);
  const pct = track && track.duration ? Math.min(100, (track.position / track.duration) * 100) : 0;

  return (
    <div className={'player' + (empty ? ' player--empty' : '')} style={style}>
      <button
        className="player__vote player__vote--down"
        disabled={empty || !!track?.myVote}
        onClick={() => onVote('down')}
        title="Не нравится"
      >
        <span>👎</span>
        <span>{track?.dislikes ?? 0}</span>
      </button>

      <div className="player__body">
        {empty ? (
          <div className="player__idle" />
        ) : (
          <>
            <div className="player__artist">
              <span className="player__name">{track!.artist}</span>
              <button
                className={'player__add' + (added ? ' is-added' : '')}
                title={added ? 'Трек у тебя в плейлисте' : 'Добавить к себе'}
                disabled={added || !onAdd}
                onClick={() => { onAdd?.(); setAdded(true); }}
              >
                {added ? '✓' : '+'}
              </button>
            </div>
            <div className="player__title">{track!.title}</div>
            <div className="player__bar">
              <div className="player__bar-fill" style={{ width: `${pct}%` }} />
              <span className="player__time">{fmtLeft(track!.position, track!.duration)}</span>
            </div>
          </>
        )}
      </div>

      <button
        className="player__vote player__vote--up"
        disabled={empty || !!track?.myVote}
        onClick={() => onVote('up')}
        title="Нравится"
      >
        <span>👍</span>
        <span>{track?.likes ?? 0}</span>
      </button>

      <button
        className="player__vote player__vote--gift"
        disabled={empty}
        onClick={onGift}
        title="Угостить DJ"
      >
        <span>🍹</span>
        <span>{track?.gifts ?? 0}</span>
      </button>
    </div>
  );
};
