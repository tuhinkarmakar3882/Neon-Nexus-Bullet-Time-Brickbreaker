'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Home, Share2, Play } from 'lucide';
import { NeonButton } from '@/components/shell/AppShell';
import { mountGameOverAdInContainer, hideInlineOverlayAd } from '@/lib/ads/pauseAdSlot';
import type { GameOverOverlayData } from '@/lib/shell/gameOverOverlayTypes';
import {
  gameOverOverlayMainMenu,
  gameOverOverlayRestart,
  gameOverOverlayShare,
  gameOverOverlayWatchContinue,
} from '@/lib/shell/gameOverOverlayActions';
import { Monetization } from '@/src/systems/Monetization.js';

type Props = {
  data: GameOverOverlayData;
};

export function GameOverOverlay({ data }: Props) {
  const adRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAd, setShowAd] = useState(false);

  const continueLabel = data.adsReady ? 'Watch video & continue' : 'Continue';

  useEffect(() => {
    Monetization.applyConfig();
    setShowAd(!Monetization.removeAds && Monetization.getProviderName() !== 'noop');
  }, []);

  useEffect(() => {
    const el = adRef.current;
    if (!el || !showAd) return;
    mountGameOverAdInContainer(el);
    return () => hideInlineOverlayAd(el);
  }, [showAd, data.score]);

  const onContinue = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setStatus(data.adsReady ? 'Loading video…' : '');
    try {
      const msg = await gameOverOverlayWatchContinue();
      if (msg) setStatus(msg);
    } finally {
      setBusy(false);
    }
  }, [busy, data.adsReady]);

  const onShare = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setStatus('Preparing share card…');
    try {
      const msg = await gameOverOverlayShare({
        score: data.score,
        highScore: data.highScore,
        isNewBest: data.isNewBest,
        level: data.level,
        lives: data.lives,
      });
      setStatus(msg);
    } finally {
      setBusy(false);
    }
  }, [busy, data.score, data.highScore, data.isNewBest, data.level, data.lives]);

  return (
    <div
      className="game-over-overlay play-hud-interactive"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-overlay-title"
    >
      <div className="game-over-overlay__card">
        <header className="game-over-overlay__head">
          <h2 id="game-over-overlay-title" className="game-over-overlay__title">
            Game over
          </h2>
          {data.message ? (
            <p className="game-over-overlay__message">{data.message}</p>
          ) : null}
        </header>

        <div className="game-over-overlay__scores" aria-label="Run results">
          <p className="game-over-overlay__score">
            <span className="game-over-overlay__score-label">Score</span>
            <span className="game-over-overlay__score-val">{data.score.toLocaleString()}</span>
          </p>
          <p className="game-over-overlay__best">
            <span className="game-over-overlay__best-label">Personal best</span>
            <span className="game-over-overlay__best-val">{data.highScore.toLocaleString()}</span>
          </p>
          {data.isNewBest ? (
            <p className="game-over-overlay__new-best" role="status">
              New personal best
            </p>
          ) : null}
        </div>

        <div className="game-over-overlay__body">
          <div className="game-over-overlay__actions">
            <NeonButton
              variant="economy"
              icon={Play}
              className="game-over-overlay__continue"
              onClick={onContinue}
              disabled={busy}
            >
              {continueLabel}
            </NeonButton>
            <NeonButton
              variant="secondary"
              icon={RotateCcw}
              className="game-over-overlay__restart"
              onClick={() => gameOverOverlayRestart()}
              disabled={busy}
            >
              Restart
            </NeonButton>
            <NeonButton
              variant="danger"
              icon={Home}
              className="game-over-overlay__menu"
              onClick={() => gameOverOverlayMainMenu()}
              disabled={busy}
            >
              Main menu
            </NeonButton>
            <NeonButton
              variant={data.isNewBest ? 'primary' : 'secondary'}
              icon={Share2}
              className="game-over-overlay__share"
              onClick={onShare}
              disabled={busy}
            >
              {data.isNewBest ? 'Share your new best' : 'Challenge friends'}
            </NeonButton>
          </div>

          {showAd ? (
            <div className="game-over-overlay__ad-wrap">
              <span className="game-over-overlay__ad-label">Advertisement</span>
              <div
                ref={adRef}
                id="game-over-ad-slot"
                className="pause-ad-slot game-over-overlay__ad pause-ad-slot--inline"
                aria-hidden="false"
              />
            </div>
          ) : null}
        </div>

        {status ? (
          <p className="game-over-overlay__status" role="status" aria-live="polite">
            {status}
          </p>
        ) : null}

        <p className="game-over-overlay__hint">Press Esc for main menu</p>
      </div>
    </div>
  );
}
