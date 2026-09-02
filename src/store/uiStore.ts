import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TunableKey } from '../config/clubTheme';

export type ModalId = 'gift' | 'queue' | 'trackResult' | 'clubGroup' | 'help' | 'shop' | null;

/** Каждый эффект зала гасится отдельно — свет в клубе на любителя. */
export interface FxSettings {
  /** мерцание вывески */
  signFlicker: boolean;
  /** вращающийся зеркальный шар */
  discoBall: boolean;
  /** цветные лучи от шара */
  beams: boolean;
  /** дым над сценой */
  smoke: boolean;
  /** гирлянда лампочек по краю сцены */
  bulbs: boolean;
  /** пульсация неоновых лент на стенах */
  wallNeon: boolean;
  /** блики на полу */
  floorLights: boolean;
  /** аватарки подпрыгивают */
  dance: boolean;
}

export const FX_LABELS: Record<keyof FxSettings, string> = {
  signFlicker: 'Мерцание вывески',
  discoBall: 'Зеркальный шар',
  beams: 'Лучи света',
  smoke: 'Дым',
  bulbs: 'Гирлянда',
  wallNeon: 'Неон на стенах',
  floorLights: 'Блики на полу',
  dance: 'Танцующие аватарки',
};

const FX_DEFAULT: FxSettings = {
  signFlicker: true,
  discoBall: true,
  beams: true,
  smoke: true,
  bulbs: true,
  wallNeon: true,
  floorLights: true,
  dance: true,
};

/** Поправки к раскладке, которые крутятся прямо в игре. */
export type LayoutTweak = Partial<Record<TunableKey, { x?: number; y?: number; w?: number }>>;

interface UiState {
  modal: ModalId;
  muted: boolean;
  fx: FxSettings;
  fxMenuOpen: boolean;
  tunerOpen: boolean;
  tweak: LayoutTweak;
  avatarSize: number;
  lastResult: null | {
    artist: string;
    title: string;
    likes: number;
    dislikes: number;
    gifts: number;
    points: number;
    clubName: string;
  };
  open: (m: Exclude<ModalId, null>) => void;
  close: () => void;
  toggleMute: () => void;
  toggleFx: (key: keyof FxSettings) => void;
  setAllFx: (on: boolean) => void;
  toggleFxMenu: () => void;
  toggleTuner: () => void;
  setTweak: (key: TunableKey, patch: { x?: number; y?: number; w?: number }) => void;
  resetTweak: () => void;
  setAvatarSize: (px: number) => void;
  showResult: (r: UiState['lastResult']) => void;
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      modal: null,
      muted: false,
      fx: FX_DEFAULT,
      fxMenuOpen: false,
      tunerOpen: false,
      tweak: {},
      avatarSize: 66,
      lastResult: null,
      open: (m) => set({ modal: m }),
      close: () => set({ modal: null }),
      toggleMute: () => set((s) => ({ muted: !s.muted })),
      toggleFx: (key) => set((s) => ({ fx: { ...s.fx, [key]: !s.fx[key] } })),
      setAllFx: (on) =>
        set(() => ({
          fx: Object.fromEntries(
            Object.keys(FX_DEFAULT).map((k) => [k, on]),
          ) as unknown as FxSettings,
        })),
      toggleFxMenu: () => set((s) => ({ fxMenuOpen: !s.fxMenuOpen })),
      toggleTuner: () => set((s) => ({ tunerOpen: !s.tunerOpen })),
      setTweak: (key, patch) =>
        set((s) => ({ tweak: { ...s.tweak, [key]: { ...s.tweak[key], ...patch } } })),
      resetTweak: () => set({ tweak: {}, avatarSize: 66 }),
      setAvatarSize: (px) => set({ avatarSize: px }),
      showResult: (r) => set({ lastResult: r, modal: 'trackResult' }),
    }),
    {
      name: 'club-ui',
      // между сессиями храним только настройки света и звука
      partialize: (s) => ({ fx: s.fx, muted: s.muted, tweak: s.tweak, avatarSize: s.avatarSize }),
    },
  ),
);
