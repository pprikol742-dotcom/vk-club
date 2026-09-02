// Звания, которые выдаются автоматически и падают системным сообщением в чат.

export type TitleId = 'dj' | 'generous' | 'popular' | 'owner' | 'resident';

export interface ClubTitle {
  id: TitleId;
  label: string;
  icon: string;
  /** цвет системной строки в чате */
  color: string;
  /** условие получения — для текста подсказки */
  hint: string;
}

export const TITLES: Record<TitleId, ClubTitle> = {
  dj:        { id: 'dj',        label: 'DJ',        icon: '🎧', color: '#6fd8ff', hint: 'Сыграть трек в клубе' },
  generous:  { id: 'generous',  label: 'ЩЕДРЫЙ',    icon: '👑', color: '#ffb524', hint: 'Подарить диджеям 10 угощений' },
  popular:   { id: 'popular',   label: 'ПОПУЛЯРНЫЙ',icon: '💎', color: '#c14bff', hint: 'Собрать 50 лайков за треки' },
  owner:     { id: 'owner',     label: 'ХОЗЯИН',    icon: '🏠', color: '#62d96a', hint: 'Создать свой клуб' },
  resident:  { id: 'resident',  label: 'РЕЗИДЕНТ',  icon: '⭐', color: '#ff8ad1', hint: 'Отыграть 25 треков в одном клубе' },
};

/** Текст системного сообщения: «Casper получил звание ЩЕДРЫЙ». */
export function titleMessage(name: string, title: TitleId, female = false) {
  const t = TITLES[title];
  return `${name} ${female ? 'получила' : 'получил'} звание ${t.label}`;
}
