'use client';

import { useEffect } from 'react';
import { registerWebAdBridge, unregisterWebAdBridge } from '@/lib/ads/webAdBridge';

/** Wires window ad hooks for Phaser / GoogleAdProvider on the play route. */
export function WebAdBridge() {
  useEffect(() => {
    registerWebAdBridge();
    return () => unregisterWebAdBridge();
  }, []);
  return null;
}
