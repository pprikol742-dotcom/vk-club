import { useState } from "react";
import { getLaunchParams } from "../../lib/vkBridge";
import { callEdgeFunction } from "../../lib/supabase";
import { useAppStore } from "../../store/useAppStore";

const DAY_LABELS = [1, 2, 3, 4, 5, 6, 7];

export function DailyReward() {
  const profile = useAppStore((s) => s.profile);
  const addCoins = useAppStore((s) => s.addCoins);
  const setProfile = useAppStore((s) => s.setProfile);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;

  const today = new Date().toISOString().slice(0, 10);
  const alreadyClaimedToday = profile.last_daily_claim_at === today;
  const currentDayInCycle = alreadyClaimedToday ? profile.daily_streak + 1 : profile.daily_streak; // 1..7

  async function claim() {
    setClaiming(true);
    setError(null);
    try {
      const res = await callEdgeFunction<{ coinsAwarded: number; dayInCycle: number }>(
        "claim-daily-reward",
        { launchParams: getLaunchParams() },
      );
      addCoins(res.coinsAwarded);
      setProfile({ ...profile!, daily_streak: res.dayInCycle - 1, last_daily_claim_at: today });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="neon-panel" style={{ padding: 16, maxWidth: 420, margin: "16px auto" }}>
      <h3 style={{ marginTop: 0, color: "var(--neon-amber)" }}>Ежедневная награда</h3>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {DAY_LABELS.map((day) => (
          <div
            key={day}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "6px 0",
              borderRadius: 8,
              border: "1px solid var(--panel-border)",
              background: day <= currentDayInCycle ? "rgba(255,207,74,0.15)" : "transparent",
              color: day <= currentDayInCycle ? "var(--neon-amber)" : "var(--text-muted)",
              fontSize: 12,
            }}
          >
            {day} 🪙{day}
          </div>
        ))}
      </div>
      <button className="neon-btn" disabled={claiming || alreadyClaimedToday} onClick={claim}>
        {alreadyClaimedToday ? "Уже получено сегодня" : claiming ? "Получаю…" : "Забрать монеты"}
      </button>
      {error && <p style={{ color: "var(--neon-magenta)", fontSize: 13 }}>{error}</p>}
    </div>
  );
}
