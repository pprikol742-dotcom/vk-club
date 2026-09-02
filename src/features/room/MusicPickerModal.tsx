import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/modals/ClubModals';
import { fetchMyAudio, vkMusicSource, type ClubTrack } from '../../lib/music';

type Tab = 'vk' | 'link';

const fmt = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

/**
 * Основной путь — музыка ВК. Если доступа нет,
 * трек можно зарядить по прямой ссылке, чтобы клуб работал в любом случае.
 */
export const MusicPickerModal: React.FC<{
  appId: number;
  busy?: boolean;
  onClose: () => void;
  onPick: (track: ClubTrack) => void;
  /** запасной ввод по ссылке — по умолчанию скрыт */
  allowLink?: boolean;
}> = ({ appId, busy, onClose, onPick, allowLink = false }) => {
  const [tab, setTab] = useState<Tab>('vk');
  const [tracks, setTracks] = useState<ClubTrack[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // поля запасного ввода
  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [minutes, setMinutes] = useState('3');

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

  const pickByLink = () => {
    if (!url.trim() || !title.trim()) return;
    onPick({
      id: `link_${Date.now()}`,
      artist: artist.trim() || 'Неизвестный исполнитель',
      title: title.trim(),
      duration: Math.max(30, Math.round(parseFloat(minutes || '3') * 60)),
      url: url.trim(),
    });
  };

  return (
    <Modal title="Выбери трек" onClose={onClose} width={480}>
      {allowLink && (
      <div className="music__tabs">
        <button
          className={'music__tab' + (tab === 'vk' ? ' is-active' : '')}
          onClick={() => setTab('vk')}
        >
          Музыка ВК
        </button>
        <button
          className={'music__tab' + (tab === 'link' ? ' is-active' : '')}
          onClick={() => setTab('link')}
        >
          По ссылке
        </button>
      </div>
      )}

      {tab === 'vk' || !allowLink ? (
        <>
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
                <div>{error}</div>
                <div className="music__hint-small">
                  Разреши приложению доступ к аудиозаписям — окно с запросом
                  появляется при первом нажатии.
                </div>
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
                  <button className="music__load" disabled={busy} onClick={() => onPick(t)}>
                    Зарядить
                  </button>
                </div>
              ))}
          </div>
        </>
      ) : (
        <div className="music__form">
          <label className="music__field">
            <span>Исполнитель</span>
            <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Сплин" />
          </label>
          <label className="music__field">
            <span>Название</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Выхода нет" />
          </label>
          <label className="music__field">
            <span>Ссылка на файл (mp3)</span>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/track.mp3" />
          </label>
          <label className="music__field">
            <span>Длительность, минут</span>
            <input value={minutes} onChange={(e) => setMinutes(e.target.value)} inputMode="decimal" />
          </label>

          <button
            className="music__load music__load--wide"
            disabled={busy || !url.trim() || !title.trim()}
            onClick={pickByLink}
          >
            Зарядить
          </button>
        </div>
      )}
    </Modal>
  );
};
