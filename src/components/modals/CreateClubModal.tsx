import React, { useState } from 'react';
import { Modal } from './ClubModals';

export interface VkCommunity {
  id: number;
  name: string;
  photo: string;
}

/** Клуб создаётся на основе сообщества, где игрок админ или редактор. */
export const CreateClubModal: React.FC<{
  communities: VkCommunity[];
  loading?: boolean;
  onClose: () => void;
  onPick: (c: VkCommunity) => void;
}> = ({ communities, loading, onClose, onPick }) => {
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <Modal title="Собственный клуб" onClose={onClose} width={480}>
      <div className="modal__body">
        <div className="create-club__label">Создать клуб в сообществе:</div>

        {loading && <div className="modal__hint">Загружаем твои сообщества…</div>}

        {!loading && communities.length === 0 && (
          <div className="modal__hint">
            Нет сообществ, где ты админ или редактор. Создай сообщество ВК — из него возьмутся
            название и логотип клуба.
          </div>
        )}

        <div className="community-grid">
          {communities.map((c) => (
            <button
              key={c.id}
              className={'community' + (picked === c.id ? ' community--active' : '')}
              onClick={() => { setPicked(c.id); onPick(c); }}
            >
              <div className="community__name">{c.name}</div>
              <img className="community__photo" src={c.photo} alt="" />
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};

/** Поздравление после создания клуба. */
export const ClubCreatedModal: React.FC<{
  clubName: string;
  onClose: () => void;
  onEnter: () => void;
  onShare?: () => void;
}> = ({ clubName, onClose, onEnter, onShare }) => (
  <Modal title="Поздравляем" onClose={onClose}>
    <div className="modal__body">
      <div className="modal__frame">
        <p className="modal__text">
          Ты создал клуб<br /><b>{clubName}</b>!<br />
          Приглашай друзей, ставь музыку, общайся!
        </p>
        <button className="btn-primary" onClick={onEnter}>Зайти в клуб</button>
        {onShare && (
          <button className="btn-ghost" onClick={onShare}>Рассказать друзьям</button>
        )}
      </div>
    </div>
  </Modal>
);
