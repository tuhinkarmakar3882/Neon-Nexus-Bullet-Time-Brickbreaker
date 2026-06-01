'use client';

import { Heart, Pause, Gem, Leaf } from 'lucide';
import { LucideIcon } from '@/components/shell/LucideIcon';
import type { GameplayHudState } from '@/lib/shell/gameplayHudTypes';
import { emitGameplayRequest } from '@/lib/shell/useGameplayHudState';

const MAX_HEARTS = 4;

function MeterRail({
  id,
  side,
  label,
  ratio,
  ready,
  accentClass,
  onTap,
}: {
  id: string;
  side: 'left' | 'right';
  label: string;
  ratio: number;
  ready: boolean;
  accentClass: string;
  onTap: () => void;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  return (
    <aside
      id={id}
      className={`play-hud-rail play-hud-rail--${side} play-hud-interactive${ready ? ' play-hud-rail--ready' : ''}`}
      aria-label={`${label} meter`}
    >
      <button
        type="button"
        className={`play-hud-rail__btn ${accentClass}`}
        onClick={onTap}
        aria-label={`Activate ${label}`}
      >
        <span className="play-hud-rail__label">{label}</span>
        <span className="play-hud-rail__track" aria-hidden>
          <span className="play-hud-rail__fill" style={{ height: `${pct}%` }} />
        </span>
      </button>
    </aside>
  );
}

/** Single-row play header — lives, score, level/bricks, wallet, pause. */
export function GameplayHud({ state }: { state: GameplayHudState }) {
  const hearts = Math.min(state.lives, MAX_HEARTS);
  const extraLives = state.lives > MAX_HEARTS ? state.lives - MAX_HEARTS : 0;
  const showProgress = !state.immersive;
  const combo =
    state.combo >= 2
      ? state.gambitReady
        ? `×${state.combo}!`
        : `×${state.combo}`
      : '';

  return (
    <>
      <header
        id="play-hud-top"
        className={`play-hud-bar play-hud-interactive${state.scramble ? ' play-hud-bar--scramble' : ''}`}
        data-life-pulse={state.lifePulse > 0 ? state.lifePulse : undefined}
      >
        <div className="play-hud-bar__inner">
          <div className="play-hud-lives" aria-label={`${state.lives} lives`} key={`lives-${state.lives}`}>
            {Array.from({ length: hearts }, (_, i) => (
              <LucideIcon
                key={`${state.lives}-${i}`}
                icon={Heart}
                size={13}
                className="play-hud-heart"
                label={i === 0 ? `${state.lives} lives` : undefined}
              />
            ))}
            {extraLives > 0 ? <span className="play-hud-lives__more">+{extraLives}</span> : null}
          </div>

          <div className="play-hud-main">
            {state.slowActive ? (
              <span className="play-hud-tag play-hud-tag--slow">{state.slowLabel}</span>
            ) : null}
            <span className="play-hud-score">{state.score.toLocaleString()}</span>
            {combo ? (
              state.gambitReady ? (
                <button
                  type="button"
                  className="play-hud-combo play-hud-combo--cash"
                  onClick={() => emitGameplayRequest('req:gambit')}
                >
                  {combo}
                </button>
              ) : (
                <span className="play-hud-combo">{combo}</span>
              )
            ) : null}
          </div>

          {showProgress ? (
            <span
              className="play-hud-progress"
              aria-label={`Level ${state.level}, ${state.bricksLeft} bricks remaining`}
              title={`Level ${state.level} · ${state.bricksLeft} bricks`}
            >
              <span className="play-hud-progress__lv">{state.level}</span>
              <span className="play-hud-progress__dot" aria-hidden>
                ·
              </span>
              <span className="play-hud-progress__br">{state.bricksLeft}</span>
            </span>
          ) : null}

          <div className="play-hud-wallet" aria-label="Gems and treasury">
            <span className="play-hud-wallet__item">
              <LucideIcon icon={Gem} size={11} className="play-hud-wallet__icon play-hud-wallet__icon--gem" label="Gems" />
              <span>{state.gems.toLocaleString()}</span>
            </span>
            <span className="play-hud-wallet__item">
              <LucideIcon icon={Leaf} size={11} className="play-hud-wallet__icon play-hud-wallet__icon--leaf" label="Treasury" />
              <span>{state.treasury.toLocaleString()}</span>
            </span>
          </div>

          <button
            type="button"
            className="play-hud-pause"
            onClick={() => emitGameplayRequest('req:pause')}
            aria-label="Pause game"
          >
            <LucideIcon icon={Pause} size={16} label="Pause" />
          </button>
        </div>
      </header>

      <MeterRail
        id="play-hud-left"
        side="left"
        label="GNOME"
        ratio={state.gnomeRatio}
        ready={state.gnomeReady}
        accentClass="play-hud-rail--gnome"
        onTap={() => emitGameplayRequest('req:gnome')}
      />
      <MeterRail
        id="play-hud-right"
        side="right"
        label="NEXUS"
        ratio={state.nexusRatio}
        ready={state.nexusReady}
        accentClass="play-hud-rail--nexus"
        onTap={() => emitGameplayRequest('req:nexus')}
      />
    </>
  );
}
