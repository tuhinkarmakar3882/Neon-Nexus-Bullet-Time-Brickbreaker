'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { ROUTES } from '@/lib/shell/routes';
import { PlayBootSplash } from '@/components/shell/PlayBootSplash';
import { GameplayHudBridge } from '@/components/play/GameplayHudBridge';
import { PauseOverlayBridge } from '@/components/play/PauseOverlayBridge';
import { GameOverOverlayBridge } from '@/components/play/GameOverOverlayBridge';
import { LevelCompleteOverlayBridge } from '@/components/play/LevelCompleteOverlayBridge';
import { WebAdBridge } from '@/components/ads/WebAdBridge';
import { registerWebAdBridge } from '@/lib/ads/webAdBridge';
import { waitForPlayFrame } from '@/lib/shell/waitForPlayFrame';
import { SHELL_COPY } from '@/lib/copy/shell';
import {
  armBootSplashTimeout,
  dismissBootSplash,
  resetBootSplashState,
  setBootSplash,
} from '@/src/shell/BootSplash.js';
import { syncPlayFrameLayout, syncViewportLayout } from '@/src/systems/LayoutManager.js';

const PHASES = SHELL_COPY.play.phases;
const BOOT_ERR = SHELL_COPY.play.bootError;

/** Survives React Strict Mode remount — only the latest mount generation may destroy Phaser. */
let playMountGeneration = 0;

export default function PlayClient() {
  const [bootError, setBootError] = useState<string | null>(null);
  const [bootAttempt, setBootAttempt] = useState(0);
  const generationRef = useRef(0);

  const retryBoot = useCallback(() => {
    setBootAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    const generation = ++playMountGeneration;
    generationRef.current = generation;
    let cancelled = false;

    resetBootSplashState();
    setBootError(null);
    registerWebAdBridge();

    armBootSplashTimeout(() => {
      setBootSplash({ progress: 92, label: PHASES.stuck });
    });

    (async () => {
      try {
        setBootSplash({ progress: 4, label: PHASES.bundle });
        await waitForPlayFrame();
        if (cancelled || generation !== playMountGeneration) return;

        syncViewportLayout();
        requestAnimationFrame(() => syncViewportLayout());

        setBootSplash({ progress: 8, label: PHASES.bundle });
        const { bootPlayGame } = await import('@/src/game/bootstrap.js');
        if (cancelled || generation !== playMountGeneration) return;

        setBootSplash({ progress: 14, label: PHASES.engine });
        const g = bootPlayGame();
        if (cancelled || generation !== playMountGeneration) return;

        requestAnimationFrame(() => {
          syncPlayFrameLayout(g);
          requestAnimationFrame(() => syncPlayFrameLayout(g));
        });

        // Safety net if UIScene dismiss never fires
        window.setTimeout(() => {
          if (cancelled || generation !== playMountGeneration) return;
          const game = window.__NEON;
          if (game?.scene?.isActive('Game')) {
            dismissBootSplash('Garden ready — launch when you are');
          }
        }, 12000);
      } catch (e) {
        console.error('[Neon Nexus] boot failed', e);
        const msg = e instanceof Error ? e.message : 'Boot failed';
        setBootError(msg);
        setBootSplash({ progress: 100, label: 'Could not start — refresh to retry' });
      }
    })();

    return () => {
      cancelled = true;
      if (generationRef.current !== playMountGeneration) return;
      void import('@/src/game/bootstrap.js').then((m) => m.destroyGame());
    };
  }, [bootAttempt]);

  return (
    <div className="play-stage play-stage--hud">
      <GameplayHudBridge />
      <main id="game-root" aria-label="Neon Nexus game canvas" />
      <PlayBootSplash />
      <WebAdBridge />
      <PauseOverlayBridge />
      <GameOverOverlayBridge />
      <LevelCompleteOverlayBridge />
      {bootError ? (
        <div className="play-boot-error" role="alertdialog" aria-labelledby="play-boot-error-title">
          <h2 id="play-boot-error-title" className="play-boot-error__title">
            {BOOT_ERR.title}
          </h2>
          <p className="play-boot-error__detail">{bootError}</p>
          <p className="play-boot-error__hint">{BOOT_ERR.hint}</p>
          <div className="play-boot-error__actions">
            <button type="button" className="play-boot-error__btn play-boot-error__btn--primary" onClick={retryBoot}>
              {BOOT_ERR.retry}
            </button>
            <Link href={ROUTES.home} className="play-boot-error__btn play-boot-error__btn--secondary">
              {BOOT_ERR.home}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
