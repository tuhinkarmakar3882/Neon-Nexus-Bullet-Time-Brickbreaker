import { SCENES } from '@/src/config/Constants.js';

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

export function pauseOverlayQuitToMenu() {
  getPauseScene()?.exitToHub?.();
}
