import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/modals/ClubModals';
import {
  searchLibrary, searchClubLibrary, fetchMyTracks, addToMyTracks,
  addTrackToClub, deleteClubTrack, uploadTrack, type LibraryTrack,
} from '../../lib/library';
import type { ClubTrack } from '../../lib/music';
import { parseVideoUrl } from '../../lib/video';

type Tab = 'club' | 'mine' | 'library' | 'upload' | 'clip';

const fmt = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

/**
 * Фонотека клуба — своя у каждой комнаты, пополнять может любой.
 * Удалять — только админ или модератор паблика.
 * Мои треки — то, что игрок уже заряжал или залил.
 * Общая — каталог всей игры, откуда можно перетащить трек в клуб.
 */
export const MusicPickerModal: React.FC<{
  vkId: number;
  clubId: string;
  /** есть права распоряжаться фонотекой комнаты */
  canManage?: boolean;
  busy?: boolean;
  onClose: () => void;
  onPick: (track: ClubTrack) => void;
  /** зарядить клип: ссылка на VK Video или Rutube */
  onPickClip: (video: { url: string; artist: string; title: string; duration: number }) => void;
}> = ({ vkId, clubId, canManage, busy, onClose, onPick, onPickClip }) => {
  const [tab, setTab] = useState<Tab>('club');
  const [tracks, setTracks] = useState<LibraryTrack[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // загрузка своего файла
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);

  // клип
  const [clipUrl, setClipUrl] = useState('');

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
    if (which === 'upload' || which === 'clip') return;
    setLoading(true);
    setError(null);
    try {
      if (which === 'club') setTracks(await searchClubLibrary(clubId, q));
      else if (which === 'mine') setTracks(await fetchMyTracks(vkId));
      else setTracks(await searchLibrary(q));
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

  /** Зарядить трек. Если он не из фонотеки клуба — сначала кладём его туда. */
  const charge = async (t: LibraryTrack) => {
    addToMyTracks(vkId, t.id).catch(() => {});
    try {
      const inClub = t.clubId === clubId ? t : await addTrackToClub(t.id, clubId, vkId);
      onPick(inClub);
    } catch {
      onPick(t); // фонотека не приняла — играем как есть
    }
  };

  /** Положить трек в фонотеку комнаты, не заряжая. */
  const putToClub = async (t: LibraryTrack) => {
    try {
      await addTrackToClub(t.id, clubId, vkId);
      setNote(`«${t.title}» в фонотеке клуба`);
      setTimeout(() => setNote(null), 2500);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const removeFromClub = async (t: LibraryTrack) => {
    if (!confirm(`Убрать «${t.title}» из фонотеки клуба?`)) return;
    try {
      await deleteClubTrack(t.id, vkId);
      setTracks((prev) => prev.filter((x) => x.id !== t.id));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const doUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const t = await uploadTrack(vkId, file, { artist, title }, clubId);
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

  const tabBtn = (id: Tab, label: string) => (
    <button
      className={'music__tab' + (tab === id ? ' is-active' : '')}
      onClick={() => setTab(id)}
    >
      {label}
    </button>
  );

  return (
    <Modal title="Выбери трек" onClose={onClose} width={520}>
      <div className="music__tabs">
        {tabBtn('club', 'Фонотека клуба')}
        {tabBtn('mine', 'Мои треки')}
        {tabBtn('library', 'Общая')}
        {tabBtn('upload', 'Загрузить')}
        {tabBtn('clip', 'Клип')}
      </div>

      {note && <div className="music__hint-small">{note}</div>}

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

          <div className="music__hint-small">
            Трек попадёт в фонотеку этого клуба — его услышат все и сможет поставить любой.
          </div>

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
          {(tab === 'library' || tab === 'club') && (
            <div className="music__search">
              <input
                value={query}
                placeholder={tab === 'club' ? 'Поиск по фонотеке клуба' : 'Поиск по общей фонотеке'}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load(tab, query)}
              />
              <button className="btn-primary btn-primary--sm" onClick={() => load(tab, query)}>
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
                {tab === 'club'
                  ? 'Фонотека клуба пуста. Залей трек или возьми из общей — он останется в клубе и будет играть на радио.'
                  : tab === 'mine'
                  ? 'Здесь появятся треки, которые ты заряжал. Загрузи свой или возьми из общей фонотеки.'
                  : 'Ничего не нашлось.'}
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

                  {tab !== 'club' && (
                    <button
                      className="music__load music__load--ghost"
                      title="В фонотеку клуба"
                      disabled={busy}
                      onClick={() => putToClub(t)}
                    >
                      ＋
                    </button>
                  )}

                  <button className="music__load" disabled={busy} onClick={() => charge(t)}>
                    Зарядить
                  </button>

                  {tab === 'club' && canManage && (
                    <button
                      className="music__load music__load--danger"
                      title="Убрать из фонотеки клуба"
                      onClick={() => removeFromClub(t)}
                    >
                      🗑
                    </button>
                  )}
                </div>
              ))}
          </div>
        </>
      )}
    </Modal>
  );
};
