/** Silent provider — ads disabled; IAP hooks return failure. */
export function createNoopAdProvider() {
  return {
    name: 'noop',
    init: async () => {},
    showInterstitial: async () => ({ shown: false }),
    showRewarded: async () => ({ rewarded: false }),
    purchase: async () => ({ success: false }),
    restore: async () => ({ success: false }),
    showBanner: () => {},
    hideBanner: () => {},
  };
}
