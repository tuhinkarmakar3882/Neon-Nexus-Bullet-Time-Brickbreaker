import { SaveManager } from '../systems/SaveManager.js';
import { MetaProgress } from '../systems/MetaProgress.js';
import { queuePostRunSummary } from './hubRewardQueue.js';

/**
 * Call when leaving play for the hub — records return streak + post-run summary queue.
 * @param {import('../scenes/GameScene.js').GameScene | null | undefined} scene
 * @param {'gameover' | 'quit'} reason
 * @param {{ isNewBest?: boolean; stars?: number; gemsEarned?: number }} [extra]
 */
export function recordHubExitFromPlay(scene, reason, extra = {}) {
  const streak = MetaProgress.recordHubReturn();
  const level = scene?.level ?? 1;
  const score = scene?.score ?? 0;
  const hs = SaveManager.getHighScore();
  queuePostRunSummary({
    reason,
    level,
    score,
    stars: extra.stars ?? MetaProgress.getStars(`L${level}`),
    gemsEarned: extra.gemsEarned,
    isNewBest: extra.isNewBest ?? (score >= hs && score > 0),
    returnStreak: streak,
  });
}
