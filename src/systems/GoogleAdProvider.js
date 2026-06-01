import { SCENES } from '../config/Constants.js';
import {
  AdsConfig,
  adPlatform,
  isAdSurfaceEnabled,
  isNativePlatform,
  resolveAdUnit,
  resolveAppId,
} from '../config/AdsConfig.js';
import { applyBannerPlaceholder, hideWebBannerBar, showWebBannerBar } from './AdBannerSlot.js';
import { withAdOverlayTimeout } from './AdOverlay.js';
import { launchParallelScene } from './SceneLaunch.js';

let AdMobModule = null;

async function loadAdMob() {
  if (AdMobModule !== null) return AdMobModule;
  try {
    // Runtime import — optional native dep; Vite aliases to stub when not installed.
    AdMobModule = await import('@capacitor-community/admob');
    return AdMobModule;
  } catch {
    console.warn(
      '[Ads] @capacitor-community/admob not installed. Run: pnpm add @capacitor-community/admob && cap sync',
    );
    AdMobModule = false;
    return false;
  }
}

async function mountWebBanner() {
  const slot = resolveAdUnit('banner', 'web');
  if (!slot?.client || !slot?.slot) return false;
  const el = document.getElementById('ad-banner');
  if (!el) return false;
  try {
    const { mountAdSenseBanner } = await import('../../lib/ads/adsenseWeb.ts');
    return mountAdSenseBanner(el, slot);
  } catch (e) {
    console.warn('[Ads] AdSense mount failed', e);
    return false;
  }
}

async function ensureWebAdBridge() {
  try {
    const { registerWebAdBridge } = await import('../../lib/ads/webAdBridge.ts');
    registerWebAdBridge();
  } catch (e) {
    console.warn('[Ads] web bridge registration skipped', e);
  }
}

export function createGoogleAdProvider(game) {
  let interstitialReady = false;
  let rewardedReady = false;
  let nativeReady = false;

  const prepareInterstitial = async (AdMob) => {
    const adId = resolveAdUnit('interstitial');
    if (!adId || !AdMob) return;
    try {
      await AdMob.prepareInterstitial({ adId });
      interstitialReady = true;
    } catch (e) {
      interstitialReady = false;
      console.warn('[Ads] prepareInterstitial failed', e);
    }
  };

  const prepareRewarded = async (AdMob) => {
    const adId = resolveAdUnit('rewarded');
    if (!adId || !AdMob) return;
    try {
      await AdMob.prepareRewardVideoAd({ adId });
      rewardedReady = true;
    } catch (e) {
      rewardedReady = false;
      console.warn('[Ads] prepareRewarded failed', e);
    }
  };

  return {
    name: 'google',
    nativeAds: true,

    init: async () => {
      if (!isNativePlatform()) {
        await ensureWebAdBridge();
        if (isAdSurfaceEnabled('banner')) await mountWebBanner();
        return;
      }

      const mod = await loadAdMob();
      if (!mod) return;

      const { AdMob } = mod;
      const appId = resolveAppId();
      if (!appId) {
        console.warn('[Ads] Missing AdMob app ID for', adPlatform());
        return;
      }

      if (AdsConfig.consent.requestOnInit && AdMob.requestConsentInfo) {
        try {
          await AdMob.requestConsentInfo();
        } catch (e) {
          console.warn('[Ads] Consent request skipped', e);
        }
      }

      await AdMob.initialize({
        initializeForTesting: AdsConfig.testMode,
        appId,
      });

      nativeReady = true;
      if (isAdSurfaceEnabled('interstitial')) await prepareInterstitial(AdMob);
      if (isAdSurfaceEnabled('rewarded')) await prepareRewarded(AdMob);
    },

    showInterstitial: async () => {
      if (!isAdSurfaceEnabled('interstitial')) return { shown: false };

      if (isNativePlatform()) {
        const mod = await loadAdMob();
        if (!mod || !nativeReady) return { shown: false };
        const { AdMob } = mod;
        try {
          if (!interstitialReady) await prepareInterstitial(AdMob);
          if (!interstitialReady) return { shown: false };
          await AdMob.showInterstitial();
          interstitialReady = false;
          prepareInterstitial(AdMob);
          return { shown: true, native: true };
        } catch (e) {
          console.warn('[Ads] showInterstitial failed', e);
          interstitialReady = false;
          prepareInterstitial(AdMob);
          return { shown: false };
        }
      }

      // Web interstitial — GAM when configured, else Phaser AdBreak overlay (see docs/ADS.md)
      if (typeof window.__googleShowInterstitial === 'function') {
        try {
          const shown = await window.__googleShowInterstitial();
          return { shown: !!shown, native: true };
        } catch (e) {
          console.warn('[Ads] web interstitial failed', e);
          return { shown: false };
        }
      }
      return { shown: false };
    },

    showRewarded: async ({ placement } = {}) => {
      if (!isAdSurfaceEnabled('rewarded')) return { rewarded: false, placement };

      if (isNativePlatform()) {
        const mod = await loadAdMob();
        if (!mod || !nativeReady) return { rewarded: false, placement };
        const { AdMob } = mod;

        return new Promise((resolve) => {
          let settled = false;
          let rewarded = false;
          const listeners = [];
          const finish = async (result) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            for (const h of listeners) {
              try { await h.remove?.(); } catch { /* noop */ }
            }
            resolve(result);
          };

          const timer = setTimeout(() => {
            rewardedReady = false;
            prepareRewarded(AdMob);
            finish({ rewarded: false, placement, timeout: true, unavailable: true });
          }, 120_000);

          const add = (event, fn) => {
            const h = AdMob.addListener(event, fn);
            listeners.push(h);
          };

          add('onRewardedVideoAdReward', () => { rewarded = true; });
          add('onRewardedVideoAdDismissed', async () => {
            rewardedReady = false;
            prepareRewarded(AdMob);
            finish({ rewarded, placement, native: true });
          });
          add('onRewardedVideoAdFailedToShow', async () => {
            rewardedReady = false;
            prepareRewarded(AdMob);
            finish({ rewarded: false, placement, native: true });
          });
          add('onRewardedAdFailedToLoad', async () => {
            rewardedReady = false;
            prepareRewarded(AdMob);
            finish({ rewarded: false, placement, unavailable: true });
          });

          (async () => {
            try {
              if (!rewardedReady) await prepareRewarded(AdMob);
              if (!rewardedReady) {
                finish({ rewarded: false, placement, unavailable: true });
                return;
              }
              await AdMob.showRewardVideoAd();
            } catch (e) {
              console.warn('[Ads] showRewarded failed', e);
              rewardedReady = false;
              prepareRewarded(AdMob);
              finish({ rewarded: false, placement, unavailable: true });
            }
          })();
        });
      }

      if (typeof window.__googleShowRewarded === 'function') {
        try {
          const rewarded = await window.__googleShowRewarded(placement);
          return { rewarded: !!rewarded, placement, native: true };
        } catch (e) {
          console.warn('[Ads] web rewarded failed', e);
          return { rewarded: false, placement, unavailable: true };
        }
      }
      return { rewarded: false, placement, unavailable: true };
    },

    purchase: async (productId) => {
      if (typeof window.__nativePurchase === 'function') {
        return window.__nativePurchase(productId);
      }
      return { success: false, reason: 'store_unavailable' };
    },
    restore: async () => {
      if (typeof window.__nativeRestore === 'function') {
        return window.__nativeRestore();
      }
      return { success: false, reason: 'store_unavailable' };
    },

    showBanner: async () => {
      if (!AdsConfig.banner.enabled || !isAdSurfaceEnabled('banner')) return;

      if (isNativePlatform()) {
        const mod = await loadAdMob();
        if (!mod || !nativeReady) return;
        const { AdMob, BannerAdSize, BannerAdPosition } = mod;
        const adId = resolveAdUnit('banner');
        if (!adId) return;
        try {
          await AdMob.showBanner({
            adId,
            adSize: BannerAdSize.BANNER,
            position: BannerAdPosition.BOTTOM_CENTER,
            margin: 0,
          });
        } catch (e) {
          console.warn('[Ads] showBanner failed', e);
        }
        return;
      }

      const el = showWebBannerBar();
      if (!el?.dataset.adsense && !(await mountWebBanner())) applyBannerPlaceholder(el);
    },

    hideBanner: async () => {
      if (isNativePlatform()) {
        const mod = await loadAdMob();
        if (mod?.AdMob) {
          try { await mod.AdMob.hideBanner(); } catch { /* noop */ }
          try { await mod.AdMob.removeBanner(); } catch { /* noop */ }
        }
        return;
      }
      hideWebBannerBar();
    },

    showInterstitialOverlay: (g = game) => {
      const overlay = new Promise((resolve) => {
        g.events.once('ad:break:done', resolve);
        if (g.scene.isActive(SCENES.AD_BREAK)) g.scene.stop(SCENES.AD_BREAK);
        launchParallelScene(g, SCENES.AD_BREAK, { provider: 'google' });
      });
      return withAdOverlayTimeout(g, overlay).then((r) => r?.value);
    },
  };
}
