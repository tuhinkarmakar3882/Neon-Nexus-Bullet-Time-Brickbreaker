'use client';

import { useEffect } from 'react';
import { GameplayHud } from '@/components/play/GameplayHud';
import { PowerCoachBanner } from '@/components/play/PowerCoachBanner';
import { NexusCoachBanner } from '@/components/play/NexusCoachBanner';
import { useGameplayHudState } from '@/lib/shell/useGameplayHudState';
import { syncPlayFrameLayout } from '@/src/systems/LayoutManager.js';

/** React HUD frame for /play — listens to Phaser `hud:*` events. */
export function GameplayHudBridge() {
  const state = useGameplayHudState();

  useEffect(() => {
    const stage = document.querySelector('.play-stage--hud');
    if (!stage) return;
    const ro = new ResizeObserver(() => {
      const g = window.__NEON;
      if (g) syncPlayFrameLayout(g);
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <GameplayHud state={state} />
      <PowerCoachBanner />
      <NexusCoachBanner />
    </>
  );
}
