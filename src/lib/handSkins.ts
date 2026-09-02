// Дублирует id/icon строки category='hand_skin' из supabase/schema.sql —
// нужно только для мгновенного рендера бейджа текущей руки без похода в БД.
// Если добавляешь новую руку в схему — добавь и сюда.
export const HAND_SKIN_ICONS: Record<string, string> = {
  standard: "",
  rocker: "hand_rocker.png",
  lady: "hand_lady.png",
  muzhik: "hand_muzhik.png",
  vader: "hand_vader.png",
  zombie_1: "hand_zombie_1.png",
  zombie_2: "hand_zombie_2.png",
  cyborg: "hand_cyborg.png",
  arestant: "hand_arestant.png",
};

export function handSkinIconUrl(handSkinId: string): string | null {
  const file = HAND_SKIN_ICONS[handSkinId];
  return file ? `${import.meta.env.BASE_URL}assets/hands/${file}` : null;
}
