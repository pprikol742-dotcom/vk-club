import React from 'react';

/**
 * Вывеска над сценой — название сообщества ВК, на основе которого создан клуб.
 * Длинные названия ужимаются по буквам, чтобы не вылезать за рамку.
 */
export const NeonSign: React.FC<{
  text: string;
  color: string;
  glow: string;
  /** мерцание можно выключить в настройках эффектов */
  flicker?: boolean;
  style?: React.CSSProperties;
}> = ({ text, color, glow, flicker = true, style }) => {
  const len = text.trim().length;
  const size = len <= 10 ? 30 : len <= 16 ? 24 : len <= 24 ? 19 : 15;

  return (
    <div
      className={'neon-sign' + (flicker ? ' neon-sign--flicker' : '')}
      style={{
        ...style,
        ['--sign-color' as any]: color,
        ['--sign-glow' as any]: glow,
      }}
    >
      <span className="neon-sign__text" style={{ fontSize: size }}>{text}</span>
    </div>
  );
};
