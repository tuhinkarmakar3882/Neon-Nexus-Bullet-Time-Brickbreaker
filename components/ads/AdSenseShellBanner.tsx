'use client';

import { useEffect } from 'react';
import { applyBannerPlaceholder, getAdSenseSlotFromEnv, mountAdSenseBanner } from '@/lib/ads/adsenseWeb';

type AdSenseShellBannerProps = {
  visible: boolean;
};

/**
 * Hydrates #ad-banner with AdSense when env is configured (shell routes only).
 */
export function AdSenseShellBanner({ visible }: AdSenseShellBannerProps) {
  useEffect(() => {
    if (!visible) return;
    const el = document.getElementById('ad-banner');
    if (!el) return;

    const slot = getAdSenseSlotFromEnv();
    const provider = (process.env.NEXT_PUBLIC_AD_PROVIDER
      ?? process.env.VITE_AD_PROVIDER
      ?? 'demo').toLowerCase();

    if (provider === 'google' && slot) {
      const ok = mountAdSenseBanner(el, slot);
      if (!ok) applyBannerPlaceholder(el);
    } else if (provider === 'demo') {
      applyBannerPlaceholder(el, 'Advertisement (demo)');
    }
  }, [visible]);

  return null;
}
