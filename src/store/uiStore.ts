import { create } from 'zustand';

export type ModalId =
  | 'gift'
  | 'queue'
  | 'trackResult'
  | 'clubGroup'
  | 'help'
  | 'shop'
  | null;

interface UiState {
  modal: ModalId;
  muted: boolean;
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
  showResult: (r: UiState['lastResult']) => void;
}

export const useUi = create<UiState>((set) => ({
  modal: null,
  muted: false,
  lastResult: null,
  open: (m) => set({ modal: m }),
  close: () => set({ modal: null }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  showResult: (r) => set({ lastResult: r, modal: 'trackResult' }),
}));
