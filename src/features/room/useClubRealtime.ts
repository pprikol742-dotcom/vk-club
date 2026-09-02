import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAppStore } from "../../store/useAppStore";
import type { ChatMessage, ClubSession, GiftEvent } from "../../lib/types";
import type { Gender, ClubRole } from "../../config/frames";

/** Как игрок представляется в presence-канале. */
export interface PresenceMe {
  vkId: number;
  name: string;
  photo: string;
  gender: Gender;
  role: ClubRole;
}

/** Кто-то в зале прямо сейчас. */
export interface Occupant extends PresenceMe {
  lightOn: boolean;
}

/**
 * Одна realtime-комната на клуб:
 * - Postgres Changes на club_sessions (трек/DJ/лайки), chat_messages и gift_transactions
 * - Presence-канал: кто сейчас в клубе + персональная светомузыка.
 *   Presence в БД не пишем — это чистое UI-состояние.
 */
export function useClubRealtime(clubId: string | null, me: PresenceMe | null) {
  const setSession = useAppStore((s) => s.setSession);
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const setLightShow = useAppStore((s) => s.setLightShow);
  const triggerResonance = useAppStore((s) => s.triggerResonance);
  const addActiveGift = useAppStore((s) => s.addActiveGift);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [occupants, setOccupants] = useState<Occupant[]>([]);
  const myVkId = me?.vkId ?? null;

  useEffect(() => {
    if (!clubId) return;

    const channel = supabase.channel(`club:${clubId}`, {
      config: { presence: { key: String(myVkId ?? "guest") } },
    });
    channelRef.current = channel;

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "club_sessions", filter: `club_id=eq.${clubId}` },
        (payload) => {
          const row = payload.new as ClubSession;
          setSession(row);
          // 100% лайков -> «Резонанс зала»
          const total = (row.likes ?? 0) + (row.dislikes ?? 0);
          if (total > 0 && row.dislikes === 0 && row.likes >= 5) {
            triggerResonance();
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `club_id=eq.${clubId}` },
        (payload) => addChatMessage(payload.new as ChatMessage),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gift_transactions", filter: `club_id=eq.${clubId}` },
        (payload) => {
          const row = payload.new as { id: number; gift_id: string; from_vk_id: number; to_vk_id: number | null };
          // Подарок живёт в комнате максимум 60 сек — таймер стоит внутри addActiveGift.
          addActiveGift({
            id: `${row.id}`,
            gift_id: row.gift_id,
            from_vk_id: row.from_vk_id,
            to_vk_id: row.to_vk_id,
            created_at: Date.now(),
          } as GiftEvent);
        },
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<Partial<Occupant> & { light_show?: boolean }>();
        const list: Occupant[] = [];

        for (const [key, metas] of Object.entries(state)) {
          const vkId = Number(key);
          if (!Number.isFinite(vkId)) continue;

          const meta = metas[metas.length - 1] ?? {};
          const lightOn = metas.some((m) => m.light_show);
          setLightShow(vkId, lightOn);

          list.push({
            vkId,
            name: meta.name ?? `id${vkId}`,
            photo: meta.photo ?? "",
            gender: (meta.gender as Gender) ?? "m",
            role: (meta.role as ClubRole) ?? "member",
            lightOn,
          });
        }

        setOccupants(list);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && me) {
          await channel.track({
            light_show: true,
            name: me.name,
            photo: me.photo,
            gender: me.gender,
            role: me.role,
          });
        }
      });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setOccupants([]);
    };
    // me передаём распакованным, чтобы не пересоздавать канал на каждый рендер
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, myVkId, me?.name, me?.photo, me?.gender, me?.role]);

  /** Переключить свою личную светомузыку — кнопка в верхней панели. */
  const toggleMyLightShow = useCallback(
    (on: boolean) => {
      if (!me) return;
      channelRef.current?.track({
        light_show: on,
        name: me.name,
        photo: me.photo,
        gender: me.gender,
        role: me.role,
      });
      setLightShow(me.vkId, on);
    },
    [me, setLightShow],
  );

  return { toggleMyLightShow, occupants };
}
