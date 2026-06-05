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
import { bumpPlayMountGeneration, isCurrentPlayMount } from '@/lib/shell/playMount';
import { SHELL_COPY } from '@/lib/copy/shell';
import {
  armBootSplashTimeout,
  dismissBootSplash,
  forceDismissBootSplash,
  resetBootSplashState,
  setBootSplash,
} from '@/src/shell/BootSplash.js';
import { syncPlayFrameLayout, syncViewportLayout } from '@/src/systems/LayoutManager.js';
import { closeLegalShell } from '@/src/shell/LegalShell.js';

const PHASES = SHELL_COPY.play.phases;
const BOOT_ERR = SHELL_COPY.play.bootError;

export default function PlayClient() {
  const [bootError, setBootError] = useState<string | null>(null);
  const [bootAttempt, setBootAttempt] = useState(0);
  const generationRef = useRef(0);

  const retryBoot = useCallback(() => {
    setBootAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    const generation = bumpPlayMountGeneration();
    generationRef.current = generation;
    let cancelled = false;

    resetBootSplashState();
    setBootError(null);
    closeLegalShell();
    document.body.classList.remove('neon-legal-open');
    registerWebAdBridge();

    armBootSplashTimeout(() => {
      setBootSplash({ progress: 92, label: PHASES.stuck });
    });

    const onGameReady = () => {
      if (cancelled || !isCurrentPlayMount(generation)) return;
      dismissBootSplash(PHASES.ready);
    };

    const onBootStuck = () => {
      if (cancelled || !isCurrentPlayMount(generation)) return;
      forceDismissBootSplash(PHASES.stuckRetry);
    };

    window.addEventListener('neon:game-ready', onGameReady);
    window.addEventListener('neon:boot-splash-stuck', onBootStuck);

    (async () => {
      try {
        setBootSplash({ progress: 4, label: PHASES.bundle });
        await waitForPlayFrame();
        if (cancelled || !isCurrentPlayMount(generation)) return;

        syncViewportLayout();
        requestAnimationFrame(() => syncViewportLayout());

        setBootSplash({ progress: 8, label: PHASES.bundle });
        const { bootPlayGame } = await import('@/src/game/bootstrap.js');
        if (cancelled || !isCurrentPlayMount(generation)) return;

        setBootSplash({ progress: 14, label: PHASES.engine });
        const g = await bootPlayGame();
        if (cancelled || !isCurrentPlayMount(generation)) return;

        requestAnimationFrame(() => {
          syncPlayFrameLayout(g);
          requestAnimationFrame(() => syncPlayFrameLayout(g));
        });
      } catch (e) {
        console.error('[Neon Nexus] boot failed', e);
        const msg = e instanceof Error ? e.message : 'Boot failed';
        setBootError(msg);
        setBootSplash({ progress: 100, label: 'Could not start — refresh to retry' });
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener('neon:game-ready', onGameReady);
      window.removeEventListener('neon:boot-splash-stuck', onBootStuck);
      if (!isCurrentPlayMount(generationRef.current)) return;
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
          <p className="play-boot-error__detail">{BOOT_ERR.detail}</p>
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
