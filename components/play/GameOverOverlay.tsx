'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Home, Share2, Play } from 'lucide';
import { NeonButton } from '@/components/shell/AppShell';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { mountGameOverAdInContainer, hideInlineOverlayAd } from '@/lib/ads/pauseAdSlot';
import type { GameOverOverlayData } from '@/lib/shell/gameOverOverlayTypes';
import {
  gameOverOverlayMainMenu,
  gameOverOverlayRestart,
  gameOverOverlayShare,
  gameOverOverlayInventoryContinue,
  gameOverOverlayWatchContinue,
} from '@/lib/shell/gameOverOverlayActions';
import { Monetization } from '@/src/systems/Monetization.js';
import { PLAY_COPY } from '@/lib/copy/play';
import { trackGameOverAction } from '@/lib/analytics/shellAnalytics';

type Props = {
  data: GameOverOverlayData;
};

const C = PLAY_COPY.gameOver;

export function GameOverOverlay({ data }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const adRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('');
  const [busyContinue, setBusyContinue] = useState(false);
  const [busyShare, setBusyShare] = useState(false);
  const [quitConfirm, setQuitConfirm] = useState(false);
  const [showAd, setShowAd] = useState(false);

  useFocusTrap(cardRef, true);

  const continueLabel = data.adsReady ? C.continue : C.continueNoAd;
  const shareLabel = data.isNewBest ? C.shareNewBest : C.shareChallenge;

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

  const onQuitToMenu = useCallback(() => {
    trackGameOverAction('menu');
    gameOverOverlayMainMenu();
  }, []);

  const onRestart = useCallback(() => {
    trackGameOverAction('restart');
    gameOverOverlayRestart();
  }, []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (quitConfirm) {
        setQuitConfirm(false);
        return;
      }
      if (data.score > 0) {
        setQuitConfirm(true);
        return;
      }
      onQuitToMenu();
    };
    window.addEventListener('keydown', onEsc, true);
    return () => window.removeEventListener('keydown', onEsc, true);
  }, [quitConfirm, data.score, onQuitToMenu]);

  const onInventoryContinue = useCallback(() => {
    if (busyContinue || data.continues <= 0) return;
    setQuitConfirm(false);
    trackGameOverAction('inventory_continue');
    gameOverOverlayInventoryContinue();
  }, [busyContinue, data.continues]);

  const onContinue = useCallback(async () => {
    if (busyContinue) return;
    setQuitConfirm(false);
    setBusyContinue(true);
    setStatus(data.adsReady ? C.loadingVideo : '');
    trackGameOverAction('continue');
    try {
      const msg = await gameOverOverlayWatchContinue();
      if (msg) setStatus(msg);
    } finally {
      setBusyContinue(false);
    }
  }, [busyContinue, data.adsReady]);

  const onShare = useCallback(async () => {
    if (busyShare) return;
    setBusyShare(true);
    setStatus(C.preparingShare);
    trackGameOverAction('share');
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
      setBusyShare(false);
    }
  }, [busyShare, data.score, data.highScore, data.isNewBest, data.level, data.lives]);

  return (
    <div
      className="game-over-overlay play-hud-interactive"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-overlay-title"
    >
      <div className="game-over-overlay__card" ref={cardRef} tabIndex={-1}>
        <header className="game-over-overlay__head">
          <h2 id="game-over-overlay-title" className="game-over-overlay__title">
            {C.title}
          </h2>
          {data.message ? (
            <p className="game-over-overlay__message">{data.message}</p>
          ) : null}
        </header>

        <div className="game-over-overlay__scores" aria-label="Run results">
          <p className="game-over-overlay__score">
            <span className="game-over-overlay__score-label">{C.score}</span>
            <span className="game-over-overlay__score-val">{data.score.toLocaleString()}</span>
          </p>
          <p className="game-over-overlay__best">
            <span className="game-over-overlay__best-label">{C.best}</span>
            <span className="game-over-overlay__best-val">{data.highScore.toLocaleString()}</span>
          </p>
          {data.isNewBest ? (
            <p className="game-over-overlay__new-best" role="status">
              {C.newBest}
            </p>
          ) : null}
        </div>

        {quitConfirm ? (
          <div className="game-over-overlay__confirm" role="alertdialog" aria-labelledby="game-over-quit-title">
            <p id="game-over-quit-title" className="game-over-overlay__confirm-text">
              {C.quitConfirm}
            </p>
            <div className="game-over-overlay__confirm-actions">
              <NeonButton variant="muted" onClick={() => setQuitConfirm(false)}>
                {C.quitCancel}
              </NeonButton>
              <NeonButton variant="danger" icon={Home} onClick={onQuitToMenu}>
                {C.quitConfirmAction}
              </NeonButton>
            </div>
          </div>
        ) : (
          <div className="game-over-overlay__body">
            <div className="game-over-overlay__actions">
              <NeonButton
                variant="economy"
                icon={Play}
                className="game-over-overlay__continue"
                onClick={onContinue}
                disabled={busyContinue}
              >
                {continueLabel}
              </NeonButton>
              {data.continues > 0 ? (
                <NeonButton
                  variant="secondary"
                  className="game-over-overlay__inventory-continue"
                  onClick={onInventoryContinue}
                  disabled={busyContinue}
                >
                  {C.inventoryContinue(data.continues)}
                </NeonButton>
              ) : null}
              <NeonButton
                variant="secondary"
                icon={Share2}
                className={`game-over-overlay__share${data.isNewBest ? ' game-over-overlay__share--highlight' : ''}`}
                onClick={onShare}
                disabled={busyShare}
              >
                {shareLabel}
              </NeonButton>
              <NeonButton
                variant="muted"
                icon={RotateCcw}
                className="game-over-overlay__restart"
                onClick={onRestart}
              >
                {C.restart}
              </NeonButton>
              <NeonButton
                variant="danger"
                icon={Home}
                className="game-over-overlay__menu"
                onClick={() => (data.score > 0 ? setQuitConfirm(true) : onQuitToMenu())}
              >
                {C.menu}
              </NeonButton>
            </div>

            {showAd ? (
              <div className="game-over-overlay__ad-wrap">
                <span className="game-over-overlay__ad-label">{C.adLabel}</span>
                <div
                  ref={adRef}
                  id="game-over-ad-slot"
                  className="pause-ad-slot game-over-overlay__ad pause-ad-slot--inline"
                  aria-hidden="false"
                />
              </div>
            ) : null}
          </div>
        )}

        {status ? (
          <p className="game-over-overlay__status" role="status" aria-live="polite">
            {status}
          </p>
        ) : null}

        <p className="game-over-overlay__hint">{quitConfirm ? C.quitConfirmHint : C.hint}</p>
      </div>
    </div>
  );
}
