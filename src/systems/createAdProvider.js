import { AdsConfig, isAdsEnabled } from '../config/AdsConfig.js';
import { getEnv } from '../config/env.js';
import { createDemoAdProvider } from './DemoAdProvider.js';
import { createGoogleAdProvider } from './GoogleAdProvider.js';
import { createNoopAdProvider } from './NoopAdProvider.js';

/**
 * Pick ad provider from AdsConfig.provider (or VITE_AD_PROVIDER).
 * Freemium default: demo in dev, google in production builds.
 */
export function createAdProvider(game) {
  const mode = (AdsConfig.provider || 'demo').toLowerCase();
  const isProd = getEnv('NODE_ENV') === 'production' || getEnv('MODE') === 'production';

  if (isProd && mode === 'demo') {
    console.warn('[Monetization] VITE_AD_PROVIDER=demo in production — set to google for ad-supported release.');
  }

  if (mode === 'noop' || !isAdsEnabled()) return createNoopAdProvider();
  if (mode === 'google') return createGoogleAdProvider(game);
  return createDemoAdProvider(game);
}
