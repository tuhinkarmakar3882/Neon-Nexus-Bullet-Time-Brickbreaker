import { SCENES } from '@/src/config/Constants.js';
import { hidePauseAdSlot } from '@/lib/ads/pauseAdSlot';
import { ROUTES, saveRunAndLeavePlay } from '@/lib/shell/routes';
import { InputRouter } from '@/src/systems/InputRouter.js';

type PauseSceneLike = {
  resume?: (syncHistory?: boolean) => void;
  exitToHub?: () => void;
};

function getPauseScene(): PauseSceneLike | undefined {
  return window.__NEON?.scene?.getScene(SCENES.PAUSE) as PauseSceneLike | undefined;
}

export function pauseOverlayResume(syncHistory = true) {
  getPauseScene()?.resume?.(syncHistory);
}

export function pauseOverlayOpenSettings() {
  hidePauseAdSlot();
  InputRouter.onOverlayClose(SCENES.PAUSE, false, false);
  saveRunAndLeavePlay(ROUTES.settings, { from: 'play' });
}

export function pauseOverlayQuitToMenu() {
  getPauseScene()?.exitToHub?.();
}
