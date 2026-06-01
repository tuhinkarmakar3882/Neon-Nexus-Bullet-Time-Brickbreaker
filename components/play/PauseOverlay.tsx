'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Settings, LogOut, Heart } from 'lucide';
import { LucideIcon } from '@/components/shell/LucideIcon';
import { NeonButton } from '@/components/shell/AppShell';
import { mountPauseAdInContainer, hidePauseAdSlot } from '@/lib/ads/pauseAdSlot';
import type { PauseOverlayData } from '@/lib/shell/pauseOverlayTypes';
import {
  pauseOverlayOpenSettings,
  pauseOverlayQuitToMenu,
  pauseOverlayResume,
} from '@/lib/shell/pauseOverlayActions';
import { Monetization } from '@/src/systems/Monetization.js';

type Props = {
  data: PauseOverlayData;
};

export function PauseOverlay({ data }: Props) {
  const adRef = useRef<HTMLDivElement>(null);
  const [showAd, setShowAd] = useState(false);

  useEffect(() => {
    Monetization.applyConfig();
    setShowAd(!Monetization.removeAds && Monetization.getProviderName() !== 'noop');
  }, []);

  useEffect(() => {
    const el = adRef.current;
    if (!el || !showAd) return;
    mountPauseAdInContainer(el);
    return () => hidePauseAdSlot();
  }, [showAd, data.level]);

  return (
    <div
      className="pause-overlay play-hud-interactive"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-overlay-title"
    >
      <div className="pause-overlay__card">
        <header className="pause-overlay__head">
          <p className="pause-overlay__eyebrow">Siege halted</p>
          <h2 id="pause-overlay-title" className="pause-overlay__title">
            Game paused
          </h2>
        </header>

        <div className="pause-overlay__stats" aria-label="Run stats">
          <span className="pause-overlay__chip">
            <span className="pause-overlay__chip-label">Level</span>
            <span className="pause-overlay__chip-val">{data.level}</span>
          </span>
          <span className="pause-overlay__chip pause-overlay__chip--score">
            <span className="pause-overlay__chip-label">Score</span>
            <span className="pause-overlay__chip-val">{data.score.toLocaleString()}</span>
          </span>
          <span className="pause-overlay__chip pause-overlay__chip--lives">
            <LucideIcon icon={Heart} size={14} className="pause-overlay__chip-icon" label="Lives" />
            <span className="pause-overlay__chip-val">{data.lives}</span>
          </span>
          {(data.combo ?? 0) > 1 ? (
            <span className="pause-overlay__chip pause-overlay__chip--combo">
              <span className="pause-overlay__chip-label">Combo</span>
              <span className="pause-overlay__chip-val">×{data.combo}</span>
            </span>
          ) : null}
        </div>

        <div className="pause-overlay__body">
          <div className="pause-overlay__actions">
            <NeonButton
              variant="primary"
              icon={Play}
              className="pause-overlay__resume"
              onClick={() => pauseOverlayResume()}
            >
              Resume
            </NeonButton>
            <div className="pause-overlay__row">
              <NeonButton
                variant="secondary"
                icon={Settings}
                className="pause-overlay__half"
                onClick={() => pauseOverlayOpenSettings()}
              >
                Settings
              </NeonButton>
              <NeonButton
                variant="danger"
                icon={LogOut}
                className="pause-overlay__half pause-overlay__quit"
                onClick={() => pauseOverlayQuitToMenu()}
              >
                Quit to menu
              </NeonButton>
            </div>
          </div>

          {showAd ? (
            <div className="pause-overlay__ad-wrap">
              <span className="pause-overlay__ad-label">Advertisement</span>
              <div
                ref={adRef}
                id="pause-ad-slot"
                className="pause-ad-slot pause-overlay__ad pause-ad-slot--inline"
                aria-hidden="false"
              />
            </div>
          ) : null}
        </div>

        <p className="pause-overlay__hint">Press P or Esc to resume</p>
      </div>
    </div>
  );
}
