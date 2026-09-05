import { supabase } from './supabase';
import type { ClubTrack } from './music';

export interface LibraryTrack extends ClubTrack {
  url: string;
  plays: number;
  /** комната, которой принадлежит трек; null — общий каталог */
  clubId?: string | null;
  addedBy?: number | null;
}

const toTrack = (r: any): LibraryTrack => ({
  id: r.id,
  artist: r.artist,
  title: r.title,
  duration: r.duration,
  url: r.url,
  plays: r.plays ?? 0,
  clubId: r.club_id ?? null,
  addedBy: r.added_by_vk_id ?? null,
});

/** Поиск по общему каталогу. Пустой запрос — самое популярное. */
export async function searchLibrary(query: string, limit = 50): Promise<LibraryTrack[]> {
  const { data, error } = await supabase.rpc('search_tracks', {
    p_query: query.trim(),
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toTrack);
}

/** Фонотека конкретной комнаты. */
export async function searchClubLibrary(
  clubId: string,
  query = '',
  limit = 50,
): Promise<LibraryTrack[]> {
  const { data, error } = await supabase.rpc('search_club_tracks', {
    p_club: clubId,
    p_query: query.trim(),
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toTrack);
}

/** Случайный трек комнаты — им питается радио. */
export async function randomClubTrack(clubId: string): Promise<LibraryTrack | null> {
  const { data, error } = await supabase.rpc('random_club_track', { p_club: clubId });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return row ? toTrack(row) : null;
}

/**
 * Добавить трек в фонотеку комнаты.
 * Общий трек копируется, чтобы удаление в одной комнате
 * не выдёргивало музыку из другой.
 */
export async function addTrackToClub(
  trackId: string,
  clubId: string,
  vkId: number,
): Promise<LibraryTrack> {
  const { data, error } = await supabase.rpc('add_track_to_club', {
    p_track_id: String(trackId),
    p_club: clubId,
    p_vk_id: vkId,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return toTrack(row);
}

/** Убрать трек из фонотеки комнаты. Только админ или модератор. */
export async function deleteClubTrack(trackId: string, vkId: number): Promise<void> {
  const { error } = await supabase.rpc('delete_club_track', {
    p_track_id: String(trackId),
    p_vk_id: vkId,
  });
  if (error) throw new Error(error.message);
}

/** Кто может распоряжаться комнатой: владелец в игре или модератор паблика. */
export async function canManageClub(clubId: string, vkId: number): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_manage_club', {
    p_club: clubId,
    p_vk_id: vkId,
  });
  if (error) return false;
  return Boolean(data);
}

/** Отметить, что трек прозвучал. */
export async function bumpPlays(trackId: string) {
  await supabase.rpc('bump_track_plays', { p_track_id: String(trackId) }).then(
    () => undefined,
    () => undefined,
  );
}

/** Последние 50 треков игрока — то, что он уже заряжал или добавил. */
export async function fetchMyTracks(vkId: number): Promise<LibraryTrack[]> {
  const { data, error } = await supabase.rpc('my_tracks', { p_vk_id: vkId });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toTrack);
}

/** Положить трек в свой плейлист. */
export async function addToMyTracks(vkId: number, trackId: string) {
  const { error } = await supabase
    .from('user_tracks')
    .upsert({ vk_id: vkId, track_id: trackId }, { onConflict: 'vk_id,track_id' });
  if (error) throw new Error(error.message);
}

/** Убрать из своего плейлиста. */
export async function removeFromMyTracks(vkId: number, trackId: string) {
  const { error } = await supabase
    .from('user_tracks')
    .delete()
    .eq('vk_id', vkId)
    .eq('track_id', trackId);
  if (error) throw new Error(error.message);
}

/** Длительность файла — читаем прямо в браузере, чтобы не спрашивать у игрока. */
export function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    const url = URL.createObjectURL(file);
    const done = (sec: number) => {
      URL.revokeObjectURL(url);
      resolve(Math.max(10, Math.round(sec) || 180));
    };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => done(audio.duration);
    audio.onerror = () => done(180);
    audio.src = url;
  });
}

/**
 * Заливаем файл в хранилище и заводим запись в каталоге.
 * Если передан clubId — трек сразу попадает в фонотеку этой комнаты.
 */
export async function uploadTrack(
  vkId: number,
  file: File,
  meta: { artist: string; title: string },
  clubId?: string | null,
): Promise<LibraryTrack> {
  const duration = await readDuration(file);
  const ext = (file.name.split('.').pop() || 'mp3').toLowerCase();
  const path = `${vkId}/${Date.now()}.${ext}`;

  const up = await supabase.storage.from('tracks').upload(path, file, {
    contentType: file.type || 'audio/mpeg',
    upsert: false,
  });
  if (up.error) throw new Error(up.error.message);

  const { data: pub } = supabase.storage.from('tracks').getPublicUrl(path);

  const { data, error } = await supabase
    .from('tracks')
    .insert({
      artist: meta.artist.trim() || 'Неизвестный исполнитель',
      title: meta.title.trim() || file.name.replace(/\.[^.]+$/, ''),
      duration,
      url: pub.publicUrl,
      storage_path: path,
      uploaded_by: vkId,
      club_id: clubId ?? null,
      added_by_vk_id: vkId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const track = toTrack(data);
  await addToMyTracks(vkId, track.id).catch(() => {});
  return track;
}
