import { GAME, SCENES, computeLayout } from '../config/Constants.js';

let lastAspect = null;
let lastW = 0;
let lastH = 0;

/** True when a live match is running (layout must stay locked). */
export function isGameplayLocked(game) {
  const gs = game.scene.getScene(SCENES.GAME);
  return !!(gs?.scene?.isActive() && !gs.over && !gs.transitioning);
}

/** Size of the Phaser parent element (actual drawable area). */
export function getViewportSize() {
  const root = document.getElementById('game-root');
  const vv = window.visualViewport;
  const rw = root?.clientWidth ?? 0;
  const rh = root?.clientHeight ?? 0;
  const w = rw > 32 ? rw : (vv?.width || window.innerWidth || 390);
  const h = rh > 32 ? rh : (vv?.height || window.innerHeight || 844);
  return { w: Math.max(320, Math.round(w)), h: Math.max(480, Math.round(h)) };
}

/** Resolve env(safe-area-inset-*) to pixel values. */
export function readSafeAreaInsets() {
  if (typeof document === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
  const probe = document.createElement('div');
  probe.style.cssText = [
    'position:fixed',
    'visibility:hidden',
    'pointer-events:none',
    'padding-top:env(safe-area-inset-top,0px)',
    'padding-bottom:env(safe-area-inset-bottom,0px)',
    'padding-left:env(safe-area-inset-left,0px)',
    'padding-right:env(safe-area-inset-right,0px)',
  ].join(';');
  document.body.appendChild(probe);
  const s = getComputedStyle(probe);
  const out = {
    top: parseFloat(s.paddingTop) || 0,
    bottom: parseFloat(s.paddingBottom) || 0,
    left: parseFloat(s.paddingLeft) || 0,
    right: parseFloat(s.paddingRight) || 0,
  };
  probe.remove();
  return out;
}

/**
 * Recompute logical layout from the viewport.
 * @returns {boolean} true when GAME.WIDTH/HEIGHT changed
 */
export function syncViewportLayout() {
  const { w, h } = getViewportSize();
  const aspect = w / h;
  const prevW = GAME.WIDTH;
  const prevH = GAME.HEIGHT;
  computeLayout(w, h, readSafeAreaInsets());
  const changed = GAME.WIDTH !== prevW || GAME.HEIGHT !== prevH;
  lastAspect = aspect;
  lastW = GAME.WIDTH;
  lastH = GAME.HEIGHT;
  return changed;
}

/** Phaser FIT — refit canvas inside parent without changing logical size. */
export function refreshDisplayScale(game) {
  if (!game?.scale) return;
  game.scale.refresh();
}

/** Resize Phaser logical canvas and sync every active camera viewport. */
export function applyLogicalResize(game) {
  if (!game?.scale) return;
  game.scale.setGameSize(GAME.WIDTH, GAME.HEIGHT);
  game.scale.refresh();
  syncSceneCameras(game);
}

/** Keep camera viewports aligned with logical game size (fixes post-resize drift). */
export function syncSceneCameras(game) {
  if (!game?.scene?.scenes) return;
  for (const scene of game.scene.scenes) {
    const cam = scene.cameras?.main;
    if (!cam) continue;
    cam.setSize(GAME.WIDTH, GAME.HEIGHT);
    cam.centerOn(GAME.WIDTH / 2, GAME.HEIGHT / 2);
    cam.setZoom(1);
    cam.setAngle(0);
    cam.setRotation(0);
  }
}

export function getLayoutSize() {
  return { w: lastW || GAME.WIDTH, h: lastH || GAME.HEIGHT };
}
