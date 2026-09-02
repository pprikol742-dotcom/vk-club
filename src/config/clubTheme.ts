// Темы клубов. Фон — то самое сгенерированное изображение.
// Кладём файлы в public/assets/rooms/ и меняем путь здесь.

export type RoomId = 'neon' | 'disco8090' | 'dance' | 'ivetta';

export interface RoomTheme {
  id: RoomId;
  title: string;
  /** фон сцены (полное изображение комнаты: стены, пол, колонки, пульт) */
  background: string;
  /** цвет неоновой подсветки для свечения UI-элементов */
  neon: string;
  neonSoft: string;
  /** цвет вывески на стене (если рисуем текстом, а не на картинке) */
  signColor: string;
}

export const ROOMS: Record<RoomId, RoomTheme> = {
  neon: {
    id: 'neon',
    title: 'В Клубе',
    background: '/assets/rooms/club-neon.png', // <-- наш сгенерированный фон
    neon: '#c14bff',
    neonSoft: 'rgba(193,75,255,.45)',
    signColor: '#ff6ad5',
  },
  disco8090: {
    id: 'disco8090',
    title: 'ДИСКО ХИТЫ 80-90',
    background: '/assets/rooms/club-disco.png',
    neon: '#b04cff',
    neonSoft: 'rgba(176,76,255,.45)',
    signColor: '#e9a6ff',
  },
  dance: {
    id: 'dance',
    title: 'Dance Music Only',
    background: '/assets/rooms/club-dance.png',
    neon: '#00d8ff',
    neonSoft: 'rgba(0,216,255,.4)',
    signColor: '#9be8ff',
  },
  ivetta: {
    id: 'ivetta',
    title: 'Ivetta Club',
    background: '/assets/rooms/club-ivetta.png',
    neon: '#ff4bd8',
    neonSoft: 'rgba(255,75,216,.45)',
    signColor: '#ff9de2',
  },
};

/**
 * Раскладка сцены в процентах от контейнера — фон масштабируется,
 * элементы едут вместе с ним на любом экране.
 */
export const LAYOUT = {
  /** пропорция комнаты (ширина/высота) — под наш фон */
  aspect: 565 / 545,

  actionBar: { left: '2%', top: '3%' },       // ВЫХОД + иконки
  coins: { right: '5%', top: '4%' },           // монеты
  topBadge: { right: '0%', top: '2%' },        // ТОП КЛУБА
  player: { left: '13%', top: '22%', width: '58%' }, // окно трека
  djSlot: { left: '50%', top: '43%' },         // аватар DJ за пультом
  djButton: { left: '31%', top: '44%' },       // "Стать DJ" / "Ты 1"
  danceFloor: { left: '2%', top: '60%', width: '96%', height: '38%' },
  giftSpot: { left: '33%', top: '52%' },       // угощение возле пульта
  decorSlot: { right: '10%', top: '25%' },     // гитара/декор на стене
} as const;

/** Позиции клабберов на танцполе (проценты внутри danceFloor) */
export const CROWD_SLOTS = [
  { x: 4, y: 46 }, { x: 14, y: 62 }, { x: 24, y: 30 }, { x: 34, y: 58 },
  { x: 44, y: 22 }, { x: 52, y: 66 }, { x: 62, y: 34 }, { x: 72, y: 60 },
  { x: 80, y: 24 }, { x: 88, y: 54 }, { x: 18, y: 12 }, { x: 58, y: 8 },
  { x: 30, y: 84 }, { x: 66, y: 86 }, { x: 8, y: 22 }, { x: 92, y: 82 },
];
