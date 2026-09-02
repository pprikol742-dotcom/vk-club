import React, { useEffect, useRef, useState } from 'react';
import { EmojiPanel } from './EmojiPanel';
import { TITLES, type TitleId } from '../../config/titles';

export type ChatMessage =
  | { id: string; kind: 'text'; from: string; fromId?: string; to?: string; toId?: string; text: string; mine?: boolean }
  | { id: string; kind: 'reaction'; from: string; fromId?: string; to: string; toId?: string; emoji: string; mine?: boolean }
  | { id: string; kind: 'system'; text: string; icon?: string }
  | { id: string; kind: 'title'; name: string; title: TitleId; female?: boolean }
  | { id: string; kind: 'admin'; text: string };

interface Props {
  messages: ChatMessage[];
  emojiSubscribed: boolean;
  emojiPrice: number;
  onSend: (text: string) => void;
  onOpenProfile: (userId: string) => void;
  onSubscribeEmoji: () => void;
}

export const ChatPanel: React.FC<Props> = ({
  messages, emojiSubscribed, emojiPrice, onSend, onOpenProfile, onSubscribeEmoji,
}) => {
  const [value, setValue] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [pinned, setPinned] = useState(true);      // прокрутка приклеена к низу
  const [unread, setUnread] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollDown = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setUnread(0);
    setPinned(true);
  };

  useEffect(() => {
    if (pinned) scrollDown();
    else setUnread((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setPinned(atBottom);
    if (atBottom) setUnread(0);
  };

  const send = () => {
    const t = value.trim();
    if (!t) return;
    onSend(t);
    setValue('');
    scrollDown();
  };

  const nick = (name: string, id?: string, cls = 'msg__head') => (
    <span className={cls} onClick={() => id && onOpenProfile(id)} role={id ? 'button' : undefined}>
      {name}
    </span>
  );

  return (
    <aside className="chat">
      <div className="chat__list" ref={listRef} onScroll={onScroll}>
        {messages.map((m) => {
          if (m.kind === 'admin') {
            return (
              <div key={m.id} className="msg msg--admin">
                <div className="msg__head">Администратор</div>
                <div className="msg__text">{m.text}</div>
              </div>
            );
          }
          if (m.kind === 'title') {
            const t = TITLES[m.title];
            return (
              <div key={m.id} className="msg msg--title" style={{ color: t.color }} title={t.hint}>
                {t.icon} {m.name} {m.female ? 'получила' : 'получил'} звание {t.label}
              </div>
            );
          }
          if (m.kind === 'system') {
            return (
              <div key={m.id} className="msg msg--system msg--right">
                {m.icon ?? '🏆'} {m.text}
              </div>
            );
          }
          if (m.kind === 'reaction') {
            return (
              <div key={m.id} className={'msg' + (m.mine ? ' msg--right' : '')}>
                {nick(m.from, m.fromId)} <span>{m.emoji}</span> {nick(m.to, m.toId, 'msg__to')}
              </div>
            );
          }
          return (
            <div key={m.id} className={'msg' + (m.mine ? ' msg--right' : '')}>
              <div>
                {nick(m.from, m.fromId)}
                {m.to && <> 💬 {nick(m.to, m.toId, 'msg__to')}</>}
              </div>
              <div className="msg__text">{m.text}</div>
            </div>
          );
        })}
      </div>

      {unread > 0 && (
        <button className="chat__new" onClick={scrollDown}>⌄ Новые сообщения</button>
      )}

      {showEmoji && (
        <EmojiPanel
          subscribed={emojiSubscribed}
          price={emojiPrice}
          onPick={(e) => setValue((v) => v + e)}
          onSubscribe={onSubscribeEmoji}
          onClose={() => setShowEmoji(false)}
        />
      )}

      <div className="chat__input">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="введи сообщение"
          aria-label="Сообщение в чат"
        />
        <span
          className="chat__emoji"
          role="button"
          title="Смайлики"
          onClick={() => setShowEmoji((s) => !s)}
        >
          🙂
        </span>
      </div>
    </aside>
  );
};
