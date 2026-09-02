import React, { useState } from 'react';
import { useUi } from '../../store/uiStore';
import { LAYOUT, TUNABLE, TUNABLE_LABELS, type TunableKey } from '../../config/clubTheme';

const num = (v: string | undefined, fallback = 0) =>
  v === undefined ? fallback : parseFloat(String(v));

/** Текущее значение с учётом поправки. */
export function tuned(key: TunableKey, tweak: ReturnType<typeof useUi.getState>['tweak']) {
  const base = LAYOUT[key] as Record<string, string>;
  const t = tweak[key] ?? {};
  const left = t.x ?? num(base.left, num(base.right, 0));
  const top = t.y ?? num(base.top);
  const width = t.w ?? num(base.width, NaN);

  const style: React.CSSProperties = { left: `${left}%`, top: `${top}%` };
  if (!Number.isNaN(width)) style.width = `${width}%`;
  return style;
}

/**
 * Двигаем элементы ползунками и сразу видим результат.
 * Кнопка «Скопировать» кладёт готовые числа в буфер обмена.
 */
export const LayoutTuner: React.FC = () => {
  const { tunerOpen, toggleTuner, tweak, setTweak, resetTweak, avatarSize, setAvatarSize } = useUi();
  const [key, setKey] = useState<TunableKey>('sign');
  const [copied, setCopied] = useState(false);

  if (!tunerOpen) return null;

  const base = LAYOUT[key] as Record<string, string>;
  const cur = tweak[key] ?? {};
  const x = cur.x ?? num(base.left, num(base.right, 0));
  const y = cur.y ?? num(base.top);
  const hasWidth = base.width !== undefined;
  const w = cur.w ?? num(base.width, 0);

  const copy = () => {
    const lines = TUNABLE.map((k) => {
      const b = LAYOUT[k] as Record<string, string>;
      const t = tweak[k] ?? {};
      const parts = [
        `left: '${(t.x ?? num(b.left, 0)).toFixed(1)}%'`,
        `top: '${(t.y ?? num(b.top)).toFixed(1)}%'`,
      ];
      if (b.width !== undefined) parts.push(`width: '${(t.w ?? num(b.width)).toFixed(1)}%'`);
      return `  ${k}: { ${parts.join(', ')} },`;
    });
    const text = `avatar: ${avatarSize}px\n${lines.join('\n')}`;
    navigator.clipboard?.writeText(text).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 1800); },
      () => window.prompt('Скопируй вручную:', text),
    );
  };

  return (
    <div className="tuner">
      <div className="tuner__head">
        Подгонка раскладки
        <button className="tuner__close" onClick={toggleTuner} aria-label="Закрыть">✕</button>
      </div>

      <select className="tuner__select" value={key} onChange={(e) => setKey(e.target.value as TunableKey)}>
        {TUNABLE.map((k) => (
          <option key={k} value={k}>{TUNABLE_LABELS[k]}</option>
        ))}
      </select>

      <label className="tuner__row">
        <span>По горизонтали</span>
        <b>{x.toFixed(1)}%</b>
        <input type="range" min={0} max={100} step={0.5} value={x}
          onChange={(e) => setTweak(key, { x: parseFloat(e.target.value) })} />
      </label>

      <label className="tuner__row">
        <span>По вертикали</span>
        <b>{y.toFixed(1)}%</b>
        <input type="range" min={0} max={100} step={0.5} value={y}
          onChange={(e) => setTweak(key, { y: parseFloat(e.target.value) })} />
      </label>

      {hasWidth && (
        <label className="tuner__row">
          <span>Ширина</span>
          <b>{w.toFixed(1)}%</b>
          <input type="range" min={10} max={100} step={0.5} value={w}
            onChange={(e) => setTweak(key, { w: parseFloat(e.target.value) })} />
        </label>
      )}

      <label className="tuner__row">
        <span>Размер аватарок</span>
        <b>{avatarSize}px</b>
        <input type="range" min={40} max={140} step={2} value={avatarSize}
          onChange={(e) => setAvatarSize(parseInt(e.target.value, 10))} />
      </label>

      <div className="tuner__buttons">
        <button className="tuner__btn" onClick={copy}>{copied ? 'Скопировано' : 'Скопировать'}</button>
        <button className="tuner__btn tuner__btn--ghost" onClick={resetTweak}>Сбросить</button>
      </div>
    </div>
  );
};
