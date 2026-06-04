import { SCENES } from '@/src/config/Constants.js';
import type { LevelCompleteDoubleResult } from '@/lib/shell/levelCompleteOverlayTypes';

type LevelCompleteSceneLike = {
  advance?: () => Promise<void>;
  doubleBonus?: () => Promise<LevelCompleteDoubleResult>;
  shareProgress?: () => Promise<string>;
};

function getLevelCompleteScene(): LevelCompleteSceneLike | undefined {
  return window.__NEON?.scene?.getScene(SCENES.LEVEL_COMPLETE) as LevelCompleteSceneLike | undefined;
}

export function levelCompleteOverlayAdvance(): void {
  void getLevelCompleteScene()?.advance?.();
}

export function levelCompleteOverlayDoubleBonus(): Promise<LevelCompleteDoubleResult> {
  return getLevelCompleteScene()?.doubleBonus?.()
    ?? Promise.resolve({ ok: false, message: 'Unavailable' });
}

export function levelCompleteOverlayShare(): Promise<string> {
  return getLevelCompleteScene()?.shareProgress?.() ?? Promise.resolve('Share unavailable');
}
