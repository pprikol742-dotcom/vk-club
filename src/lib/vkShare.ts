import bridge from '@vkontakte/vk-bridge';

/** Снимок сцены клуба -> base64 (для «Хвастаться» и кнопки камеры). */
export async function captureStage(node: HTMLElement): Promise<string> {
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(node, { backgroundColor: null, useCORS: true, scale: 2 });
  return canvas.toDataURL('image/png');
}

/** История ВК с картинкой и подписью — «Я отыграл трек... набрав N лайков». */
export async function shareStory(imageBase64: string, text: string, appUrl: string) {
  return bridge.send('VKWebAppShowStoryBox', {
    background_type: 'image',
    blob: imageBase64,
    attachment: {
      text: 'open',
      type: 'url',
      url: appUrl,
    },
    stickers: [
      {
        sticker_type: 'renderable',
        sticker: {
          content_type: 'text',
          text,
          style: 'classic',
          transform: { relation_width: 0.8, translation_y: 0.32 },
        },
      },
    ],
  } as any);
}

/** Пост на стену — альтернатива истории. */
export async function shareWall(text: string, appUrl: string) {
  return bridge.send('VKWebAppShowWallPostBox', {
    message: `${text}\n${appUrl}`,
  });
}

/** Текст хвастовства после отыгранного трека. */
export function bragText(clubName: string, likes: number) {
  return `Я отыграл трек за вертушками клуба "${clubName}", набрав ${likes} лайков`;
}

/** Приглашение в клуб со снимком зала. */
export function inviteText(clubName: string) {
  return `Заходи в клуб "${clubName}" пока я за вертушками!`;
}

/** Вступление в группу клуба. */
export async function joinClubGroup(groupId: number) {
  return bridge.send('VKWebAppJoinGroup', { group_id: groupId });
}
