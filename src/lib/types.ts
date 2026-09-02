export interface VkLaunchParams {
  vk_user_id: string;
  vk_app_id: string;
  sign: string;
  vk_group_id?: string;
  [key: string]: string | undefined;
}

export interface Profile {
  vk_id: number;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  coins: number;
  hand_skin: string;
  owned_hand_skins: string[];
  daily_streak: number;
  last_daily_claim_at: string | null;
  founder_rank: number | null;
}

export interface Club {
  id: string;
  vk_group_id: number;
  name: string;
  owner_vk_id: number;
  theme: string;
  light_show_default: boolean;
  is_featured: boolean;
}

export interface ClubSession {
  club_id: string;
  dj_vk_id: number | null;
  track_title: string | null;
  track_artist: string | null;
  track_source: "user_upload" | "library" | null;
  track_url: string | null;
  track_duration_sec: number | null;
  track_started_at: string | null;
  likes: number;
  dislikes: number;
}

export interface ChatMessage {
  id: number;
  club_id: string;
  vk_id: number;
  reply_to_vk_id: number | null;
  message: string;
  created_at: string;
}

export interface GiftEvent {
  id: string;
  gift_id: string;
  from_vk_id: number;
  to_vk_id: number | null;
  created_at: number; // client-side timestamp (Date.now()), не из БД — для отсчёта 60 сек
}

export interface GiftCatalogItem {
  id: string;
  category: "player" | "dj" | "decoration" | "hand_skin";
  name: string;
  icon: string;
  price: number;
}
