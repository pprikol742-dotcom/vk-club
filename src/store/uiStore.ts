import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

interface UiState {
  modal: ModalId;
  muted: boolean;
  fx: FxSettings;
  fxMenuOpen: boolean;
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
  showResult: (r: UiState['lastResult']) => void;
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      modal: null,
      muted: false,
      fx: FX_DEFAULT,
      fxMenuOpen: false,
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
      showResult: (r) => set({ lastResult: r, modal: 'trackResult' }),
    }),
    {
      name: 'club-ui',
      // между сессиями храним только настройки света и звука
      partialize: (s) => ({ fx: s.fx, muted: s.muted }),
    },
  ),
);
