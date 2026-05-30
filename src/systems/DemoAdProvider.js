import { SCENES } from '../config/Constants.js';
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
      await delay(600);
      return { success: true, productId, simulated: true };
    },
    restore: async () => ({ success: true, simulated: true }),
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
