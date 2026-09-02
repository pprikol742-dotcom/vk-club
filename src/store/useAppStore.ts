import { create } from "zustand";
import type { ChatMessage, Club, ClubSession, GiftEvent, Profile } from "../lib/types";

interface AppState {
  profile: Profile | null;
  club: Club | null;
  session: ClubSession | null;
  chatMessages: ChatMessage[];
  // vk_id -> включена ли у него светомузыка (личный прожектор). Транслируется через
  // Supabase Realtime presence, а не хранится в БД — это чисто визуальное состояние.
  lightShowByVkId: Record<number, boolean>;
  resonanceActive: boolean;
  // Подарки, которые сейчас видно в комнате (летят/дымят/лежат у DJ).
  // Живут не дольше 60 секунд — см. addActiveGift.
  activeGifts: GiftEvent[];

  setProfile: (p: Profile | null) => void;
  setClub: (c: Club | null) => void;
  setSession: (s: ClubSession | null) => void;
  addChatMessage: (m: ChatMessage) => void;
  setLightShow: (vkId: number, on: boolean) => void;
  triggerResonance: () => void;
  addCoins: (delta: number) => void;
  addActiveGift: (g: GiftEvent) => void;
  removeActiveGift: (id: string) => void;
}

const GIFT_LIFETIME_MS = 60_000;

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  club: null,
  session: null,
  chatMessages: [],
  lightShowByVkId: {},
  resonanceActive: false,
  activeGifts: [],

  setProfile: (profile) => set({ profile }),
  setClub: (club) => set({ club }),
  setSession: (session) => set({ session }),
  addChatMessage: (m) =>
    set((s) => ({ chatMessages: [...s.chatMessages.slice(-199), m] })),
  setLightShow: (vkId, on) =>
    set((s) => ({ lightShowByVkId: { ...s.lightShowByVkId, [vkId]: on } })),
  triggerResonance: () => {
    set({ resonanceActive: true });
    setTimeout(() => set({ resonanceActive: false }), 2500);
  },
  addCoins: (delta) =>
    set((s) => (s.profile ? { profile: { ...s.profile, coins: s.profile.coins + delta } } : {})),
  addActiveGift: (g) => {
    set((s) => ({ activeGifts: [...s.activeGifts, g] }));
    // подарок сам себя убирает максимум через минуту — не нужно хранить историю в UI
    setTimeout(() => {
      set((s) => ({ activeGifts: s.activeGifts.filter((x) => x.id !== g.id) }));
    }, GIFT_LIFETIME_MS);
  },
  removeActiveGift: (id) =>
    set((s) => ({ activeGifts: s.activeGifts.filter((x) => x.id !== id) })),
}));

