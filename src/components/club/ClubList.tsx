import React from 'react';

export interface ClubCard {
  id: string;
  title: string;
  cover: string;
  online: number;
  ownerName: string;
  /** что играет прямо сейчас */
  nowPlaying?: string;
}

interface Props {
  clubs: ClubCard[];
  votes: number;
  onEnter: (clubId: string) => void;
  onCreate: () => void;
  onHelp: () => void;
}

export const ClubList: React.FC<Props> = ({ clubs, votes, onEnter, onCreate, onHelp }) => (
  <div className="clublist-page">
    <div className="topbar">
      <div className="topbar__left">▶ В Клубе</div>
      <div className="topbar__right">
        <span className="topbar__link" onClick={onHelp}>Помощь</span>
        <span className="topbar__votes">У вас <b>{votes}</b> голосов</span>
        <span className="topbar__link">Действия ⌄</span>
      </div>
    </div>

    <button className="create-club-tab" onClick={onCreate}>
      <span>⊕</span> Создай свой клуб
    </button>

    <div className="clublist">
      <div className="clublist__head">Выбери клуб</div>
      <div className="clublist__grid">
        {clubs.map((c) => (
          <button key={c.id} className="club-card" onClick={() => onEnter(c.id)}>
            <div className="club-card__title">{c.title}</div>
            <div className="club-card__cover">
              <img src={c.cover} alt="" />
              <span className="club-card__online">👤 {c.online}</span>
            </div>
            <div className="club-card__owner">▶ {c.ownerName}</div>
            {c.nowPlaying && <div className="club-card__track">{c.nowPlaying}</div>}
          </button>
        ))}
      </div>
    </div>

    <footer className="page-footer">Разработчик: ▶ В Клубе</footer>
  </div>
);
