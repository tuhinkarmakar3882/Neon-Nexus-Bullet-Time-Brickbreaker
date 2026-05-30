// Platform-agnostic monetization adapter.
//
// Provider is selected at boot via createAdProvider() + AdsConfig (see config/AdsConfig.js).
// Game scenes call Monetization.* only — swap Google AdMob / demo / noop via config.

import { AdsConfig } from '../config/AdsConfig.js';
import { MetaProgress } from './MetaProgress.js';
import { SaveManager } from './SaveManager.js';

const DEFAULT_PROVIDER = {
  name: 'noop',
  init: async () => {},
  showInterstitial: async () => ({ shown: false }),
  showRewarded: async () => ({ rewarded: false }),
  purchase: async () => ({ success: false }),
  restore: async () => ({ success: false }),
  showBanner: () => {},
  hideBanner: () => {},
};

class MonetizationService {
  constructor() {
    this.provider = DEFAULT_PROVIDER;
    this.game = null;
    this.removeAds = false;
    this.interstitialEvery = AdsConfig.interstitial.everyLevels;
    this.interstitialMinMs = AdsConfig.interstitial.minIntervalMs;
    this._levelCounter = 0;
    this._lastInterstitialAt = 0;
    this.products = { ...AdsConfig.products };
  }

  applyConfig(cfg = AdsConfig) {
    this.interstitialEvery = cfg.interstitial?.everyLevels ?? this.interstitialEvery;
    this.interstitialMinMs = cfg.interstitial?.minIntervalMs ?? this.interstitialMinMs;
    if (cfg.products) this.products = { ...cfg.products };
  }

  getProviderName() {
    return this.provider?.name ?? 'noop';
  }

  isNativeAds() {
    return !!this.provider?.nativeAds;
  }

  register(provider, game = null) {
    this.provider = { ...DEFAULT_PROVIDER, ...provider };
    if (game) this.game = game;
    return this.provider.init?.();
  }

  async maybeShowLevelInterstitial() {
    if (this.removeAds) return { shown: false };
    this._levelCounter++;
    if (this._levelCounter % this.interstitialEvery !== 0) return { shown: false };
    const now = Date.now();
    if (now - this._lastInterstitialAt < this.interstitialMinMs) return { shown: false };
    try {
      const res = await this.provider.showInterstitial();
      if (!res?.shown) return { shown: false };
      this._lastInterstitialAt = now;
      const showOverlay = !res.native
        || AdsConfig.interstitial.overlayAfterNative;
      if (showOverlay && this.provider.showInterstitialOverlay && this.game) {
        await this.provider.showInterstitialOverlay(this.game);
      }
      return { shown: true };
    } catch {
      return { shown: false };
    }
  }

  async offerRewardedContinue() {
    return this.offerRewarded('continue');
  }

  async offerRewardedDoubleBonus() {
    return this.offerRewarded('double_bonus');
  }

  async offerReviveWithPowers() {
    return this.offerRewarded('revive_powers');
  }

  async offerRewarded(placement) {
    try {
      const res = await this.provider.showRewarded({ placement });
      return !!res?.rewarded;
    } catch {
      return false;
    }
  }

  showBanner() {
    if (this.removeAds) return;
    Promise.resolve(this.provider.showBanner?.()).catch(() => {});
  }

  hideBanner() {
    Promise.resolve(this.provider.hideBanner?.()).catch(() => {});
  }

  async purchase(productId) {
    try {
      const res = await this.provider.purchase(productId);
      if (res?.success) {
        if (productId === 'remove_ads') {
          this.removeAds = true;
          SaveManager.setRemoveAds(true);
        }
        if (productId === 'coins_small') MetaProgress.addGems(50);
        if (productId === 'premium') MetaProgress.setPremium(true);
      }
      return res;
    } catch {
      return { success: false };
    }
  }
}

export const Monetization = new MonetizationService();
