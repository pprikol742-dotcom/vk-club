import React from 'react';
import { useUi, FX_LABELS, type FxSettings } from '../../store/uiStore';

/** Выпадающая панель: гасим любой эффект по отдельности. */
export const EffectsMenu: React.FC = () => {
  const { fx, fxMenuOpen, toggleFx, setAllFx, toggleFxMenu } = useUi();
  if (!fxMenuOpen) return null;

  const keys = Object.keys(FX_LABELS) as Array<keyof FxSettings>;
  const allOn = keys.every((k) => fx[k]);

  return (
    <div className="fx-menu">
      <div className="fx-menu__head">
        Свет и эффекты
        <button className="fx-menu__close" onClick={toggleFxMenu} aria-label="Закрыть">✕</button>
      </div>

      {keys.map((k) => (
        <label key={k} className="fx-menu__row">
          <input type="checkbox" checked={fx[k]} onChange={() => toggleFx(k)} />
          <span>{FX_LABELS[k]}</span>
        </label>
      ))}

      <button className="fx-menu__all" onClick={() => setAllFx(!allOn)}>
        {allOn ? 'Выключить всё' : 'Включить всё'}
      </button>
    </div>
  );
};
