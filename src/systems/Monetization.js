// Platform-agnostic monetization adapter.
//
// Provider is selected at boot via createAdProvider() + AdsConfig (see config/AdsConfig.js).
// Game scenes call Monetization.* only — swap Google AdMob / demo / noop via config.

import { AdsConfig, isAdSurfaceEnabled, isIapEnabled } from '../config/AdsConfig.js';
import { MetaProgress } from './MetaProgress.js';
import { SaveManager } from './SaveManager.js';
import * as PlayBilling from './PlayBilling.js';

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

  /** Rewarded continue — bypasses when ads are off, unconfigured, or unavailable. */
  async offerRewardedContinueWithBypass() {
    if (!isAdSurfaceEnabled('rewarded') || this.getProviderName() === 'noop') {
      return { granted: true, bypassed: true };
    }
    try {
      const res = await this.provider.showRewarded({ placement: AdsConfig.placements?.continue ?? 'continue' });
      if (res?.rewarded) return { granted: true, bypassed: !!res.simulated };
      return { granted: true, bypassed: true };
    } catch {
      return { granted: true, bypassed: true };
    }
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

  getProduct(productId) {
    return this.products?.[productId] ?? null;
  }

  formatPrice(productId) {
    return this.getProduct(productId)?.price ?? '';
  }

  isSimulatedStore() {
    if (PlayBilling.isPlayBillingReady()) return false;
    const name = this.getProviderName();
    return name === 'demo-web' || name === 'demo';
  }

  isStoreAvailable() {
    if (!isIapEnabled()) return false;
    return this.getProviderName() !== 'noop';
  }

  purchaseErrorMessage(res) {
    if (res?.reason === 'iap_disabled') return '';
    if (res?.cancelled) return '';
    if (res?.pending) {
      return res.message ?? 'Complete checkout in the browser tab, then Restore Purchases or redeem your unlock code in Settings.';
    }
    if (res?.reason === 'store_unavailable') return 'Store unavailable — try again on a device build.';
    if (res?.message) return res.message;
    return 'Purchase could not be completed.';
  }

  applyEntitlements(productId) {
    if (productId === 'remove_ads') {
      this.removeAds = true;
      SaveManager.setRemoveAds(true);
      this.hideBanner();
    }
    if (productId === 'coins_small') MetaProgress.addGems(50);
    if (productId === 'premium') MetaProgress.setPremium(true);
  }

  applyRestoreResult(res) {
    if (!res) return;
    const products = res.products ?? [];
    if (res.removeAds || products.includes('remove_ads')) {
      this.removeAds = true;
      SaveManager.setRemoveAds(true);
      this.hideBanner();
    }
    if (res.premium || products.includes('premium')) MetaProgress.setPremium(true);
  }

  async syncStoreEntitlements() {
    if (PlayBilling.isPlayBillingReady()) {
      await PlayBilling.syncStoreEntitlements();
      return { success: true };
    }
    if (!this.isStoreAvailable()) return { success: false };
    try {
      const res = await this.provider.restore?.();
      if (res?.success) this.applyRestoreResult(res);
      return res ?? { success: false };
    } catch {
      return { success: false };
    }
  }

  async restorePurchases() {
    if (!isIapEnabled()) return { success: false, reason: 'iap_disabled' };
    const billing = await PlayBilling.restorePurchases();
    if (billing) return billing;
    return this.syncStoreEntitlements();
  }

  async purchase(productId) {
    if (!isIapEnabled()) return { success: false, reason: 'iap_disabled' };
    const billing = await PlayBilling.purchaseProduct(productId);
    if (billing) {
      if (billing.success) this.applyEntitlements(productId);
      return billing;
    }
    if (!this.isStoreAvailable()) {
      return { success: false, reason: 'store_unavailable' };
    }
    try {
      const res = await this.provider.purchase(productId);
      if (res?.success) this.applyEntitlements(productId);
      return res ?? { success: false };
    } catch {
      return { success: false, reason: 'failed' };
    }
  }
}

export const Monetization = new MonetizationService();
