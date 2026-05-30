// Platform-agnostic monetization adapter.
//
// This is a clean, swappable interface that already wires the *game* side of
// monetization (when to offer a rewarded continue, when to show an interstitial,
// the store catalogue). The concrete network/billing SDK is injected per platform:
//
//   Web        -> H5 ad networks / Google AdSense / GameDistribution SDK
//   Android/iOS-> Google AdMob via @capacitor-community/admob (Capacitor)
//   Steam/PC   -> Electron + storefront entitlement checks
//
// Until a provider is registered, every call resolves safely as a no-op so the
// game is fully playable and testable. Swap in a real provider with
// `Monetization.register(provider)` at boot.

const DEFAULT_PROVIDER = {
  name: 'noop',
  init: async () => {},
  showInterstitial: async () => ({ shown: false }),
  // Resolves true if the reward should be granted.
  showRewarded: async () => ({ rewarded: false }),
  purchase: async () => ({ success: false }),
  restore: async () => ({ success: false }),
};

class MonetizationService {
  constructor() {
    this.provider = DEFAULT_PROVIDER;
    this.removeAds = false; // set true after a "remove ads" IAP / premium build
    this.interstitialEvery = 2; // show an interstitial every N level-ups
    this._levelCounter = 0;
    this.products = {
      remove_ads: { id: 'remove_ads', price: '$2.99', type: 'nonconsumable' },
      coins_small: { id: 'coins_small', price: '$0.99', type: 'consumable' },
      premium: { id: 'premium', price: '$4.99', type: 'nonconsumable' },
    };
  }

  register(provider) {
    this.provider = { ...DEFAULT_PROVIDER, ...provider };
    return this.provider.init?.();
  }

  async maybeShowLevelInterstitial() {
    if (this.removeAds) return { shown: false };
    this._levelCounter++;
    if (this._levelCounter % this.interstitialEvery !== 0) return { shown: false };
    try {
      return await this.provider.showInterstitial();
    } catch {
      return { shown: false };
    }
  }

  // Offer a rewarded ad to earn an extra continue. Resolves true if granted.
  async offerRewardedContinue() {
    try {
      const res = await this.provider.showRewarded({ placement: 'continue' });
      return !!res?.rewarded;
    } catch {
      return false;
    }
  }

  async purchase(productId) {
    try {
      const res = await this.provider.purchase(productId);
      if (res?.success && productId === 'remove_ads') this.removeAds = true;
      return res;
    } catch {
      return { success: false };
    }
  }
}

export const Monetization = new MonetizationService();
