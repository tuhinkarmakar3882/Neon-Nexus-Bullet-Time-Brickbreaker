'use client';

import { useEffect, useRef, useState } from 'react';
import { PlayBootSplash } from '@/components/shell/PlayBootSplash';
import { GameplayHudBridge } from '@/components/play/GameplayHudBridge';
import { PauseOverlayBridge } from '@/components/play/PauseOverlayBridge';
import { GameOverOverlayBridge } from '@/components/play/GameOverOverlayBridge';
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

/** Survives React Strict Mode remount — only the latest mount generation may destroy Phaser. */
let playMountGeneration = 0;

export default function PlayClient() {
  const [bootError, setBootError] = useState<string | null>(null);
  const generationRef = useRef(0);

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
  }, []);

  return (
    <div className="play-stage play-stage--hud">
      <GameplayHudBridge />
      <main id="game-root" aria-label="Neon Nexus game canvas" />
      <PlayBootSplash />
      <WebAdBridge />
      <PauseOverlayBridge />
      <GameOverOverlayBridge />
      {bootError ? (
        <p className="play-boot-error" role="alert">
          {bootError}
        </p>
      ) : null}
    </div>
  );
}
