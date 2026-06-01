/**
 * Interstitial cadence — every N successful level clears (not failures/retries).
 * Ad shows only after the player taps Continue on the level-complete overlay.
 */
import { AdsConfig } from '../config/AdsConfig.js';
import { SCENES } from '../config/Constants.js';
import { Monetization } from './Monetization.js';
import { RunPersistence } from './RunPersistence.js';

let completedLevelsSinceLastAd = 0;

export const AdBreakPolicy = {
  get completedLevelsSinceLastAd() {
    return completedLevelsSinceLastAd;
  },

  /** Call once when a level is cleared successfully (before the celebrate overlay). */
  recordLevelSuccess() {
    completedLevelsSinceLastAd += 1;
  },

  resetCounter() {
    completedLevelsSinceLastAd = 0;
  },

  shouldShowInterstitial() {
    if (Monetization.removeAds) return false;
    const every = AdsConfig.interstitial?.everyLevels ?? 2;
    return completedLevelsSinceLastAd >= every;
  },

  /**
   * After the player continues from level complete — save, optional ad, save again.
   * @param {Phaser.Game} game
   */
  async onContinueAfterLevelClear(game) {
    if (!this.shouldShowInterstitial()) return { shown: false };

    const gs = game.scene.get(SCENES.GAME);
    if (gs?.scene?.isActive?.()) RunPersistence.saveRun(gs);

    const res = await Monetization.showInterstitialAfterContinue(game);
    if (res?.shown) this.resetCounter();

    if (gs?.scene?.isActive?.()) RunPersistence.saveRun(gs);
    return res;
  },
};
