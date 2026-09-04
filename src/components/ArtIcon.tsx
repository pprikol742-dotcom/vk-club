import { useState } from 'react';
import { ART } from '../config/art';
import type { ArtName } from '../config/art';

type Props = {
  name: ArtName;
  size?: number;
  onClick?: () => void;
  title?: string;
  className?: string;
  dim?: boolean;      // РїСЂРёРіР»СѓС€РёС‚СЊ (РЅР°РїСЂРёРјРµСЂ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅРЅР°СЏ РєРЅРѕРїРєР°)
  glow?: boolean;     // РґРѕР±Р°РІРёС‚СЊ РЅРµРѕРЅРѕРІРѕРµ СЃРІРµС‡РµРЅРёРµ РїРѕРґ РєР°СЂС‚РёРЅРєСѓ
};

/**
 * РЈРЅРёРІРµСЂСЃР°Р»СЊРЅР°СЏ РёРєРѕРЅРєР°. РџРѕРєР° РєР°СЂС‚РёРЅРєРё РЅРµС‚ вЂ” РїРѕРєР°Р·С‹РІР°РµС‚ СЌРјРѕРґР·Рё,
 * РїРѕСЌС‚РѕРјСѓ РёРіСЂР° РЅРµ Р»РѕРјР°РµС‚СЃСЏ РЅРё РЅР° РѕРґРЅРѕРј СЌС‚Р°РїРµ.
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

