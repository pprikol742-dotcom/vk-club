import { useEffect, useState } from "react";
import { getAdminGroups, getLaunchParams } from "../../lib/vkBridge";
import { callEdgeFunction } from "../../lib/supabase";
import type { Club } from "../../lib/types";
import { STYLE_LABELS, STYLE_HINTS, type ClubStyle } from "../../config/clubTheme";
import "../../styles/club-create.css";

const STYLE_PREVIEW: Record<ClubStyle, string> = {
  candy: `${import.meta.env.BASE_URL}assets/bg/club_background.png`,
  dark: `${import.meta.env.BASE_URL}assets/bg/club_background_dark.png`,
};

interface VkGroup {
  id: number;
  name: string;
  photo_100: string;
}

export function ClubCreate({ onClubReady }: { onClubReady: (club: Club) => void }) {
  const [groups, setGroups] = useState<VkGroup[]>([]);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [style, setStyle] = useState<ClubStyle>("candy");

  useEffect(() => {
    getAdminGroups()
      .then(({ groups, accessToken }) => {
        setGroups(groups);
        setUserToken(accessToken);
      })
      .catch((e) => setError(e.message ?? "Не удалось получить список сообществ"))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(groupId: number) {
    setCreatingId(groupId);
    setError(null);
    try {
      const { club } = await callEdgeFunction<{ club: Club }>("create-club", {
        launchParams: getLaunchParams(),
        vk_group_id: groupId,
        vk_user_access_token: userToken,
        style,
      });
      onClubReady(club);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreatingId(null);
    }
  }

  return (
    <div className="neon-panel" style={{ padding: 24, maxWidth: 460, margin: "40px auto" }}>
      <h2 style={{ color: "var(--neon-cyan)", marginTop: 0 }}>Создать клуб</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
        Клуб можно создать только из паблика, где ты руководитель. Выбери сообщество:
      </p>

      {loading && <p>Загружаю твои сообщества…</p>}
      <div className="style-pick">
        <div className="style-pick__title">Стиль зала</div>
        <div className="style-pick__row">
          {(Object.keys(STYLE_PREVIEW) as ClubStyle[]).map((id) => (
            <button
              key={id}
              className={"style-card" + (style === id ? " is-active" : "")}
              onClick={() => setStyle(id)}
              type="button"
            >
              <img src={STYLE_PREVIEW[id]} alt="" />
              <div className="style-card__name">{STYLE_LABELS[id]}</div>
              <div className="style-card__hint">{STYLE_HINTS[id]}</div>
            </button>
          ))}
        </div>
      </div>

      {error && <p style={{ color: "var(--neon-magenta)" }}>{error}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {groups.map((g) => (
          <button
            key={g.id}
            className="neon-btn"
            disabled={creatingId !== null}
            onClick={() => handleCreate(g.id)}
            style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}
          >
            <img src={g.photo_100} alt="" width={32} height={32} style={{ borderRadius: 8 }} />
            <span>{creatingId === g.id ? "Создаю клуб…" : g.name}</span>
          </button>
        ))}
      </div>

      {!loading && groups.length === 0 && !error && (
        <p style={{ color: "var(--text-muted)" }}>
          У тебя нет сообществ, где ты руководитель. Создай паблик ВК и попробуй снова.
        </p>
      )}
    </div>
  );
}
