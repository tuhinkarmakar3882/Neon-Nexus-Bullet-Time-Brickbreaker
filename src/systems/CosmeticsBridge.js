import { SCENES } from '../config/Constants.js';
import {
  cosmeticById,
  PADDLE_HULLS,
  BALL_TRAILS,
  GARDEN_THEMES,
} from '../config/Cosmetics.js';
import { MetaProgress } from './MetaProgress.js';

/** Apply equipped hull / trail / theme to a live GameScene instance. */
export function applyCosmeticsToGameScene(gs) {
  if (!gs?.paddle) return;
  // getEquipped() is already sanitized against owned ids — do not re-resolve with empty owned.
  const eq = MetaProgress.getEquipped();
  const hull = cosmeticById(PADDLE_HULLS, eq.hull);
  const trail = cosmeticById(BALL_TRAILS, eq.trail);
  const theme = cosmeticById(GARDEN_THEMES, eq.theme);

  try {
    gs.paddle.applyCosmetic?.(hull?.tint ?? 0xffffff);
    gs.paddle.sync?.();
    gs.balls?.forEach((b) => {
      if (!b?.scene) return;
      b.applyCosmetic?.(trail?.tint ?? 0xffffff, trail?.id ?? 'comet');
      b.sync?.();
    });
    if (theme?.accent != null) gs.bg?.setAccent?.(theme.accent);
  } catch (e) {
    console.warn('[Cosmetics] apply failed', e);
  }
}

/** Push equipped cosmetics to any running Game scene. */
export function applyEquippedCosmeticsToGame(game) {
  if (!game?.scene) return;
  const gs = game.scene.getScene(SCENES.GAME);
  if (!gs?.scene) return;
  const sceneUp = gs.scene?.isActive?.() || gs.scene?.isPaused?.();
  if (!sceneUp) return;
  applyCosmeticsToGameScene(gs);
}

export function emitCosmeticsChanged(game) {
  if (typeof window !== 'undefined' && window.__NEON) {
    applyEquippedCosmeticsToGame(window.__NEON);
  }
  game?.events?.emit('meta:cosmetics');
}
