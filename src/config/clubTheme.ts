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
  /** пропорция фона зала 807×450 */
  aspect: 807 / 450,

  actionBar: { left: '1.5%', top: '2.5%' },
  coins:     { right: '4%',  top: '3.5%' },
  topBadge:  { right: '0%',  top: '1.5%' },

  /** вывеска ложится ровно внутрь неоновой рамки на фоне */
  sign:      { left: '50%', top: '18%', width: '36%' },
  /** зеркальный шар нарисован на фоне — сюда крепим лучи */
  discoBall: { left: '50%', top: '45%' },
  /** окно трека — компактное, под вывеской */
  player:    { left: '25%', top: '33%', width: '50%' },
  /** диджей стоит за пультом */
  djSlot:    { left: '50%', top: '58%' },
  djButton:  { left: '24%', top: '62%' },
  /** угощение у края сцены */
  giftSpot:  { left: '35%', top: '72%' },
  decorSlot: { right: '9%', top: '30%' },
  /** танцпол перед сценой */
  danceFloor:{ left: '2%', top: '70%', width: '96%', height: '30%' },
} as const;

/** Позиции клабберов на танцполе (проценты внутри danceFloor) */
export const CROWD_SLOTS = [
  { x: 8,  y: 55 }, { x: 21, y: 78 }, { x: 34, y: 52 }, { x: 47, y: 80 },
  { x: 60, y: 54 }, { x: 73, y: 80 }, { x: 86, y: 54 }, { x: 95, y: 78 },
  { x: 14, y: 30 }, { x: 40, y: 28 }, { x: 66, y: 28 }, { x: 90, y: 30 },
];

/** Ключи, которые можно двигать в режиме настройки раскладки. */
export const TUNABLE = ['sign', 'player', 'djSlot', 'djButton', 'danceFloor', 'giftSpot'] as const;
export type TunableKey = typeof TUNABLE[number];

export const TUNABLE_LABELS: Record<TunableKey, string> = {
  sign: 'Вывеска',
  player: 'Окно трека',
  djSlot: 'Диджей',
  djButton: 'Кнопка «Стать DJ»',
  danceFloor: 'Танцпол',
  giftSpot: 'Угощение',
};
