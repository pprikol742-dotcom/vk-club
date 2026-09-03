// Темы клубов и раскладка под фон public/assets/bg/club_background.png (807×398).

export type RoomId = 'neon' | 'disco8090' | 'dance' | 'ivetta';

export interface RoomTheme {
  id: RoomId;
  title: string;
  background: string;
  /** основной неон комнаты */
  neon: string;
  neonSoft: string;
  /** цвет вывески с названием клуба */
  signColor: string;
  signGlow: string;
}

// На GitHub Pages сайт живёт в подпапке /vk-club/, поэтому путь строим от BASE_URL.
const BG = `${import.meta.env.BASE_URL}assets/bg/club_background.png`;

export const ROOMS: Record<RoomId, RoomTheme> = {
  neon:      { id: 'neon',      title: 'В Клубе',            background: BG, neon: '#c14bff', neonSoft: 'rgba(193,75,255,.45)', signColor: '#ff3ec8', signGlow: 'rgba(255,62,200,.85)' },
  disco8090: { id: 'disco8090', title: 'ДИСКО ХИТЫ 80-90',   background: BG, neon: '#b04cff', neonSoft: 'rgba(176,76,255,.45)', signColor: '#ff6ad5', signGlow: 'rgba(255,106,213,.8)' },
  dance:     { id: 'dance',     title: 'Dance Music Only',   background: BG, neon: '#00d8ff', neonSoft: 'rgba(0,216,255,.40)',  signColor: '#4de2ff', signGlow: 'rgba(77,226,255,.8)' },
  ivetta:    { id: 'ivetta',    title: 'Ivetta Club',        background: BG, neon: '#ff4bd8', neonSoft: 'rgba(255,75,216,.45)', signColor: '#ff8ae0', signGlow: 'rgba(255,138,224,.8)' },
};

/** Всё в процентах от сцены — раскладка едет вместе с фоном на любом экране. */
export const LAYOUT = {
  /** пропорция фона зала 600×450 */
  aspect: 600 / 450,

  actionBar: { left: '1.5%', top: '2.5%' },
  coins:     { right: '4%',  top: '3.5%' },
  topBadge:  { right: '0%',  top: '1.5%' },

  /** вывеска в неоновой рамке */
  sign:      { left: '48.5%', top: '21%', width: '32%' },
  discoBall: { left: '50.3%', top: '41%' },
  player:    { left: '40.5%', top: '32%', width: '45%' },
  djSlot:    { left: '50.5%', top: '43%' },
  djButton:  { left: '52%',   top: '58%' },
  giftSpot:  { left: '33%',   top: '66%' },
  decorSlot: { right: '8%',   top: '25%' },
  danceFloor:{ left: '0%',    top: '58%', width: '96%', height: '40%' },
  /** экран с клипом посреди зала */
  videoScreen:{ left: '50%',  top: '33%', width: '38%' },
} as const;

/** Позиции клабберов на танцполе (проценты внутри danceFloor) */
export const CROWD_SLOTS = [
  { x: 9,  y: 52 }, { x: 23, y: 78 }, { x: 37, y: 50 }, { x: 50, y: 80 },
  { x: 63, y: 50 }, { x: 77, y: 78 }, { x: 90, y: 52 }, { x: 96, y: 26 },
  { x: 16, y: 24 }, { x: 42, y: 22 }, { x: 68, y: 22 }, { x: 4,  y: 26 },
];

/**
 * Каждому клабберу — своё место на танцполе.
 * Слот выбирается по его id, поэтому человек не прыгает по залу
 * при каждом обновлении, и двое не встают в одну точку.
 */
export function assignSlots<T extends { id: string }>(people: T[]) {
  const used = new Set<number>();
  const total = CROWD_SLOTS.length;

  return people.slice(0, total).map((p) => {
    // ровный разброс по номеру: близкие id не липнут друг к другу
    let n = 0;
    for (const ch of p.id) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
    let slot = n % total;

    // место занято — берём ближайшее свободное
    for (let step = 0; step < total && used.has(slot); step++) {
      slot = (slot + 1) % total;
    }
    used.add(slot);

    return { person: p, slot: CROWD_SLOTS[slot], index: slot };
  });
}

/** Ключи, которые можно двигать в режиме настройки раскладки. */
export const TUNABLE = ['sign', 'player', 'djSlot', 'djButton', 'danceFloor', 'giftSpot', 'videoScreen'] as const;
export type TunableKey = typeof TUNABLE[number];

export const TUNABLE_LABELS: Record<TunableKey, string> = {
  sign: 'Вывеска',
  player: 'Окно трека',
  djSlot: 'Диджей',
  djButton: 'Кнопка «Стать DJ»',
  danceFloor: 'Танцпол',
  giftSpot: 'Угощение',
  videoScreen: 'Экран с клипом',
};
