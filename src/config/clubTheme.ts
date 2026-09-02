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

  /** вывеска ложится внутрь неоновой рамки на фоне */
  sign:      { left: '49.7%', top: '14%',   width: '40%' },
  discoBall: { left: '50.8%', top: '34.5%' },
  player:    { left: '27%',   top: '30%',   width: '46%' },
  djSlot:    { left: '50%',   top: '52%' },
  djButton:  { left: '26%',   top: '60%' },
  giftSpot:  { left: '35%',   top: '74%' },
  decorSlot: { right: '9%',   top: '25%' },
  danceFloor:{ left: '2%',    top: '79%',   width: '96%', height: '21%' },
} as const;

/** Позиции клабберов на танцполе (проценты внутри danceFloor) */
export const CROWD_SLOTS = [
  { x: 8,  y: 48 }, { x: 21, y: 76 }, { x: 34, y: 46 }, { x: 47, y: 78 },
  { x: 60, y: 46 }, { x: 73, y: 76 }, { x: 86, y: 48 }, { x: 95, y: 74 },
  { x: 14, y: 20 }, { x: 40, y: 18 }, { x: 66, y: 18 }, { x: 92, y: 20 },
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
