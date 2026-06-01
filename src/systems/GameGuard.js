/**
 * Runtime resilience — recover from thrown errors without killing the play session.
 */
import { SCENES } from '../config/Constants.js';
import { InputRouter } from './InputRouter.js';

/** Clear flags that block update() and level transitions after a fault. */
export function clearTransitionFlags(gs) {
  if (!gs) return;
  gs._completingLevel = false;
  gs._pendingCompleteLevel = false;
  gs._levelCompleteQueued = false;
  gs.transitioning = false;
  gs.draftOpen = false;
  gs._draftSource = null;
  try {
    if (gs._draftContainer?.active) gs._draftContainer.destroy();
  } catch { /* ignore */ }
  gs._draftContainer = null;
}

export function safeRun(label, fn, fallback) {
  try {
    return fn();
  } catch (e) {
    console.error(`[GameGuard] ${label}`, e);
    return fallback;
  }
}

export async function safeRunAsync(label, fn, fallback) {
  try {
    return await fn();
  } catch (e) {
    console.error(`[GameGuard] ${label}`, e);
    return fallback;
  }
}

/** Resume Game scene input after a failed overlay / transition. */
export function resumeGameScene(game) {
  if (!game?.scene) return;
  try {
    const gs = game.scene.getScene(SCENES.GAME);
    clearTransitionFlags(gs);
    if (gs?.scene?.isPaused?.()) gs.scene.resume();
    InputRouter.onOverlayClose();
  } catch (e) {
    console.warn('[GameGuard] resumeGameScene failed', e);
  }
}

/**
 * Advance to the next level — never throws; clears stuck transition state on failure.
 * @returns {boolean}
 */
export function safeStartNextLevel(gs) {
  if (!gs?.startNextLevel) return false;
  try {
    gs.startNextLevel();
    return true;
  } catch (e) {
    console.error('[GameGuard] startNextLevel failed', e);
    clearTransitionFlags(gs);
    resumeGameScene(gs.game);
    return false;
  }
}

/** Window + Phaser error hooks — log only; never resume gameplay from global handlers. */
export function attachRuntimeGuards(game) {
  if (!game || game.__neonGuardsAttached) return;
  game.__neonGuardsAttached = true;

  if (game.events?.on) {
    game.events.on('error', (_scene, err) => {
      console.error('[GameGuard] Phaser scene error', err);
    });
  }

  if (typeof window === 'undefined' || window.__neonWindowGuardsAttached) return;
  window.__neonWindowGuardsAttached = true;

  window.addEventListener('error', (ev) => {
    console.error('[GameGuard] window error', ev.error ?? ev.message);
  });
  window.addEventListener('unhandledrejection', (ev) => {
    console.error('[GameGuard] unhandled rejection', ev.reason);
  });
}
