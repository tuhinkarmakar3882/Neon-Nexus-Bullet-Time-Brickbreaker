import { SCENES } from '../config/Constants.js';

/** Max wait for in-game AdBreak / rewarded overlays before continuing the game. */
export const AD_OVERLAY_TIMEOUT_MS = 45_000;

/**
 * Race an overlay promise (resolves on ad:break:done / ad:reward:done) with a timeout.
 * On timeout, closes AdBreakScene so level flow is never stuck.
 */
export function withAdOverlayTimeout(game, overlayPromise, timeoutMs = AD_OVERLAY_TIMEOUT_MS) {
  if (!game) return Promise.resolve({ timedOut: true });

  let timer;

  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => {
      try {
        if (game.scene?.isActive(SCENES.AD_BREAK)) {
          const scene = game.scene.getScene(SCENES.AD_BREAK);
          if (typeof scene?.finish === 'function') scene.finish();
          else game.scene.stop(SCENES.AD_BREAK);
        }
      } catch (e) {
        console.warn('[Ads] overlay timeout cleanup failed', e);
      }
      resolve({ timedOut: true });
    }, timeoutMs);
  });

  const overlayDone = Promise.resolve(overlayPromise)
    .then((value) => ({ timedOut: false, value }))
    .catch((error) => {
      console.warn('[Ads] overlay failed', error);
      return { timedOut: false, error };
    })
    .finally(() => clearTimeout(timer));

  return Promise.race([overlayDone, timeoutPromise]);
}
