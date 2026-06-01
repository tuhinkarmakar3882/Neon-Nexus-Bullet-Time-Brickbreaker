import { SaveManager } from './SaveManager.js';
import { SCENES } from '../config/Constants.js';
import { RUN_FORMAT_VERSION, upgradeRunSnapshot } from './SaveMigration.js';

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const RunPersistence = {
  loadRun() {
    let snap = SaveManager.loadRun();
    if (!snap) return null;
    if (snap.version !== RUN_FORMAT_VERSION) {
      const upgraded = upgradeRunSnapshot(snap);
      if (upgraded) {
        snap = upgraded;
        SaveManager.saveRun(snap);
      } else {
        SaveManager.clearRun();
        if (typeof window !== 'undefined') {
          window.__neonRunResetReason = 'incompatible_run_version';
        }
        return null;
      }
    }
    if (!snap.savedAt || Date.now() - snap.savedAt > MAX_AGE_MS) {
      SaveManager.clearRun();
      return null;
    }
    if (!Number.isFinite(snap.level) || snap.level < 1) return null;
    if (snap.pendingGameOver) {
      SaveManager.clearRun();
      return null;
    }
    return snap;
  },

  clearRun() {
    SaveManager.clearRun();
  },

  saveRun(gameScene, opts = {}) {
    if (!gameScene) return;
    const pendingGameOver = opts.pendingGameOver === true;
    if (gameScene.over && !pendingGameOver) return;
    const activePowers = gameScene.powerSys?.keys().map((key) => ({
      key,
      remaining: gameScene.powerSys.active.get(key) ?? 0,
    })) ?? [];

    const snapshot = {
      version: RUN_FORMAT_VERSION,
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
      pendingGameOver,
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
    const intervalMs = 15000;
    const intervalId = window.setInterval(save, intervalMs);
    game.events?.once?.('destroy', () => window.clearInterval(intervalId));
  },
};
