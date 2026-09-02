// Дублирует icon-поле из supabase/schema.sql (category player/dj) — нужно
// для мгновенного рендера картинок в кнопках и в GiftFxLayer без похода в БД.
export const GIFT_ICONS: Record<string, string> = {
  ice_cream: "ice_cream.png",
  chocolate: "chocolate.png",
  cigar: "cigar.png",
  hookah: "hookah.png",
  wine_glass: "wine_glass.png",
  cognac_glass: "cognac_glass.png",
  beer_bottle: "beer_bottle.png",
  coffee: "coffee.png",
  chifir: "chifir.png",
  raspberry: "raspberry.png",
  kiss: "kiss.png",
  heart: "heart.png",
  snowball: "snowball.png",
  rotten_tomato: "rotten_tomato.png",
  egg: "egg.png",
};

export function giftIconUrl(giftId: string): string | null {
  const file = GIFT_ICONS[giftId];
  return file ? `${import.meta.env.BASE_URL}assets/gifts/${file}` : null;
}

export function splatIconUrl(giftId: "rotten_tomato" | "egg"): string {
  const file = giftId === "rotten_tomato" ? "tomato_splat.png" : "egg_splat.png";
  return `${import.meta.env.BASE_URL}assets/gifts/${file}`;
}

export function founderBadgeUrl(rank: number): string | null {
  if (rank < 1 || rank > 3) return null;
  return `${import.meta.env.BASE_URL}assets/badges/badge_${rank}.png`;
}

export function clubBackgroundUrl(): string {
  return `${import.meta.env.BASE_URL}assets/bg/club_background.png`;
}
