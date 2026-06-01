import { SCENES } from '../config/Constants.js';
import { cosmeticById, PADDLE_HULLS, BALL_TRAILS, GARDEN_THEMES } from '../config/Cosmetics.js';
import { MetaProgress } from './MetaProgress.js';

/** Push equipped cosmetics to any running Game scene (and menu backdrop). */
export function applyEquippedCosmeticsToGame(game) {
  if (!game?.scene) return;
  const eq = MetaProgress.getEquipped();
  const hull = cosmeticById(PADDLE_HULLS, eq.hull);
  const trail = cosmeticById(BALL_TRAILS, eq.trail);
  const theme = cosmeticById(GARDEN_THEMES, eq.theme);

  const gs = game.scene.getScene(SCENES.GAME);
  if (gs?.sys?.isActive?.() || gs?.sys?.isPaused?.()) {
    gs.paddle?.applyCosmetic?.(hull.tint);
    gs.balls?.forEach((b) => b.applyCosmetic?.(trail.tint, trail.id));
    if (theme?.accent) gs.bg?.setAccent?.(theme.accent);
  }

}

export function emitCosmeticsChanged(game) {
  game?.events?.emit('meta:cosmetics');
}
