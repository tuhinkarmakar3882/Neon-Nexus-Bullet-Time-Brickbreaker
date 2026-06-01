/**
 * Web hooks for Google Ad Manager / fallback interstitial overlay via Phaser.
 * GoogleAdProvider calls these when VITE_ADMANAGER_* units are not wired.
 */

type NeonGame = import('phaser').Game;

function getGame(): NeonGame | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.__NEON;
}

async function runPhaserAdBreak(): Promise<boolean> {
  const game = getGame();
  if (!game) return false;

  const { SCENES } = await import('@/src/config/Constants.js');
  const { launchParallelScene } = await import('@/src/systems/SceneLaunch.js');

  return new Promise((resolve) => {
    const done = () => {
      game.events.off('ad:break:done', done);
      resolve(true);
    };
    game.events.once('ad:break:done', done);
    if (game.scene.isActive(SCENES.AD_BREAK)) game.scene.stop(SCENES.AD_BREAK);
    launchParallelScene(game, SCENES.AD_BREAK, { provider: 'google' });
  });
}

async function runPhaserRewardedSim(placement?: string): Promise<boolean> {
  const game = getGame();
  if (!game) return false;

  const { SCENES } = await import('@/src/config/Constants.js');
  const { launchParallelScene } = await import('@/src/systems/SceneLaunch.js');

  return new Promise((resolve) => {
    const done = () => {
      game.events.off('ad:reward:done', done);
      resolve(true);
    };
    game.events.once('ad:reward:done', done);
    if (game.scene.isActive(SCENES.AD_BREAK)) game.scene.stop(SCENES.AD_BREAK);
    launchParallelScene(game, SCENES.AD_BREAK, { provider: 'reward', placement });
  });
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
        return window.__gptShowInterstitial(interstitialUnit);
      }
      return runPhaserAdBreak();
    };
  }

  if (!window.__googleShowRewarded) {
    window.__googleShowRewarded = async (placement?: string) => {
      if (rewardedUnit && typeof window.__gptShowRewarded === 'function') {
        return window.__gptShowRewarded(rewardedUnit, placement);
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
