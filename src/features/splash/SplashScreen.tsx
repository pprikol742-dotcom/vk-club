import React from 'react';
import '../../styles/splash.css';

const BG = `${import.meta.env.BASE_URL}assets/bg/splash.png`;

interface Props {
  /** 0..100 — если не передать, полоса просто ползёт сама */
  progress?: number;
  /** что грузим прямо сейчас */
  message?: string;
  /** текст ошибки вместо полосы */
  error?: string | null;
  [key: string]: unknown;
}

/**
 * Фон вписывается по ширине и обрезается сверху/снизу, поэтому
 * сцена всегда видна целиком и картинка не сплющивается.
 */
export const SplashScreen: React.FC<Props> = ({ progress, message, error }) => (
  <div className="splash" style={{ backgroundImage: `url(${BG})` }}>
    <div className="splash__veil" />

    <div className="splash__logo">
      <span className="splash__logo-text">В Клубе</span>
    </div>

    <div className="splash__rate">
      Ставь 5!
      <span>★★★★★</span>
    </div>

    {/* лайки, летящие вверх */}
    <div className="splash__likes" aria-hidden>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className={`splash__like splash__like--${i + 1}`}>👍</span>
      ))}
    </div>

    <div className="splash__bottom">
      {error ? (
        <div className="splash__error">{error}</div>
      ) : (
        <>
          <div className="splash__bar">
            <div
              className={'splash__bar-fill' + (progress === undefined ? ' is-auto' : '')}
              style={progress === undefined ? undefined : { width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          {message && <div className="splash__msg">{message}</div>}
        </>
      )}
    </div>
  </div>
);

export default SplashScreen;
