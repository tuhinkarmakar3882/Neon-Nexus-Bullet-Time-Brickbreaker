import { SCENES } from '../config/Constants.js';
import { MetaProgress } from './MetaProgress.js';
import { SaveManager } from './SaveManager.js';
import { applyBannerPlaceholder, hideWebBannerBar, showWebBannerBar } from './AdBannerSlot.js';
import { withAdOverlayTimeout } from './AdOverlay.js';
import { launchParallelScene } from './SceneLaunch.js';

const AD_SIM_MS = 1400;

const PURCHASE_HOST_ORDER = [SCENES.PAUSE, SCENES.PURCHASE];

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Foreground overlay scene — prefer active, unpaused scene (Shop over Settings). */
function resolvePurchaseHostScene(game) {
  for (const key of PURCHASE_HOST_ORDER) {
    if (game.scene.isActive(key) && !game.scene.isPaused(key)) return key;
  }
  return PURCHASE_HOST_ORDER.find((k) => game.scene.isActive(k)) ?? null;
}

export function createDemoAdProvider(game) {
  return {
    name: 'demo-web',
    init: async () => {},
    /** Native-style fill happens in AdBreakScene overlay on Continue — no pre-overlay delay. */
    showInterstitial: async () => ({ shown: false, simulated: true }),
    showRewarded: async ({ placement } = {}) => {
      await delay(AD_SIM_MS);
      return { rewarded: true, placement, simulated: true };
    },
    purchase: async (productId) => {
      if (typeof window.__nativePurchase === 'function') {
        return window.__nativePurchase(productId);
      }
      return new Promise((resolve) => {
        const sm = game.scene;
        const from = resolvePurchaseHostScene(game);
        let settled = false;

        const done = (res) => {
          if (settled) return;
          settled = true;
          game.events.off('purchase:done', done);
          resolve(res ?? { success: false });
        };

        game.events.once('purchase:done', done);
        if (sm.isActive(SCENES.PURCHASE)) sm.stop(SCENES.PURCHASE);
        if (from && !sm.isPaused(from)) sm.pause(from);
        launchParallelScene(game, SCENES.PURCHASE, { productId, from }, from);
      });
    },
    restore: async () => {
      if (typeof window.__nativeRestore === 'function') {
        return window.__nativeRestore();
      }
      const removeAds = SaveManager.getRemoveAds();
      const premium = MetaProgress.isPremium();
      return {
        success: true,
        simulated: true,
        removeAds,
        premium,
        products: [
          ...(removeAds ? ['remove_ads'] : []),
          ...(premium ? ['premium'] : []),
        ],
      };
    },
    showBanner: () => {
      const el = showWebBannerBar();
      if (el) applyBannerPlaceholder(el);
    },
    hideBanner: () => {
      hideWebBannerBar();
    },
    showInterstitialOverlay: () => {
      const overlay = new Promise((resolve) => {
        game.events.once('ad:break:done', resolve);
        if (game.scene.isActive(SCENES.AD_BREAK)) game.scene.stop(SCENES.AD_BREAK);
        launchParallelScene(game, SCENES.AD_BREAK, { provider: 'demo' });
      });
      return withAdOverlayTimeout(game, overlay).then((r) => r?.value);
    },
  };
}
