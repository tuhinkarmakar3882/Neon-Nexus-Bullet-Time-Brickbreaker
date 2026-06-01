'use client';

import { useEffect, useState } from 'react';
import { GameOverOverlay } from '@/components/play/GameOverOverlay';
import type { GameOverOverlayData } from '@/lib/shell/gameOverOverlayTypes';

/** React game-over screen on /play — driven by GameOverScene when DOM HUD is active. */
export function GameOverOverlayBridge() {
  const [data, setData] = useState<GameOverOverlayData | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setData((e as CustomEvent<GameOverOverlayData>).detail);
    };
    const onClose = () => setData(null);

    window.addEventListener('neon:gameover-open', onOpen);
    window.addEventListener('neon:gameover-close', onClose);
    return () => {
      window.removeEventListener('neon:gameover-open', onOpen);
      window.removeEventListener('neon:gameover-close', onClose);
    };
  }, []);

  if (!data) return null;
  return <GameOverOverlay data={data} />;
}
