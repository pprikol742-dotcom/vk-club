import React from 'react';
import { Modal } from './ClubModals';
import { frameOf, FRAME_TITLE, type ClubRole, type Gender } from '../../config/frames';

export interface ClubberProfile {
  id: string;
  name: string;
  photo: string;
  vkUrl: string;
  gender: Gender;
  role: ClubRole;
  isTopLeader?: boolean;
  city?: string;
  status?: string;
  /** заказано треков */
  tracks: number;
  /** сыграно как DJ */
  played: number;
  /** получено подарков */
  giftsGot: number;
  /** отправлено подарков */
  giftsSent: number;
  owner?: { id: string; name: string; photo: string } | null;
  buyoutPrice: number;
}

interface Props {
  profile: ClubberProfile;
  /** решение принимает canBan() в ClubPage — сюда приходит готовый флаг */
  canBan?: boolean;
  canBuyout?: boolean;
  onClose: () => void;
  onBan?: () => void;
  onBuyout: () => void;
  onOpenOwner?: (ownerId: string) => void;
}

export const ProfileModal: React.FC<Props> = ({
  profile, canBan, canBuyout, onClose, onBan, onBuyout, onOpenOwner,
}) => {
  const frame = frameOf(profile);

  return (
    <Modal title={profile.name} onClose={onClose} width={470}>
      {canBan && (
        <button className="modal__ban" onClick={onBan} title="Выгнать (забанить) пользователя">✕</button>
      )}

      <div className="modal__body">
        <div className="profile__status">{profile.status?.trim() || '...'}</div>

        <div className="profile__row">
          <img
            className={`profile__photo clubber--${frame}`}
            src={profile.photo}
            alt={profile.name}
            title={FRAME_TITLE[frame]}
          />

          <div className="profile__info">
            {profile.city && <div className="profile__city">📍 {profile.city}</div>}

            <div className="profile__stats">
              <Stat icon="🎵" value={profile.tracks} title="Заказано треков" />
              <Stat icon="🎁" value={profile.giftsGot} title="Получено подарков" />
              <Stat icon="▶" value={profile.played} title="Сыграно за пультом" />
              <Stat icon="🎁" value={profile.giftsSent} title="Отправлено подарков" />
            </div>
          </div>

          <a className="profile__vk" href={profile.vkUrl} target="_blank" rel="noreferrer" title="Профиль ВК">B</a>
        </div>

        <div className="profile__owner">
          {profile.owner ? (
            <>
              <img src={profile.owner.photo} alt="" />
              <div>
                <div className="profile__owner-label">Хозяин:</div>
                <span className="profile__owner-name" onClick={() => onOpenOwner?.(profile.owner!.id)}>
                  {profile.owner.name}
                </span>
              </div>
            </>
          ) : (
            <div className="profile__owner-label">Хозяина нет</div>
          )}

          {canBuyout && (
            <button className="btn-primary btn-primary--sm" onClick={onBuyout}>Перекупить</button>
          )}
        </div>
      </div>
    </Modal>
  );
};

const Stat: React.FC<{ icon: string; value: number; title: string }> = ({ icon, value, title }) => (
  <div className="stat" title={title}>
    <span className="stat__icon">{icon}</span>
    <span className="stat__value">{value}</span>
  </div>
);

/* ---------- гарем ---------- */
export const HaremModal: React.FC<{
  targetName: string;
  ownerName: string | null;
  price: number;
  coins: number;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ targetName, ownerName, price, coins, onClose, onConfirm }) => (
  <Modal title="Гарем" onClose={onClose}>
    <div className="modal__body">
      <div className="modal__frame">
        <p className="modal__text">
          Ты можешь стать хозяином<br />
          <b>{targetName}</b>
          {ownerName ? <>,<br />перекупив его у<br /><b>{ownerName}</b></> : null}
        </p>

        <div className="gift__price" style={{ justifyContent: 'center', marginTop: 16, fontSize: 18 }}>
          <span className="gift__coin" style={{ width: 20, height: 20 }} />
          {price}
        </div>

        <button className="btn-primary" disabled={coins < price} onClick={onConfirm}>Перекупить</button>
        {coins < price && <div className="modal__hint">Не хватает монет — пополни в магазине</div>}
      </div>
    </div>
  </Modal>
);
