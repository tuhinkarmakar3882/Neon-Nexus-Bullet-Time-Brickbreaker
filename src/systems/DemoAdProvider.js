import { SCENES } from '../config/Constants.js';
import { MetaProgress } from './MetaProgress.js';
import { SaveManager } from './SaveManager.js';
import { applyBannerPlaceholder, hideWebBannerBar, showWebBannerBar } from './AdBannerSlot.js';

const AD_SIM_MS = 1400;

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function createDemoAdProvider(game) {
  return {
    name: 'demo-web',
    init: async () => {},
    showInterstitial: async () => {
      await delay(AD_SIM_MS);
      return { shown: true, simulated: true };
    },
    showRewarded: async ({ placement } = {}) => {
      await delay(AD_SIM_MS);
      return { rewarded: true, placement, simulated: true };
    },
    purchase: async (productId) => {
      if (typeof window.__nativePurchase === 'function') {
        return window.__nativePurchase(productId);
      }
      return new Promise((resolve) => {
        const from = [SCENES.SETTINGS, SCENES.SHOP, SCENES.MENU, SCENES.PAUSE]
          .find((k) => game.scene.isActive(k)) ?? null;

        const done = (res) => {
          game.events.off('purchase:done', done);
          if (from && game.scene.isPaused(from)) game.scene.resume(from);
          resolve(res ?? { success: false });
        };
        game.events.once('purchase:done', done);
        if (game.scene.isActive(SCENES.PURCHASE)) game.scene.stop(SCENES.PURCHASE);
        if (from) game.scene.pause(from);
        game.scene.launch(SCENES.PURCHASE, { productId, from });
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
    showInterstitialOverlay: () => new Promise((resolve) => {
      game.events.once('ad:break:done', resolve);
      if (game.scene.isActive(SCENES.AD_BREAK)) game.scene.stop(SCENES.AD_BREAK);
      game.scene.launch(SCENES.AD_BREAK, { provider: 'demo' });
    }),
  };
}
