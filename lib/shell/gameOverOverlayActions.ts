import { SCENES } from '@/src/config/Constants.js';
import type { GameOverShareStats } from '@/lib/shell/gameOverOverlayTypes';

type GameOverSceneLike = {
  videoContinue?: () => Promise<string>;
  inventoryContinue?: () => void;
  restart?: () => void;
  mainMenu?: () => void;
  shareProgress?: (stats?: GameOverShareStats) => Promise<string>;
};

function getGameOverScene(): GameOverSceneLike | undefined {
  return window.__NEON?.scene?.getScene(SCENES.GAMEOVER) as GameOverSceneLike | undefined;
}

export function gameOverOverlayWatchContinue(): Promise<string> {
  return getGameOverScene()?.videoContinue?.() ?? Promise.resolve('Unavailable');
}

export function gameOverOverlayInventoryContinue(): void {
  getGameOverScene()?.inventoryContinue?.();
}

export function gameOverOverlayRestart() {
  getGameOverScene()?.restart?.();
}

export function gameOverOverlayMainMenu() {
  getGameOverScene()?.mainMenu?.();
}

export function gameOverOverlayShare(stats?: GameOverShareStats): Promise<string> {
  return getGameOverScene()?.shareProgress?.(stats) ?? Promise.resolve('Share unavailable');
}
