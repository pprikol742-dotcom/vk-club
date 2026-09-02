import React from 'react';
import { LAYOUT } from '../../config/clubTheme';
import type { FxSettings } from '../../store/uiStore';

/**
 * Живой слой поверх статичного фона: вращающийся шар, цветные лучи,
 * дым, мигающая гирлянда и пульсация настенного неона.
 * Каждый эффект гасится отдельно в настройках.
 */
export const ClubFxLayer: React.FC<{ fx: FxSettings }> = ({ fx }) => (
  <div className="fx-layer">
    {fx.beams && (
      <div className="fx-beams" style={{ left: LAYOUT.discoBall.left, top: LAYOUT.discoBall.top }}>
        <span className="fx-beam fx-beam--cyan" />
        <span className="fx-beam fx-beam--green" />
        <span className="fx-beam fx-beam--pink" />
        <span className="fx-beam fx-beam--violet" />
      </div>
    )}

    {fx.discoBall && (
      <div className="fx-ball" style={{ left: LAYOUT.discoBall.left, top: LAYOUT.discoBall.top }}>
        <span className="fx-ball__shine" />
      </div>
    )}

    {fx.smoke && (
      <div className="fx-smoke">
        <span className="fx-smoke__puff fx-smoke__puff--1" />
        <span className="fx-smoke__puff fx-smoke__puff--2" />
        <span className="fx-smoke__puff fx-smoke__puff--3" />
      </div>
    )}

    {fx.bulbs && <div className="fx-bulbs" />}

    {fx.wallNeon && (
      <>
        <div className="fx-wall fx-wall--left" />
        <div className="fx-wall fx-wall--right" />
      </>
    )}

    {fx.floorLights && <div className="fx-floor" />}
  </div>
);
