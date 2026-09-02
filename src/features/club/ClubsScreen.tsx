import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ClubList, type ClubCard } from '../../components/club/ClubList';

const PLACEHOLDER = `${import.meta.env.BASE_URL}assets/bg/club_background.png`;

interface Props {
  votes?: number;
  onEnter: (clubId: string) => void;
  onCreate: () => void;
  onHelp: () => void;
}

/**
 * Витрина клубов: аватарка сообщества, сколько человек внутри,
 * кто хозяин и что играет прямо сейчас. Обновляется сама раз в 20 секунд.
 */
export function ClubsScreen({ votes = 0, onEnter, onCreate, onHelp }: Props) {
  const [clubs, setClubs] = useState<ClubCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [clubsRes, sessionsRes] = await Promise.all([
        supabase.from('clubs').select('*').limit(60),
        supabase.from('club_sessions').select('*'),
      ]);

      if (clubsRes.error) throw clubsRes.error;

      const sessions = new Map<string, any>();
      for (const s of sessionsRes.data ?? []) sessions.set((s as any).club_id, s);

      const list: ClubCard[] = (clubsRes.data ?? []).map((c: any) => {
        const s = sessions.get(c.id);
        const playing = s?.track_artist
          ? `${s.track_artist} — ${s.track_title ?? ''}`.trim()
          : undefined;

        return {
          id: c.id,
          title: c.group_name ?? c.name ?? 'Клуб',
          cover: c.photo_url ?? c.avatar_url ?? c.cover_url ?? PLACEHOLDER,
          online: c.online_count ?? c.members_online ?? (s?.dj_vk_id ? 1 : 0),
          ownerName: c.owner_name ?? '',
          nowPlaying: playing,
        };
      });

      // сначала те, где кто-то есть, потом остальные
      list.sort((a, b) => b.online - a.online);
      setClubs(list);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [load]);

  if (loading && clubs.length === 0) {
    return <div className="clublist-empty">Загружаем клубы…</div>;
  }

  if (error && clubs.length === 0) {
    return (
      <div className="clublist-empty">
        Не удалось загрузить список клубов.
        <button className="btn-primary" onClick={load}>Повторить</button>
      </div>
    );
  }

  return (
    <ClubList
      clubs={clubs}
      votes={votes}
      onEnter={onEnter}
      onCreate={onCreate}
      onHelp={onHelp}
    />
  );
}

export default ClubsScreen;
