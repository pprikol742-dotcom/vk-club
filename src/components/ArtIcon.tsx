import { useState } from 'react';
import { ART, ArtName } from '../config/art';

type Props = {
  name: ArtName;
  size?: number;
  onClick?: () => void;
  title?: string;
  className?: string;
  dim?: boolean;      // приглушить (например заблокированная кнопка)
  glow?: boolean;     // добавить неоновое свечение под картинку
};

/**
 * Универсальная иконка. Пока картинки нет — показывает эмодзи,
 * поэтому игра не ломается ни на одном этапе.
 */
export default function ArtIcon({
  name, size = 44, onClick, title, className = '', dim, glow,
}: Props) {
  const entry = ART[name];
  const [broken, setBroken] = useState(false);

  const box: React.CSSProperties = {
    width: size,
    height: size,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    cursor: onClick ? 'pointer' : undefined,
    opacity: dim ? 0.45 : 1,
    filter: glow ? 'drop-shadow(0 0 8px rgba(168,85,247,.75))' : undefined,
    transition: 'transform .12s ease, opacity .12s ease',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    flexShrink: 0,
  };

  if (broken) {
    return (
      <span
        className={className}
        style={{ ...box, fontSize: size * 0.78 }}
        onClick={onClick}
        title={title}
        role={onClick ? 'button' : undefined}
      >
        {entry.fallback}
      </span>
    );
  }

  return (
    <img
      className={className}
      src={entry.src}
      alt={title ?? name}
      title={title}
      draggable={false}
      onError={() => setBroken(true)}
      onClick={onClick}
      style={{ ...box, objectFit: 'contain' }}
      role={onClick ? 'button' : undefined}
    />
  );
}
