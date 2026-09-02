import { useEffect, useState } from "react";
import { supabase, callEdgeFunction } from "../../lib/supabase";
import { getLaunchParams } from "../../lib/vkBridge";
import { useAppStore } from "../../store/useAppStore";
import type { GiftCatalogItem } from "../../lib/types";

export function HandSkinShop({ onClose }: { onClose: () => void }) {
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const addCoins = useAppStore((s) => s.addCoins);

  const [skins, setSkins] = useState<GiftCatalogItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("gifts_catalog")
      .select("*")
      .eq("category", "hand_skin")
      .order("price", { ascending: true })
      .then(({ data }) => setSkins((data ?? []) as GiftCatalogItem[]));
  }, []);

  async function equip(skin: GiftCatalogItem) {
    if (!profile) return;
    setBusyId(skin.id);
    setError(null);
    try {
      const owned = profile.owned_hand_skins.includes(skin.id);
      if (!owned) {
        const res = await callEdgeFunction<{ spent: number }>("gift-action", {
          launchParams: getLaunchParams(),
          club_id: null,
          gift_id: skin.id,
        });
        addCoins(-res.spent);
        setProfile({
          ...profile,
          owned_hand_skins: [...profile.owned_hand_skins, skin.id],
          hand_skin: skin.id,
        });
      } else {
        // уже куплен — просто переключаем без похода в edge function
        setProfile({ ...profile, hand_skin: skin.id });
        // всё равно синхронизируем с сервером (бесплатно, priceToCharge = 0 там)
        await callEdgeFunction("gift-action", {
          launchParams: getLaunchParams(),
          club_id: null,
          gift_id: skin.id,
        });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(5,2,12,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
      onClick={onClose}
    >
      <div
        className="neon-panel"
        style={{ padding: 20, width: 420, maxHeight: "80vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, color: "var(--neon-cyan)" }}>Магазин рук</h3>
          <button className="neon-btn" onClick={onClose}>✕</button>
        </div>

        {error && <p style={{ color: "var(--neon-magenta)", fontSize: 13 }}>{error}</p>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {skins.map((skin) => {
            const owned = profile?.owned_hand_skins.includes(skin.id) ?? false;
            const active = profile?.hand_skin === skin.id;
            return (
              <button
                key={skin.id}
                className="neon-btn"
                disabled={busyId !== null}
                onClick={() => equip(skin)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  padding: 10,
                  borderColor: active ? "var(--neon-lime)" : undefined,
                  color: active ? "var(--neon-lime)" : undefined,
                }}
              >
                {skin.icon ? (
                  <img src={`${import.meta.env.BASE_URL}assets/hands/${skin.icon}`} alt={skin.name} style={{ width: 56, height: 56, objectFit: "contain" }} />
                ) : (
                  <span style={{ fontSize: 40 }}>👍</span>
                )}
                <span style={{ fontSize: 13 }}>{skin.name}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {busyId === skin.id ? "…" : active ? "Экипировано" : owned ? "Надеть" : `🪙 ${skin.price}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
