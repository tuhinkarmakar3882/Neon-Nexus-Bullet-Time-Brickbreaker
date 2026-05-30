import { AdsConfig, isAdsEnabled } from '../config/AdsConfig.js';
import { createDemoAdProvider } from './DemoAdProvider.js';
import { createGoogleAdProvider } from './GoogleAdProvider.js';
import { createNoopAdProvider } from './NoopAdProvider.js';

/**
 * Pick ad provider from AdsConfig.provider (or VITE_AD_PROVIDER).
 * Swap provider by config only — no scene changes required.
 */
export function createAdProvider(game) {
  const mode = (AdsConfig.provider || 'demo').toLowerCase();

  if (mode === 'noop' || !isAdsEnabled()) return createNoopAdProvider();
  if (mode === 'google') return createGoogleAdProvider(game);
  return createDemoAdProvider(game);
}
