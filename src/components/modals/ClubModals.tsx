import React, { useState } from 'react';

/* ---------- базовая обёртка ---------- */
export const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}> = ({ title, onClose, children, width }) => (
  <div className="overlay" onClick={onClose}>
    <div className="modal" style={width ? { width } : undefined} onClick={(e) => e.stopPropagation()}>
      <div className="modal__head">
        {title}
        <button className="modal__close" onClick={onClose} aria-label="Закрыть">✕</button>
      </div>
      {children}
    </div>
  </div>
);

/* ---------- подарок для DJ ---------- */
export interface GiftItem {
  id: string;
  price: number;
  name: string;
  /** эмодзи-заглушка */
  emoji?: string;
  /** URL картинки — если есть, рисуем её вместо эмодзи */
  icon?: string;
}

export const GIFTS: GiftItem[] = [
  { id: 'beer',      emoji: '🍺', price: 5, name: 'Пиво' },
  { id: 'champagne', emoji: '🥂', price: 5, name: 'Шампанское' },
  { id: 'hookah',    emoji: '🪔', price: 7, name: 'Кальян' },
  { id: 'wine',      emoji: '🍷', price: 5, name: 'Вино' },
  { id: 'mojito',    emoji: '🍸', price: 5, name: 'Мохито' },
  { id: 'cocktail',  emoji: '🍹', price: 5, name: 'Коктейль' },
  { id: 'tequila',   emoji: '🍋', price: 5, name: 'Текила' },
  { id: 'oscar',     emoji: '🏆', price: 7, name: 'Статуэтка' },
  { id: 'cognac',    emoji: '🥃', price: 5, name: 'Коньяк' },
];

export const GiftModal: React.FC<{
  coins: number;
  /** кому дарим: имя клаббера или ничего — тогда это DJ */
  targetName?: string;
  /** свой каталог подарков; по умолчанию — базовый список выше */
  items?: GiftItem[];
  busy?: boolean;
  onClose: () => void;
  onSend: (gift: GiftItem) => void;
}> = ({ coins, targetName, items, busy, onClose, onSend }) => {
  const [active, setActive] = useState<string | null>(null);
  const list = items ?? GIFTS;

  return (
    <Modal title={`Подарок для ${targetName ?? 'DJ'}`} onClose={onClose}>
      <div className="modal__body">
        <div className="gift-grid">
          {list.map((g) => (
            <button
              key={g.id}
              className={'gift' + (active === g.id ? ' gift--active' : '')}
              title={g.name}
              disabled={busy || coins < g.price}
              onClick={() => {
                setActive(g.id);
                onSend(g);
              }}
            >
              {g.icon
                ? <img className="gift__icon" src={g.icon} alt={g.name} />
                : <span className="gift__emoji">{g.emoji ?? '🎁'}</span>}
              <span className="gift__price"><span className="gift__coin" />{g.price}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};

/* ---------- очередь ---------- */
export const QueueModal: React.FC<{
  minutes: number;
  skipPrice: number;
  coins: number;
  onClose: () => void;
  onSkip: () => void;
}> = ({ minutes, skipPrice, coins, onClose, onSkip }) => (
  <Modal title="Очередь" onClose={onClose}>
    <div className="modal__body">
      <div className="modal__frame">
        <p className="modal__text">
          Твой трек будет играть примерно через {minutes} минут.<br />
          Но, если очень хочется, то можно не ждать!<br />
          Встать в начало очереди стоит несколько монеток.
        </p>
        <div className="gift__price" style={{ justifyContent: 'center', marginTop: 16, fontSize: 16 }}>
          <span className="gift__coin" style={{ width: 18, height: 18 }} />
          {skipPrice}
        </div>
        <button className="btn-primary" disabled={coins < skipPrice} onClick={onSkip}>
          Встать в начало
        </button>
      </div>
    </div>
  </Modal>
);

/* ---------- результат трека ---------- */
export const TrackResultModal: React.FC<{
  artist: string;
  title: string;
  likes: number;
  dislikes: number;
  gifts: number;
  points: number;
  onClose: () => void;
  onBrag: () => void;
}> = ({ artist, title, likes, dislikes, gifts, points, onClose, onBrag }) => (
  <Modal title="Ты сыграл трек!" onClose={onClose} width={400}>
    <div className="modal__body">
      <div className="result__artist">{artist}</div>
      <div className="result__title">{title}</div>

      <div className="result__stats">
        <div className="result__stat"><span>👎</span><span>{dislikes}</span></div>
        <div className="result__stat"><span>👍</span><span>{likes}</span></div>
        <div className="result__stat"><span>🍹</span><span>{gifts}</span></div>
      </div>

      <div style={{ display: 'grid', justifyItems: 'center' }}>
        <div className="result__points">Ты получил {points} очков</div>
        <button className="btn-primary" onClick={onBrag}>Хвастаться!</button>
      </div>
    </div>
  </Modal>
);

/* ---------- группа клуба ---------- */
export const ClubGroupModal: React.FC<{
  clubName: string;
  isMember: boolean;
  onClose: () => void;
  onJoin: () => void;
}> = ({ clubName, isMember, onClose, onJoin }) => (
  <Modal title="Группа клуба" onClose={onClose}>
    <div className="modal__body">
      <div className="modal__frame">
        <p className="modal__text">
          В группе клуба<br /><b>{clubName}</b><br />публикуются новости и события клуба.
        </p>
        <p className="modal__text" style={{ marginTop: 14 }}>
          {isMember ? 'Ты уже в группе клуба' : <>Ты НЕ состоишь в группе клуба<br /><b>{clubName}</b></>}
        </p>
        {!isMember && <button className="btn-primary" onClick={onJoin}>В группу</button>}
      </div>
    </div>
  </Modal>
);

/* ---------- помощь ---------- */
export const HelpModal: React.FC<{ onClose: () => void; groupUrl?: string }> = ({ onClose, groupUrl }) => (
  <Modal title="Помощь" onClose={onClose} width={520}>
    <div className="help__body">
      <h4>Правила поведения</h4>
      <ul>
        <li>Не матерись в чате</li>
        <li>Не оскорбляй других клабберов</li>
        <li>Не флуди</li>
        <li>Не спамь</li>
        <li>Если ты хозяин клуба, не спамь в чатах других клубов</li>
      </ul>

      <h4>Создание клуба</h4>
      <p>
        В игре создано много клубов на любой вкус. Если хочешь создать свой — открой список клубов
        (кнопка «ВЫХОД» слева сверху) и нажми «Создать свой клуб». Клуб создаётся на основе сообщества
        ВК, где ты админ или редактор: оттуда берутся название и логотип.
      </p>

      <h4>Почему у меня исчезают очки из ТОПа?</h4>
      <p>
        В каждом клубе есть ТОП за неделю. Очки, полученные больше недели назад, из общего количества
        вычитаются.
      </p>

      {groupUrl && (
        <p>Остались вопросы — заходи в паблик игры: <a href={groupUrl} target="_blank" rel="noreferrer">В Клубе</a></p>
      )}
    </div>
  </Modal>
);
