import React from 'react';
import ClubCover from './ClubCover';
import './ClubCover.css';
import { supabase } from '../../lib/supabase';

export interface ClubCard {
  id: string;
  title: string;
  cover: string;
  online: number;
  ownerName: string;
  /** что играет прямо сейчас */
  nowPlaying?: string;
  /** id сообщества ВК — из него берём обложку */
  vkGroupId?: number | null;
  /** уже сохранённая обложка, показывается мгновенно */
  coverUrl?: string | null;
}

interface Props {
  clubs: ClubCard[];
  votes?: number;
  onEnter: (clubId: string) => void;
  onCreate: () => void;
  onHelp?: () => void;
}

export const ClubList: React.FC<Props> = ({ clubs, onEnter, onCreate }) => (
  <div className="clublist-page">
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
              <ClubCover
                vkGroupId={c.vkGroupId}
                cachedUrl={c.coverUrl}
                alt={c.title}
                onResolved={(url) => {
                  void supabase.rpc('set_club_cover', { p_club_id: c.id, p_url: url });
                }}
              />
              <span className="club-card__online">👤 {c.online}</span>
            </div>
            <div className="club-card__owner">▶ {c.ownerName}</div>
            {c.nowPlaying && <div className="club-card__track">{c.nowPlaying}</div>}
          </button>
        ))}
      </div>
    </div>

    <footer className="page-footer">Разработчик: <b>▶ В Клубе</b></footer>
  </div>
);
