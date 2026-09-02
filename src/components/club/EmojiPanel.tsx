import React from 'react';

const EMOJI = [
  '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩',
  '😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨',
  '😐','😑','😶','😏','😒','🙄','😬','😮','😯','😪','😴','😌','😔','😕','🙁','☹️',
  '😳','🥺','😢','😭','😤','😠','😡','🤬','🥳','😎','🤓','🧐','😈','👻','💀','🤖',
];

interface Props {
  /** подписка активна */
  subscribed: boolean;
  /** цена подписки в голосах ВК */
  price: number;
  onPick: (emoji: string) => void;
  onSubscribe: () => void;
  onClose: () => void;
}

export const EmojiPanel: React.FC<Props> = ({ subscribed, price, onPick, onSubscribe, onClose }) => (
  <div className="emoji-panel">
    <div className="emoji-grid">
      {EMOJI.map((e) => (
        <button
          key={e}
          className="emoji"
          disabled={!subscribed}
          onClick={() => { onPick(e); onClose(); }}
        >
          {e}
        </button>
      ))}
    </div>

    {!subscribed && (
      <div className="emoji-lock">
        <div className="emoji-lock__icon">🔒</div>
        <div className="emoji-lock__text">
          Смайлики emoji<br />
          Стоимость подписки на месяц — {price} голосов
        </div>
        <button className="btn-primary btn-primary--sm" onClick={onSubscribe}>Подписаться</button>
      </div>
    )}
  </div>
);
