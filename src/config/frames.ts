// Рамки аватарок и права в клубе — единая точка правды.

export type Gender = 'm' | 'f';
export type ClubRole = 'owner' | 'admin' | 'member';
export type FrameKind = 'owner' | 'leader' | 'female' | 'male';

/**
 * Приоритет рамок:
 *  1. жёлтая  — владелец клуба и админы (они же модераторы);
 *  2. красная — лидер недельного ТОПа;
 *  3. розово-фиолетовая — женщины;
 *  4. зелёная — мужчины.
 */
export function frameOf(p: { role: ClubRole; isTopLeader?: boolean; gender: Gender }): FrameKind {
  if (p.role === 'owner' || p.role === 'admin') return 'owner';
  if (p.isTopLeader) return 'leader';
  return p.gender === 'f' ? 'female' : 'male';
}

export const FRAME_TITLE: Record<FrameKind, string> = {
  owner: 'Хозяин клуба',
  leader: 'Лидер ТОПа недели',
  female: '',
  male: '',
};

/** Выгонять может только жёлтая рамка — и только не такую же жёлтую. */
export function canBan(viewerRole: ClubRole, targetRole: ClubRole, isSelf: boolean) {
  if (isSelf) return false;
  if (viewerRole === 'owner') return targetRole !== 'owner';
  if (viewerRole === 'admin') return targetRole === 'member';
  return false;
}

/** Менять приветствие клуба может только владелец. */
export function canEditWelcome(viewerRole: ClubRole) {
  return viewerRole === 'owner';
}

/** Подарок можно послать любому, кроме себя. */
export function canGift(isSelf: boolean) {
  return !isSelf;
}

/** Пол из данных ВК: 1 — женский, 2 — мужской. */
export function genderFromVk(sex?: number): Gender {
  return sex === 1 ? 'f' : 'm';
}
