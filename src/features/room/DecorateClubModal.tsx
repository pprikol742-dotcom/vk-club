import { useEffect, useState } from "react";
import { TealModal } from "../../components/TealModal";
import { supabase, callEdgeFunction } from "../../lib/supabase";
import { getLaunchParams } from "../../lib/vkBridge";
import { useAppStore } from "../../store/useAppStore";
import type { GiftCatalogItem } from "../../lib/types";

export function DecorateClubModal({ onClose }: { onClose: () => void }) {
  const club = useAppStore((s) => s.club);
  const addCoins = useAppStore((s) => s.addCoins);
  const [items, setItems] = useState<GiftCatalogItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("gifts_catalog")
      .select("*")
      .eq("category", "decoration")
      .order("price", { ascending: true })
      .then(({ data }) => setItems((data ?? []) as GiftCatalogItem[]));
  }, []);

  async function buy(item: GiftCatalogItem) {
    if (!club) return;
    setBusyId(item.id);
    setError(null);
    try {
      const res = await callEdgeFunction<{ spent: number }>("gift-action", {
        launchParams: getLaunchParams(),
        club_id: club.id,
        gift_id: item.id,
      });
      addCoins(-res.spent);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <TealModal title="Украсить клуб" onClose={onClose}>
      {error && <p style={{ color: "var(--neon-magenta)", fontSize: 13 }}>{error}</p>}
      {items.length === 0 && (
        <p style={{ color: "var(--text-muted)", textAlign: "center" }}>
          Пока только «Диско-шар» — пришли ещё картинок украшений (по образцу прошлых промтов), и добавим сюда.
        </p>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {items.map((item) => (
          <button
            key={item.id}
            className="neon-btn"
            disabled={busyId !== null}
            onClick={() => buy(item)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 12 }}
          >
            {item.icon ? (
              <img
                src={`${import.meta.env.BASE_URL}assets/gifts/${item.icon}`}
                alt=""
                style={{ width: 48, height: 48, objectFit: "contain" }}
                onError={(e) => { e.currentTarget.src = ""; e.currentTarget.alt = "🪩"; }}
              />
            ) : (
              <span style={{ fontSize: 36 }}>🪩</span>
            )}
            <span style={{ fontSize: 12 }}>{busyId === item.id ? "…" : item.name}</span>
            <span style={{ fontSize: 12, color: "var(--neon-amber)" }}>🪙 {item.price}</span>
          </button>
        ))}
      </div>
    </TealModal>
  );
}
