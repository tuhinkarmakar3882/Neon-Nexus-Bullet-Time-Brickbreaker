'use client';

import { useEffect } from 'react';
import { hidePauseAdSlot } from '@/lib/ads/pauseAdSlot';

/** Ensures pause ad DOM is cleared when leaving /play (Phaser may not run shutdown). */
export function PauseAdBridge() {
  useEffect(() => () => hidePauseAdSlot(), []);
  return <div id="pause-ad-slot" className="pause-ad-slot" aria-hidden aria-label="Advertisement" />;
}
