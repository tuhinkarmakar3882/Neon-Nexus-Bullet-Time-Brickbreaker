/**
 * Web hooks for Google Ad Manager / fallback interstitial overlay via Phaser.
 * GoogleAdProvider calls these when VITE_ADMANAGER_* units are not wired.
 */

type NeonGame = import('phaser').Game;

const OVERLAY_TIMEOUT_MS = 45_000;

function getGame(): NeonGame | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.__NEON;
}

async function waitForOverlayEvent(
  event: 'ad:break:done' | 'ad:reward:done',
  launch: () => void,
): Promise<boolean> {
  const game = getGame();
  if (!game) return false;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      game.events.off('ad:break:done', onBreak);
      game.events.off('ad:reward:done', onReward);
      resolve(ok);
    };

    const onBreak = () => finish(true);
    const onReward = () => finish(true);
    game.events.once('ad:break:done', onBreak);
    game.events.once('ad:reward:done', onReward);

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const { SCENES } = await import('@/src/config/Constants.js');
          if (game.scene?.isActive(SCENES.AD_BREAK)) {
            const scene = game.scene.getScene(SCENES.AD_BREAK) as { finish?: () => void } | undefined;
            if (typeof scene?.finish === 'function') scene.finish();
            else game.scene.stop(SCENES.AD_BREAK);
          }
        } catch (e) {
          console.warn('[Ads] overlay timeout cleanup failed', e);
        }
        finish(false);
      })();
    }, OVERLAY_TIMEOUT_MS);

    launch();
  });
}

async function runPhaserAdBreak(): Promise<boolean> {
  const game = getGame();
  if (!game) return false;

  const { SCENES } = await import('@/src/config/Constants.js');
  const { launchParallelScene } = await import('@/src/systems/SceneLaunch.js');

  return waitForOverlayEvent('ad:break:done', () => {
    if (game.scene.isActive(SCENES.AD_BREAK)) game.scene.stop(SCENES.AD_BREAK);
    launchParallelScene(game, SCENES.AD_BREAK, { provider: 'google' });
  });
}

async function runPhaserRewardedSim(placement?: string): Promise<boolean> {
  const game = getGame();
  if (!game) return false;

  const { SCENES } = await import('@/src/config/Constants.js');
  const { launchParallelScene } = await import('@/src/systems/SceneLaunch.js');

  return waitForOverlayEvent('ad:reward:done', () => {
    if (game.scene.isActive(SCENES.AD_BREAK)) game.scene.stop(SCENES.AD_BREAK);
    launchParallelScene(game, SCENES.AD_BREAK, { provider: 'reward', placement });
  });
}

async function tryGpt<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    console.warn('[Ads] GPT call failed', e);
    return null;
  }
}

/**
 * Register global bridges consumed by GoogleAdProvider on web.
 * GAM implementations can replace these after GPT loads.
 */
export function registerWebAdBridge(): void {
  if (typeof window === 'undefined') return;

  const interstitialUnit = process.env.NEXT_PUBLIC_ADMANAGER_INTERSTITIAL_WEB
    ?? process.env.VITE_ADMANAGER_INTERSTITIAL_WEB
    ?? '';
  const rewardedUnit = process.env.NEXT_PUBLIC_ADMANAGER_REWARDED_WEB
    ?? process.env.VITE_ADMANAGER_REWARDED_WEB
    ?? '';

  if (!window.__googleShowInterstitial) {
    window.__googleShowInterstitial = async () => {
      if (interstitialUnit && typeof window.__gptShowInterstitial === 'function') {
        const ok = await tryGpt(() => window.__gptShowInterstitial!(interstitialUnit));
        if (ok) return true;
      }
      return runPhaserAdBreak();
    };
  }

  if (!window.__googleShowRewarded) {
    window.__googleShowRewarded = async (placement?: string) => {
      if (rewardedUnit && typeof window.__gptShowRewarded === 'function') {
        const ok = await tryGpt(() => window.__gptShowRewarded!(rewardedUnit, placement));
        if (ok) return true;
      }
      return runPhaserRewardedSim(placement);
    };
  }
}

export function unregisterWebAdBridge(): void {
  if (typeof window === 'undefined') return;
  delete window.__googleShowInterstitial;
  delete window.__googleShowRewarded;
}
