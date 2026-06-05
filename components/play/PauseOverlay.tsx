'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, LogOut, Heart } from 'lucide';
import { LucideIcon } from '@/components/shell/LucideIcon';
import { NeonButton } from '@/components/shell/AppShell';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { mountPauseAdInContainer, hidePauseAdSlot } from '@/lib/ads/pauseAdSlot';
import type { PauseOverlayData } from '@/lib/shell/pauseOverlayTypes';
import { pauseOverlayQuitToMenu, pauseOverlayResume } from '@/lib/shell/pauseOverlayActions';
import { Monetization } from '@/src/systems/Monetization.js';
import { PLAY_COPY } from '@/lib/copy/play';

type Props = {
  data: PauseOverlayData;
};

const C = PLAY_COPY.pause;

export function PauseOverlay({ data }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const adRef = useRef<HTMLDivElement>(null);
  const [showAd, setShowAd] = useState(false);

  useFocusTrap(cardRef, true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        pauseOverlayResume();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
      <div className="pause-overlay__card" ref={cardRef} tabIndex={-1}>
        <header className="pause-overlay__head">
          <p className="pause-overlay__eyebrow">{C.eyebrow}</p>
          <h2 id="pause-overlay-title" className="pause-overlay__title">
            {C.title}
          </h2>
        </header>

        <div className="pause-overlay__stats" aria-label="Run stats">
          <span className="pause-overlay__chip">
            <span className="pause-overlay__chip-label">{C.stats.level}</span>
            <span className="pause-overlay__chip-val">{data.level}</span>
          </span>
          <span className="pause-overlay__chip pause-overlay__chip--score">
            <span className="pause-overlay__chip-label">{C.stats.score}</span>
            <span className="pause-overlay__chip-val">{data.score.toLocaleString()}</span>
          </span>
          <span className="pause-overlay__chip pause-overlay__chip--lives">
            <LucideIcon icon={Heart} size={14} className="pause-overlay__chip-icon" label="Lives" />
            <span className="pause-overlay__chip-val">{data.lives}</span>
          </span>
          {(data.combo ?? 0) > 1 ? (
            <span className="pause-overlay__chip pause-overlay__chip--combo">
              <span className="pause-overlay__chip-label">{C.stats.combo}</span>
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
              {C.resume}
            </NeonButton>
            <NeonButton
              variant="danger"
              icon={LogOut}
              className="pause-overlay__quit"
              onClick={() => pauseOverlayQuitToMenu()}
            >
              {C.quit}
            </NeonButton>
          </div>

          {showAd ? (
            <div className="pause-overlay__ad-wrap">
              <span className="pause-overlay__ad-label">{C.adLabel}</span>
              <div
                ref={adRef}
                id="pause-ad-slot"
                className="pause-ad-slot pause-overlay__ad pause-ad-slot--inline"
                aria-hidden="false"
              />
            </div>
          ) : null}
        </div>

        <p className="pause-overlay__hint">{C.hint}</p>
      </div>
    </div>
  );
}
