'use client';

import { useEffect, useState } from 'react';
import { LevelCompleteOverlay } from '@/components/play/LevelCompleteOverlay';
import type { LevelCompleteOverlayData } from '@/lib/shell/levelCompleteOverlayTypes';

/** React level-clear screen on /play — driven by LevelCompleteScene when DOM HUD is active. */
export function LevelCompleteOverlayBridge() {
  const [data, setData] = useState<LevelCompleteOverlayData | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setData((e as CustomEvent<LevelCompleteOverlayData>).detail);
    };
    const onClose = () => setData(null);

    window.addEventListener('neon:levelcomplete-open', onOpen);
    window.addEventListener('neon:levelcomplete-close', onClose);
    return () => {
      window.removeEventListener('neon:levelcomplete-open', onOpen);
      window.removeEventListener('neon:levelcomplete-close', onClose);
    };
  }, []);

  if (!data) return null;
  return <LevelCompleteOverlay data={data} />;
}
