import Phaser from 'phaser';
import { BRICK, GAME, SCENES, computeLayout } from '../config/Constants.js';
import { regenerateBrickPanelTextures } from '../utils/Textures.js';

let lastAspect = null;
let lastW = 0;
let lastH = 0;
let lastBrickW = 0;
let lastBrickH = 0;

/** True when a live match is running (layout must stay locked). */
export function isGameplayLocked(game) {
  const gs = game.scene.getScene(SCENES.GAME);
  return !!(gs?.scene?.isActive() && !gs.over && !gs.transitioning);
}

/** Size of the Phaser parent element (actual drawable area). */
export function getViewportSize() {
  const root = document.getElementById('game-root');
  const stage = document.querySelector('.play-stage--hud') ?? document.querySelector('.play-stage');
  const vv = window.visualViewport;
  const rect = root?.getBoundingClientRect?.();
  const rw = rect?.width > 0 ? rect.width : (root?.clientWidth ?? 0);
  const rh = rect?.height > 0 ? rect.height : (root?.clientHeight ?? 0);
  const vw = vv?.width ?? window.innerWidth ?? 390;
  const vh = vv?.height ?? window.innerHeight ?? 844;
  const stageRect = stage?.getBoundingClientRect?.();
  const w = rw > 32 ? rw : (stageRect?.width > 32 ? stageRect.width : vw);
  const h = rh > 32 ? rh : (stageRect?.height > 32 ? stageRect.height : vh);
  return { w: Math.max(320, Math.round(w)), h: Math.max(400, Math.round(h)) };
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

/** Cap device pixel ratio — used for text/texture resolution, not canvas buffer. */
export function getDisplayPixelRatio() {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
}

/** Prefer smooth bicubic scaling when the browser CSS-scales the canvas. */
export function applyCanvasSmoothing(game) {
  const canvas = game?.canvas;
  if (!canvas || !Phaser.Display?.Canvas?.CanvasInterpolation?.setBicubic) return;
  Phaser.Display.Canvas.CanvasInterpolation.setBicubic(canvas);
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
  const brickResized = BRICK.WIDTH !== lastBrickW || BRICK.HEIGHT !== lastBrickH;
  lastBrickW = BRICK.WIDTH;
  lastBrickH = BRICK.HEIGHT;
  lastAspect = aspect;
  lastW = GAME.WIDTH;
  lastH = GAME.HEIGHT;
  return changed || brickResized;
}

function maybeRefreshBrickTextures(game) {
  if (!game?.scene || game.scene.isActive(SCENES.GAME)) return;
  const boot = game.scene.getScene(SCENES.BOOT);
  const preload = game.scene.getScene(SCENES.PRELOAD);
  const scene = boot?.scene?.isActive() ? boot : preload;
  if (scene) regenerateBrickPanelTextures(scene);
}

/** After CSS play-frame layout, re-measure and resize Phaser if needed. */
export function syncPlayFrameLayout(game) {
  const changed = syncViewportLayout();
  if (changed) maybeRefreshBrickTextures(game);
  if (game?.scale && changed) applyLogicalResize(game);
  else refreshDisplayScale(game);
  return changed;
}

/** Phaser FIT — refit canvas inside parent without changing logical size. */
export function refreshDisplayScale(game) {
  if (!game?.scale) return;
  game.scale.refresh();
  syncSceneCameras(game);
  applyCanvasSmoothing(game);
}

/** Resize Phaser logical canvas and sync every active camera viewport. */
export function applyLogicalResize(game) {
  if (!game?.scale) return;
  game.scale.setGameSize(GAME.WIDTH, GAME.HEIGHT);
  game.scale.refresh();
  syncSceneCameras(game);
  applyCanvasSmoothing(game);
}

/** Keep camera viewports aligned with logical game size (fixes post-resize drift). */
export function syncSceneCameras(game) {
  if (!game?.scene?.scenes) return;
  for (const scene of game.scene.scenes) {
    const cam = scene.cameras?.main;
    if (!cam) continue;
    cam.setSize(GAME.WIDTH, GAME.HEIGHT);
    cam.setZoom(1);
    cam.centerOn(GAME.WIDTH / 2, GAME.HEIGHT / 2);
    cam.setAngle(0);
    cam.setRotation(0);
  }
}

export function getLayoutSize() {
  return { w: lastW || GAME.WIDTH, h: lastH || GAME.HEIGHT };
}
