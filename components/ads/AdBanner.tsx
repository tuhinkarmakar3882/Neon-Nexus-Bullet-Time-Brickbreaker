'use client';

import { usePathname } from 'next/navigation';
import { AD_PLACEMENTS, SHELL_BANNER_HEIGHT_PX } from '@/lib/ads/placements';
import { AdSenseShellBanner } from '@/components/ads/AdSenseShellBanner';

type AdBannerProps = {
  /** When false, slot is hidden (e.g. /play — native or no banner). */
  visible?: boolean;
};

/**
 * Reserved bottom ad real estate for the React shell.
 * Monetization providers inject into #ad-banner; this wrapper defines layout + a11y.
 */
/** Shell banner off by default — use rewarded/interstitial in-game instead. */
export function AdBanner({ visible = false }: AdBannerProps) {
  const pathname = usePathname();
  const isPlay = pathname?.startsWith('/play');
  const show = visible && !isPlay;

  return (
    <>
      <aside
        id="ad-banner"
        className={`ad-banner-slot${show ? ' ad-banner-slot--visible' : ''}`}
        data-placement={AD_PLACEMENTS.SHELL_BOTTOM_BANNER}
        data-ad-height={SHELL_BANNER_HEIGHT_PX}
        aria-hidden={!show}
        aria-label="Advertisement"
        role="complementary"
      />
      <AdSenseShellBanner visible={show} />
    </>
  );
}
