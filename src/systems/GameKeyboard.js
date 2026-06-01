/** Window-level keyboard for /play — works when React HUD or DOM has focus (not only the canvas). */
import { SCENES } from '../config/Constants.js';
import { InputRouter } from './InputRouter.js';

const BLOCKING_OVERLAYS = [
  SCENES.GAMEOVER,
  SCENES.LEVEL_COMPLETE,
  SCENES.AD_BREAK,
  SCENES.PURCHASE,
];

const held = { left: false, right: false };
let detachFn = null;

function isFormTarget() {
  const el = document.activeElement;
  const tag = el?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return !!el?.isContentEditable;
}

export function isArrowHeld(dir) {
  return dir === 'left' ? held.left : held.right;
}

function getGameScene(game) {
  const gs = game?.scene?.getScene(SCENES.GAME);
  if (!gs?.scene?.isActive?.()) return null;
  return gs;
}

function onKeyDown(e, game) {
  if (isFormTarget()) return;

  const scenes = game?.scene;
  if (!scenes) return;

  if (scenes.isActive(SCENES.PAUSE)) {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      scenes.getScene(SCENES.PAUSE)?.resume?.(true);
    }
    return;
  }

  for (const key of BLOCKING_OVERLAYS) {
    if (!scenes.isActive(key)) continue;
    const scene = scenes.getScene(key);
    if (e.key === 'Escape' && scene?.handleBack) {
      e.preventDefault();
      scene.handleBack();
      return;
    }
    if ((e.key === ' ' || e.key === 'Enter') && scene?._advance) {
      e.preventDefault();
      scene._advance();
    }
    return;
  }

  const gs = getGameScene(game);
  if (!gs || gs.over || gs.transitioning) return;

  if (e.key === 'ArrowLeft') {
    held.left = true;
    e.preventDefault();
    return;
  }
  if (e.key === 'ArrowRight') {
    held.right = true;
    e.preventDefault();
    return;
  }

  if (InputRouter.shouldBlockGameplay() || gs.draftOpen) return;

  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    gs.onKeyboardLaunch?.();
    return;
  }

  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
    e.preventDefault();
    gs.requestPause?.();
  }
}

function onKeyUp(e) {
  if (e.key === 'ArrowLeft') held.left = false;
  if (e.key === 'ArrowRight') held.right = false;
}

/** Attach play-route keyboard; call once after Phaser READY. */
export function attachGameKeyboard(game) {
  detachGameKeyboard();
  const down = (e) => onKeyDown(e, game);
  const up = onKeyUp;
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  detachFn = () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    held.left = false;
    held.right = false;
    detachFn = null;
  };
}

export function detachGameKeyboard() {
  detachFn?.();
}

/** Escape from play — used by Navigation when global back runs. */
export function handlePlayEscape(game) {
  const scenes = game?.scene;
  if (!scenes) return { handled: false };

  if (scenes.isActive(SCENES.PAUSE)) {
    scenes.getScene(SCENES.PAUSE)?.resume?.(true);
    return { handled: true, action: 'pause-resume' };
  }

  for (const key of BLOCKING_OVERLAYS) {
    if (!scenes.isActive(key)) continue;
    const scene = scenes.getScene(key);
    if (scene?.handleBack?.()) return { handled: true, action: 'overlay-back', key };
    return { handled: true, action: 'overlay-active', key };
  }

  const gs = getGameScene(game);
  if (gs && !gs.over && !gs.transitioning && !InputRouter.shouldBlockGameplay()) {
    gs.requestPause?.();
    return { handled: true, action: 'pause-game' };
  }

  return { handled: false };
}
