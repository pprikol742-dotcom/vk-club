import { useEffect, useState } from "react";
import { TealModal } from "../../components/TealModal";
import { supabase } from "../../lib/supabase";

interface Row {
  vk_id: number;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  total: number;
}

const NAME_COLORS = ["#ff3ec8", "#33fff0", "#c6ff3e", "#ffcf4a", "#7b2ff7"];
function colorFor(vkId: number) {
  return NAME_COLORS[vkId % NAME_COLORS.length];
}

type BoardKind = "djs" | "receivers" | "givers" | "valuable";

const BOARD_ORDER: BoardKind[] = ["djs", "receivers", "givers", "valuable"];
const BOARD_META: Record<BoardKind, { title: string; footer: string; rpc: string | null; icon: string }> = {
  djs: { title: "Топ диджеев клуба", footer: "Топ по очкам за неделю — скоро", rpc: null, icon: "🎵" },
  receivers: { title: "Топ популярных", footer: "Топ по количеству полученных подарков", rpc: "get_top_receivers", icon: "🎁" },
  givers: { title: "Топ щедрых", footer: "Топ по количеству отправленных подарков", rpc: "get_top_givers", icon: "💝" },
  valuable: { title: "Топ ценных", footer: "Топ по цене", rpc: "get_top_valuable", icon: "▶️" },
};

export function LeaderboardModal({ clubId, initialKind = "givers", onClose }: { clubId: string; initialKind?: BoardKind; onClose: () => void }) {
  const [kind, setKind] = useState<BoardKind>(initialKind);
  const meta = BOARD_META[kind];
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (!meta.rpc) {
      setRows([]);
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase.rpc(meta.rpc as string, { p_club_id: clubId, p_limit: 10 });
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, [clubId, meta.rpc]);

  return (
    <TealModal title={meta.title} onClose={onClose} footer={meta.footer}>
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {BOARD_ORDER.map((k) => (
            <button
              key={k}
              className="neon-btn"
              onClick={() => setKind(k)}
              title={BOARD_META[k].title}
              style={{
                width: 36,
                height: 36,
                padding: 0,
                borderColor: k === kind ? "var(--neon-magenta)" : undefined,
                color: k === kind ? "var(--neon-magenta)" : undefined,
              }}
            >
              {BOARD_META[k].icon}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }}>
          {loading && <p style={{ color: "var(--text-muted)" }}>Загрузка…</p>}

          {!loading && !meta.rpc && (
            <p style={{ color: "var(--text-muted)", textAlign: "center" }}>
              Очки диджеев ещё не считаем — скажи, как их начислять (за лайки на треках? за время в эфире?), и подключим.
            </p>
          )}

          {!loading && meta.rpc && rows.length === 0 && (
            <p style={{ color: "var(--text-muted)", textAlign: "center" }}>Пока пусто — здесь появятся первые лидеры.</p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {rows.map((r, i) => (
              <div
                key={r.vk_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: i % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent",
                }}
              >
                <span style={{ width: 20, color: "var(--text-muted)", fontWeight: 700 }}>{i + 1}</span>
                <img
                  src={r.avatar_url ?? undefined}
                  alt=""
                  width={30}
                  height={30}
                  style={{ borderRadius: "50%", border: "1px solid var(--panel-border)" }}
                />
                <span style={{ color: colorFor(r.vk_id), fontWeight: 600, flex: 1, fontSize: 14 }}>{r.first_name}</span>
                <span style={{ color: "var(--neon-amber)", fontWeight: 700, fontSize: 13 }}>🪙 {r.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TealModal>
  );
}
