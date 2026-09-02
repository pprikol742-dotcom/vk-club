import React, { useState } from 'react';
import { Modal } from './ClubModals';

/** Приветствие клуба — видит каждый входящий, редактирует только владелец. */
export const WelcomeEditModal: React.FC<{
  initial: string;
  saving?: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
}> = ({ initial, saving, onClose, onSave }) => {
  const [text, setText] = useState(initial);
  const LIMIT = 1000;

  return (
    <Modal title="Приветствие клуба" onClose={onClose} width={460}>
      <div className="modal__body">
        <p className="welcome__hint">
          Приветствие клуба показывается в чате каждому входящему. Можно написать тут
        </p>
        <textarea
          className="welcome__area"
          value={text}
          maxLength={LIMIT}
          placeholder="Введите текст здесь..."
          onChange={(e) => setText(e.target.value)}
        />
        <div className="welcome__counter">{text.length} / {LIMIT}</div>
        <div style={{ textAlign: 'center' }}>
          <button className="btn-primary" disabled={saving} onClick={() => onSave(text.trim())}>
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

/** Подтверждение бана — открывается только с жёлтой рамки. */
export const BanConfirmModal: React.FC<{
  targetName: string;
  hours?: number;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ targetName, hours = 24, onClose, onConfirm }) => (
  <Modal title="Выгнать (забанить) пользователя" onClose={onClose} width={430}>
    <div className="modal__body">
      <div className="modal__frame">
        <p className="modal__text">
          Выгнать пользователя<br />
          <b>{targetName}</b><br />
          из клуба (на {hours === 24 ? 'сутки' : `${hours} ч`})?
        </p>
        <button className="btn-primary" onClick={onConfirm}>Да</button>
      </div>
    </div>
  </Modal>
);

/** Экран вместо клуба, если игрок забанен. */
export const BlockedScreen: React.FC<{
  votes: number;
  onChooseClub: () => void;
  onHelp: () => void;
}> = ({ votes, onChooseClub, onHelp }) => (
  <div className="blocked-page">
    <div className="topbar">
      <div className="topbar__left">▶ В Клубе</div>
      <div className="topbar__right">
        <span className="topbar__link" onClick={onHelp}>Помощь</span>
        <span className="topbar__votes">У вас <b>{votes}</b> голосов</span>
        <span className="topbar__link">Действия ⌄</span>
      </div>
    </div>

    <div className="modal blocked-card">
      <div className="modal__head">Вход в клуб заблокирован</div>
      <div className="modal__body">
        <div className="modal__frame">
          <p className="modal__text">
            Хозяин клуба выгнал тебя.<br />
            Возможно, ты плохо себя вёл?<br />
            Подумай над своим поведением.<br />
            А может, хозяин клуба сошёл с ума?<br />
            Такое тоже возможно.<br />
            Попробуй прийти завтра.<br />
            А пока, выбери другой клуб.
          </p>
          <button className="btn-primary" onClick={onChooseClub}>Выбрать</button>
        </div>
      </div>
    </div>
  </div>
);
