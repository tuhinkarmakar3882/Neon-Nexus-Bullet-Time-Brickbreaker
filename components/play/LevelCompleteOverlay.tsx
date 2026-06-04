'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Share2, Sparkles } from 'lucide';
import { NeonButton } from '@/components/shell/AppShell';
import { mountLevelCompleteAdInContainer, hideInlineOverlayAd } from '@/lib/ads/pauseAdSlot';
import type { LevelCompleteOverlayData } from '@/lib/shell/levelCompleteOverlayTypes';
import {
  levelCompleteOverlayAdvance,
  levelCompleteOverlayDoubleBonus,
  levelCompleteOverlayShare,
} from '@/lib/shell/levelCompleteOverlayActions';
import { Monetization } from '@/src/systems/Monetization.js';
import { PLAY_COPY } from '@/lib/copy/play';

type Props = {
  data: LevelCompleteOverlayData;
};

const C = PLAY_COPY.levelComplete;

function renderStars(stars: number) {
  const filled = Math.max(0, Math.min(3, stars));
  return '★'.repeat(filled) + '☆'.repeat(3 - filled);
}

export function LevelCompleteOverlay({ data }: Props) {
  const adRef = useRef<HTMLDivElement>(null);
  const [bonus, setBonus] = useState(data.bonus);
  const [score, setScore] = useState(data.score);
  const [doubled, setDoubled] = useState(false);
  const [status, setStatus] = useState('');
  const [busyDouble, setBusyDouble] = useState(false);
  const [busyShare, setBusyShare] = useState(false);
  const [canContinue, setCanContinue] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [hintPulse, setHintPulse] = useState(false);

  useEffect(() => {
    Monetization.applyConfig();
    setShowAd(!Monetization.removeAds && Monetization.getProviderName() !== 'noop');
  }, []);

  useEffect(() => {
    setBonus(data.bonus);
    setScore(data.score);
    setDoubled(false);
    setStatus('');
    setCanContinue(false);
    setHintPulse(false);

    const tapTimer = window.setTimeout(() => setCanContinue(true), 1400);
    const hintTimer = window.setTimeout(() => setHintPulse(true), 1200);
    return () => {
      window.clearTimeout(tapTimer);
      window.clearTimeout(hintTimer);
    };
  }, [data.level, data.bonus, data.score]);

  useEffect(() => {
    const el = adRef.current;
    if (!el || !showAd) return;
    mountLevelCompleteAdInContainer(el);
    return () => hideInlineOverlayAd(el);
  }, [showAd, data.level]);

  const onContinue = useCallback(() => {
    if (!canContinue || busyDouble || busyShare) return;
    levelCompleteOverlayAdvance();
  }, [canContinue, busyDouble, busyShare]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Escape') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onContinue();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onContinue]);

  const onDoubleBonus = useCallback(async () => {
    if (doubled || busyDouble || !data.showDoubleBonus) return;
    setBusyDouble(true);
    setStatus(C.loadingVideo);
    try {
      const res = await levelCompleteOverlayDoubleBonus();
      setStatus(res.message);
      if (res.ok && res.bonus != null && res.score != null) {
        setBonus(res.bonus);
        setScore(res.score);
        setDoubled(true);
      }
    } finally {
      setBusyDouble(false);
    }
  }, [doubled, busyDouble, data.showDoubleBonus]);

  const onShare = useCallback(async () => {
    if (busyShare) return;
    setBusyShare(true);
    setStatus(C.preparingShare);
    try {
      const msg = await levelCompleteOverlayShare();
      setStatus(msg);
    } finally {
      setBusyShare(false);
    }
  }, [busyShare]);

  return (
    <div
      className="level-complete-overlay play-hud-interactive"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-complete-overlay-title"
      onClick={onContinue}
    >
      <div
        className="level-complete-overlay__card"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="level-complete-overlay__head">
          <p className="level-complete-overlay__level">{C.level(data.level)}</p>
          <h2 id="level-complete-overlay-title" className="level-complete-overlay__title">
            {C.cleared}
          </h2>
          {data.message ? (
            <p className="level-complete-overlay__message">{data.message}</p>
          ) : null}
        </header>

        <div className="level-complete-overlay__stats" aria-label="Level results">
          <p className="level-complete-overlay__bonus">
            {C.clearBonus} +{bonus.toLocaleString()}
            {doubled ? ` ${C.doubledTag}` : ''}
          </p>
          <p className="level-complete-overlay__score">
            <span className="level-complete-overlay__score-label">{C.score}</span>
            <span className="level-complete-overlay__score-val">{score.toLocaleString()}</span>
          </p>
          <p className="level-complete-overlay__stars" aria-label={`${data.stars} of 3 stars`}>
            {renderStars(data.stars)}
          </p>
          {data.gemsEarned != null ? (
            <>
              <p className="level-complete-overlay__gems-earned">
                +{data.gemsEarned} {C.gems}
              </p>
              <p className="level-complete-overlay__gems-total">
                {C.total} {(data.gems ?? 0).toLocaleString()} {C.gems}
              </p>
            </>
          ) : null}
          {data.goal ? (
            <p className="level-complete-overlay__goal">{data.goal}</p>
          ) : null}
        </div>

        <div className="level-complete-overlay__body">
          <div className="level-complete-overlay__actions">
            {data.showDoubleBonus ? (
              <NeonButton
                variant="economy"
                icon={Sparkles}
                className="level-complete-overlay__double"
                onClick={onDoubleBonus}
                disabled={doubled || busyDouble}
              >
                {C.doubleBonus}
              </NeonButton>
            ) : null}
            <NeonButton
              variant="secondary"
              icon={Share2}
              className="level-complete-overlay__share"
              onClick={onShare}
              disabled={busyShare}
            >
              {C.share}
            </NeonButton>
          </div>

          {showAd ? (
            <div className="level-complete-overlay__ad-wrap">
              <span className="level-complete-overlay__ad-label">{C.adLabel}</span>
              <div
                ref={adRef}
                id="level-complete-ad-slot"
                className="pause-ad-slot level-complete-overlay__ad pause-ad-slot--inline"
                aria-hidden="false"
              />
            </div>
          ) : null}
        </div>

        {status ? (
          <p className="level-complete-overlay__status" role="status" aria-live="polite">
            {status}
          </p>
        ) : null}

        <p
          className={`level-complete-overlay__hint${hintPulse && canContinue ? ' level-complete-overlay__hint--pulse' : ''}`}
        >
          {canContinue ? C.hint : C.hintSoon}
        </p>
      </div>
    </div>
  );
}
