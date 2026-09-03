import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/modals/ClubModals';
import {
  searchLibrary, fetchMyTracks, addToMyTracks, uploadTrack, type LibraryTrack,
} from '../../lib/library';
import type { ClubTrack } from '../../lib/music';
import { parseVideoUrl } from '../../lib/video';

type Tab = 'mine' | 'library' | 'upload' | 'clip';

const fmt = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

/**
 * Мои треки — то, что игрок уже заряжал или залил.
 * Фонотека — общий каталог клуба. Загрузка — свой файл.
 */
export const MusicPickerModal: React.FC<{
  vkId: number;
  busy?: boolean;
  onClose: () => void;
  onPick: (track: ClubTrack) => void;
  /** зарядить клип: ссылка на VK Video или Rutube */
  onPickClip: (video: { url: string; artist: string; title: string; duration: number }) => void;
}> = ({ vkId, busy, onClose, onPick, onPickClip }) => {
  const [tab, setTab] = useState<Tab>('mine');
  const [tracks, setTracks] = useState<LibraryTrack[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // загрузка своего файла
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);

  // клип
  const [clipUrl, setClipUrl] = useState('');

  /** Название вытащим из ссылки, длительность уточнит сам плеер. */
  const playClip = () => {
    const v = parseVideoUrl(clipUrl);
    if (!v) return;
    const name =
      v.provider === 'rutube' ? 'Клип с Rutube'
      : v.provider === 'vk' ? 'Клип из VK Видео'
      : 'Клип';
    onPickClip({ url: v.url, artist: 'Клип', title: name, duration: 300 });
  };

  const load = async (which: Tab, q = '') => {
    if (which === 'upload') return;
    setLoading(true);
    setError(null);
    try {
      setTracks(which === 'mine' ? await fetchMyTracks(vkId) : await searchLibrary(q));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(tab, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const charge = async (t: LibraryTrack) => {
    addToMyTracks(vkId, t.id).catch(() => {});
    onPick(t);
  };

  const doUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const t = await uploadTrack(vkId, file, { artist, title });
      setFile(null);
      setArtist('');
      setTitle('');
      if (fileRef.current) fileRef.current.value = '';
      charge(t);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal title="Выбери трек" onClose={onClose} width={480}>
      <div className="music__tabs">
        <button className={'music__tab' + (tab === 'mine' ? ' is-active' : '')} onClick={() => setTab('mine')}>
          Мои треки
        </button>
        <button className={'music__tab' + (tab === 'library' ? ' is-active' : '')} onClick={() => setTab('library')}>
          Фонотека
        </button>
        <button className={'music__tab' + (tab === 'upload' ? ' is-active' : '')} onClick={() => setTab('upload')}>
          Загрузить
        </button>
        <button className={'music__tab' + (tab === 'clip' ? ' is-active' : '')} onClick={() => setTab('clip')}>
          Клип
        </button>
      </div>

      {tab === 'clip' ? (
        <div className="music__form">
          <label className="music__field">
            <span>Ссылка на клип (VK Видео или Rutube)</span>
            <input
              value={clipUrl}
              autoFocus
              onChange={(e) => setClipUrl(e.target.value)}
              placeholder="https://rutube.ru/video/…"
              onKeyDown={(e) => e.key === 'Enter' && playClip()}
            />
          </label>

          {clipUrl.trim() && !parseVideoUrl(clipUrl) && (
            <div className="music__hint-small">
              Не узнаю ссылку. Подойдёт адрес вида rutube.ru/video/… или vk.com/video-123_456
            </div>
          )}

          <button
            className="music__load music__load--wide"
            disabled={busy || !parseVideoUrl(clipUrl)}
            onClick={playClip}
          >
            Включить
          </button>
        </div>
      ) : tab === 'upload' ? (
        <div className="music__form">
          <label className="music__field">
            <span>Файл (mp3, до 20 МБ)</span>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''));
              }}
            />
          </label>
          <label className="music__field">
            <span>Исполнитель</span>
            <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Сплин" />
          </label>
          <label className="music__field">
            <span>Название</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Выхода нет" />
          </label>

          {error && <div className="music__hint-small">{error}</div>}

          <button
            className="music__load music__load--wide"
            disabled={!file || uploading || busy}
            onClick={doUpload}
          >
            {uploading ? 'Загружаем…' : 'Загрузить и зарядить'}
          </button>
        </div>
      ) : (
        <>
          {tab === 'library' && (
            <div className="music__search">
              <input
                value={query}
                placeholder="Поиск по фонотеке"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load('library', query)}
              />
              <button className="btn-primary btn-primary--sm" onClick={() => load('library', query)}>
                Найти
              </button>
            </div>
          )}

          <div className="music__list">
            {loading && <div className="music__hint">Загружаем…</div>}

            {!loading && error && (
              <div className="music__hint">
                <div>{error}</div>
                <button className="btn-primary btn-primary--sm" onClick={() => load(tab, query)}>
                  Повторить
                </button>
              </div>
            )}

            {!loading && !error && tracks.length === 0 && (
              <div className="music__hint">
                {tab === 'mine'
                  ? 'Здесь появятся треки, которые ты заряжал. Загрузи свой или возьми из фонотеки.'
                  : 'В фонотеке пока пусто — загрузи первый трек.'}
              </div>
            )}

            {!loading &&
              tracks.map((t) => (
                <div className="music__row" key={t.id}>
                  <div className="music__info">
                    <div className="music__artist">{t.artist}</div>
                    <div className="music__title">{t.title}</div>
                  </div>
                  <div className="music__time">{fmt(t.duration)}</div>
                  <button className="music__load" disabled={busy} onClick={() => charge(t)}>
                    Зарядить
                  </button>
                </div>
              ))}
          </div>
        </>
      )}
    </Modal>
  );
};
