import React, { useState } from 'react';

const base = import.meta.env.BASE_URL;

/** Картинки интерфейса. Файла нет — покажется эмодзи-заглушка. */
export const ICONS = {
  like: `${base}assets/hands/like.png`,
  dislike: `${base}assets/hands/dislike.png`,
  coin: `${base}assets/shop/coin.png`,
} as const;

/** Пакеты монет: pack_1…pack_4 */
export const PACK_ICONS: Record<string, string> = {
  coins_50: `${base}assets/shop/pack_1.png`,
  coins_120: `${base}assets/shop/pack_2.png`,
  coins_350: `${base}assets/shop/pack_3.png`,
  coins_800: `${base}assets/shop/pack_4.png`,
};

/**
 * Иконка с запасным символом: пока картинка не положена,
 * вместо битого изображения показывается эмодзи.
 */
export const Icon: React.FC<{
  src: string;
  fallback: string;
  className?: string;
  alt?: string;
}> = ({ src, fallback, className, alt = '' }) => {
  const [failed, setFailed] = useState(false);

  if (failed) return <span className={className}>{fallback}</span>;

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
};
