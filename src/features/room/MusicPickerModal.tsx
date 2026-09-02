import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/modals/ClubModals';
import { fetchMyAudio, vkMusicSource, type ClubTrack } from '../../lib/music';

const fmt = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

/**
 * Моя музыка ВК плюс поиск по всей фонотеке.
 * Кнопка «Зарядить» ставит трек в очередь клуба.
 */
export const MusicPickerModal: React.FC<{
  appId: number;
  /** трек уже отправляется на сервер */
  busy?: boolean;
  onClose: () => void;
  onPick: (track: ClubTrack) => void;
}> = ({ appId, busy, onClose, onPick }) => {
  const [tracks, setTracks] = useState<ClubTrack[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMine = async () => {
    setLoading(true);
    setError(null);
    try {
      setTracks(await fetchMyAudio(appId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const search = async () => {
    const q = query.trim();
    if (!q) return loadMine();
    setLoading(true);
    setError(null);
    try {
      setTracks(await vkMusicSource(appId).search(q));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal title="Выбери трек" onClose={onClose} width={480}>
      <div className="music__search">
        <input
          value={query}
          placeholder="Поиск по музыке ВК"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <button className="btn-primary btn-primary--sm" onClick={search}>Найти</button>
      </div>

      <div className="music__list">
        {loading && <div className="music__hint">Загружаем…</div>}

        {!loading && error && (
          <div className="music__hint">
            {error}
            <button className="btn-primary btn-primary--sm" onClick={loadMine}>Повторить</button>
          </div>
        )}

        {!loading && !error && tracks.length === 0 && (
          <div className="music__hint">Ничего не нашлось</div>
        )}

        {!loading &&
          tracks.map((t) => (
            <div className="music__row" key={t.id}>
              <div className="music__info">
                <div className="music__artist">{t.artist}</div>
                <div className="music__title">{t.title}</div>
              </div>
              <div className="music__time">{fmt(t.duration)}</div>
              <button
                className="music__load"
                disabled={busy}
                onClick={() => onPick(t)}
              >
                Зарядить
              </button>
            </div>
          ))}
      </div>
    </Modal>
  );
};
