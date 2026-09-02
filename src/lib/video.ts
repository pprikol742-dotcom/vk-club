export type VideoProvider = 'rutube' | 'vk' | 'youtube';

export interface ClubVideo {
  provider: VideoProvider;
  /** исходная ссылка, её и храним в сессии */
  url: string;
  /** готовый адрес для встраивания */
  embed: string;
}

/**
 * Rutube:  https://rutube.ru/video/ID/
 * VK:      https://vk.com/video-123_456  или готовый video_ext.php
 * YouTube: https://youtu.be/ID
 */
export function parseVideoUrl(raw: string): ClubVideo | null {
  const url = raw.trim();
  if (!url) return null;

  // Rutube
  const ru = url.match(/rutube\.ru\/(?:video|play\/embed)\/([a-z0-9]+)/i);
  if (ru) {
    return { provider: 'rutube', url, embed: `https://rutube.ru/play/embed/${ru[1]}` };
  }

  // VK Video: готовая ссылка для встраивания
  if (/vk(?:video)?\.(?:com|ru)\/video_ext\.php/i.test(url)) {
    return { provider: 'vk', url, embed: url };
  }

  // VK Video: обычная ссылка вида video-123_456
  const vk = url.match(/vk(?:video)?\.(?:com|ru)\/.*video(-?\d+)_(\d+)/i);
  if (vk) {
    return {
      provider: 'vk',
      url,
      embed: `https://vk.com/video_ext.php?oid=${vk[1]}&id=${vk[2]}&hd=2`,
    };
  }

  // YouTube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/i);
  if (yt) {
    return { provider: 'youtube', url, embed: `https://www.youtube.com/embed/${yt[1]}` };
  }

  return null;
}

/**
 * Адрес плеера со сдвигом: вошедший в середине клипа
 * увидит его с той же секунды, что и остальные.
 */
export function embedWithOffset(video: ClubVideo, offsetSec: number, muted: boolean) {
  const t = Math.max(0, Math.floor(offsetSec));
  const sep = video.embed.includes('?') ? '&' : '?';

  if (video.provider === 'rutube') {
    return `${video.embed}${sep}skinColor=ff3ec8&autoplay=1&t=${t}${muted ? '&mute=1' : ''}`;
  }
  if (video.provider === 'vk') {
    return `${video.embed}${sep}autoplay=1&t=${t}${muted ? '&nomute=0' : ''}`;
  }
  return `${video.embed}${sep}autoplay=1&start=${t}&mute=${muted ? 1 : 0}&playsinline=1`;
}
