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
  /** пропорция фона зала */
  aspect: 807 / 398,

  actionBar: { left: '1.5%', top: '3%' },
  coins:     { right: '4%',  top: '4%' },
  topBadge:  { right: '0%',  top: '2%' },

  /** неоновая вывеска с названием паблика — над сценой */
  sign:      { left: '50%', top: '15%', width: '44%' },
  /** зеркальный шар */
  discoBall: { left: '49.5%', top: '38%' },
  /** окно трека */
  player:    { left: '24%', top: '33%', width: '52%' },
  /** диджей за пультом */
  djSlot:    { left: '50%', top: '55%' },
  djButton:  { left: '26%', top: '57%' },
  /** угощение возле пульта */
  giftSpot:  { left: '36%', top: '66%' },
  /** декор на стене */
  decorSlot: { right: '11%', top: '20%' },
  /** танцпол */
  danceFloor:{ left: '2%', top: '74%', width: '96%', height: '24%' },
} as const;

/** Позиции клабберов на танцполе (проценты внутри danceFloor) */
export const CROWD_SLOTS = [
  { x: 6, y: 40 },  { x: 16, y: 70 }, { x: 26, y: 28 }, { x: 36, y: 62 },
  { x: 46, y: 34 }, { x: 56, y: 72 }, { x: 66, y: 30 }, { x: 76, y: 64 },
  { x: 86, y: 36 }, { x: 94, y: 70 }, { x: 11, y: 12 }, { x: 31, y: 92 },
  { x: 51, y: 10 }, { x: 71, y: 94 }, { x: 91, y: 12 }, { x: 41, y: 8 },
];
