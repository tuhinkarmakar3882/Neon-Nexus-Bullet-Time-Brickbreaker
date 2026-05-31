import { AdsConfig, isAdsEnabled } from '../config/AdsConfig.js';
import { createDemoAdProvider } from './DemoAdProvider.js';
import { createGoogleAdProvider } from './GoogleAdProvider.js';
import { createNoopAdProvider } from './NoopAdProvider.js';

/**
 * Pick ad provider from AdsConfig.provider (or VITE_AD_PROVIDER).
 * Freemium default: demo in dev, google in production builds.
 */
export function createAdProvider(game) {
  const mode = (AdsConfig.provider || 'demo').toLowerCase();
  const isProd = import.meta.env?.PROD;

  if (isProd && mode === 'demo') {
    console.warn('[Monetization] VITE_AD_PROVIDER=demo in production — set to google for ad-supported release.');
  }

  if (mode === 'noop' || !isAdsEnabled()) return createNoopAdProvider();
  if (mode === 'google') return createGoogleAdProvider(game);
  return createDemoAdProvider(game);
}
