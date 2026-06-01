'use client';

import { useEffect, useState } from 'react';
import { PauseOverlay } from '@/components/play/PauseOverlay';
import type { PauseOverlayData } from '@/lib/shell/pauseOverlayTypes';
import { hidePauseAdSlot } from '@/lib/ads/pauseAdSlot';

/** React pause menu on /play — driven by PauseScene when DOM HUD is active. */
export function PauseOverlayBridge() {
  const [data, setData] = useState<PauseOverlayData | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setData((e as CustomEvent<PauseOverlayData>).detail);
    };
    const onClose = () => {
      setData(null);
      hidePauseAdSlot();
    };

    window.addEventListener('neon:pause-open', onOpen);
    window.addEventListener('neon:pause-close', onClose);
    return () => {
      window.removeEventListener('neon:pause-open', onOpen);
      window.removeEventListener('neon:pause-close', onClose);
      hidePauseAdSlot();
    };
  }, []);

  if (!data) return null;
  return <PauseOverlay data={data} />;
}
