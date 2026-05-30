import { SaveManager } from './SaveManager.js';
import { SCENES } from '../config/Constants.js';

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const RunPersistence = {
  loadRun() {
    const snap = SaveManager.loadRun();
    if (!snap || snap.version !== 1) return null;
    if (!snap.savedAt || Date.now() - snap.savedAt > MAX_AGE_MS) {
      SaveManager.clearRun();
      return null;
    }
    if (!Number.isFinite(snap.level) || snap.level < 1) return null;
    return snap;
  },

  clearRun() {
    SaveManager.clearRun();
  },

  saveRun(gameScene) {
    if (!gameScene || gameScene.over) return;
    const activePowers = gameScene.powerSys?.keys().map((key) => ({
      key,
      remaining: gameScene.powerSys.active.get(key) ?? 0,
    })) ?? [];

    const snapshot = {
      version: 1,
      savedAt: Date.now(),
      campaignSeed: gameScene.campaignSeed ?? ((Date.now() ^ 0x5f3759df) >>> 0),
      level: gameScene.level,
      score: gameScene.score,
      lives: gameScene.lives,
      continues: gameScene.continues,
      combo: gameScene.combo,
      activePowers,
      ballElement: gameScene.balls?.[0]?.element ?? null,
      levelSeed: gameScene.levelSeed ?? gameScene.campaignSeed + gameScene.level,
      powerDropSeq: gameScene.powerDropSeq ?? 0,
      brickDamage: gameScene.bricks
        ?.map((b, i) => (b.alive && b.hp < b.maxHp ? { i, hp: b.hp } : null))
        .filter(Boolean) ?? [],
    };
    SaveManager.saveRun(snapshot);
  },

  attachAutoSave(game) {
    const save = () => {
      const gs = game.scene.getScene(SCENES.GAME);
      if (gs?.scene?.isActive() && !gs.over) RunPersistence.saveRun(gs);
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') save();
    });
    window.addEventListener('beforeunload', save);
  },
};
