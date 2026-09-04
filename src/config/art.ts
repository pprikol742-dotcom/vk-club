// Единая карта картинок. Если файла нет — рисуется эмодзи из fallback.
// Пути ведут в public/, поэтому начинаются со слэша.

export type ArtEntry = { src: string; fallback: string };

export const ART = {
  // ---- кнопки панели зала ----
  exit:      { src: '/assets/buttons/exit.png',      fallback: '🚪' },
  decor:     { src: '/assets/buttons/decor.png',     fallback: '♠️' },
  group:     { src: '/assets/buttons/group.png',     fallback: '⬆️' },
  sound_on:  { src: '/assets/buttons/sound_on.png',  fallback: '🔊' },
  sound_off: { src: '/assets/buttons/sound_off.png', fallback: '🔇' },
  clap:      { src: '/assets/buttons/clap.png',      fallback: '👏' },
  edit:      { src: '/assets/buttons/edit.png',      fallback: '✏️' },
  settings:  { src: '/assets/buttons/settings.png',  fallback: '⚙️' },
  help:      { src: '/assets/buttons/help.png',      fallback: '❓' },
  idea:      { src: '/assets/buttons/idea.png',      fallback: '💡' },
  like:      { src: '/assets/buttons/like.png',      fallback: '👍' },

  // ---- значки званий ----
  title_dj:       { src: '/assets/titles/dj.png',       fallback: '🎧' },
  title_generous: { src: '/assets/titles/generous.png', fallback: '👑' },
  title_popular:  { src: '/assets/titles/popular.png',  fallback: '💎' },
  title_owner:    { src: '/assets/titles/owner.png',    fallback: '🏠' },
  title_resident: { src: '/assets/titles/resident.png', fallback: '⭐' },

  // ---- мелочи зала ----
  top_club: { src: '/assets/room/top_club.png', fallback: '🏆' },
  gift:     { src: '/assets/room/gift.png',     fallback: '🎁' },
  lock:     { src: '/assets/room/lock.png',     fallback: '🔒' },

  // ---- магазин ----
  pack_4:   { src: '/assets/shop/pack_4.png',   fallback: '💰' },
} satisfies Record<string, ArtEntry>;

export type ArtName = keyof typeof ART;

// звание -> картинка, для ClubberAvatar и строк в чате
export const TITLE_ART: Record<string, ArtName> = {
  DJ: 'title_dj',
  ЩЕДРЫЙ: 'title_generous',
  ПОПУЛЯРНЫЙ: 'title_popular',
  ХОЗЯИН: 'title_owner',
  РЕЗИДЕНТ: 'title_resident',
};
