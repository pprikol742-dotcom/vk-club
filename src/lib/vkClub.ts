import bridge from '@vkontakte/vk-bridge';
import type { VkCommunity } from '../components/modals/CreateClubModal';

/**
 * Сообщества, где игрок админ или редактор — из них создаётся клуб.
 * Нужен scope=groups в правах приложения.
 */
export async function fetchAdminCommunities(accessToken: string): Promise<VkCommunity[]> {
  const res: any = await bridge.send('VKWebAppCallAPIMethod', {
    method: 'groups.get',
    params: {
      extended: 1,
      filter: 'admin,editor',
      fields: 'photo_200',
      count: 50,
      v: '5.199',
      access_token: accessToken,
    },
  });
  return (res?.response?.items ?? []).map((g: any) => ({
    id: g.id,
    name: g.name,
    photo: g.photo_200,
  }));
}

/** Запрос токена с правом на группы. */
export async function getGroupsToken(appId: number) {
  const res = await bridge.send('VKWebAppGetAuthToken', { app_id: appId, scope: 'groups' });
  return res.access_token;
}

/**
 * Оплата голосами ВК: подписка на emoji, покупка монет.
 * item — строка, которую разберёт твой сервер в колбэке VK Pay.
 */
export async function buyForVotes(item: string) {
  return bridge.send('VKWebAppShowOrderBox', { type: 'item', item });
}

/** Пост «Клуб открыт» после создания клуба. */
export async function shareClubOpened(clubName: string, appUrl: string) {
  return bridge.send('VKWebAppShowWallPostBox', {
    message: `Мы открыли клуб «${clubName}»!\nЗаходи, слушай музыку и общайся\n${appUrl}`,
  });
}

/** Приглашение друзей в клуб. */
export async function inviteFriends() {
  return bridge.send('VKWebAppShowInviteBox');
}
