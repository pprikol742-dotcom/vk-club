import React, { useMemo, useState } from 'react';
import { parseVideoUrl, embedWithOffset } from '../../lib/video';

/**
 * Небольшой экран над сценой: пока играет клип, зал смотрит его вместе.
 * Позиция считается от времени старта, поэтому картинка у всех одна.
 */
export const VideoScreen: React.FC<{
  url: string;
  /** сколько секунд клип уже идёт */
  offset: number;
  muted: boolean;
  style?: React.CSSProperties;
}> = ({ url, offset, muted, style }) => {
  const [hidden, setHidden] = useState(false);
  const video = useMemo(() => parseVideoUrl(url), [url]);

  // адрес пересчитываем только при смене клипа, иначе плеер дёргался бы каждую секунду
  const src = useMemo(
    () => (video ? embedWithOffset(video, offset, muted) : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [video?.embed, muted],
  );

  if (!video || hidden) return null;

  return (
    <div className="video-screen" style={style}>
      <button className="video-screen__close" onClick={() => setHidden(true)} title="Скрыть экран">
        ✕
      </button>
      <iframe
        src={src}
        title="Клип"
        frameBorder={0}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};
