/** Unified back navigation — Android hardware back, browser history, and Escape. */
import { Capacitor } from '@capacitor/core';
import { SCENES } from '../config/Constants.js';

/** Always dismiss first (blocking gameplay). */
const BLOCKING_OVERLAYS = [
  SCENES.GAMEOVER,
  SCENES.LEVEL_COMPLETE,
  SCENES.AD_BREAK,
  SCENES.PURCHASE,
];

/** Opened from Pause while Game is paused/sleeping. */
const PAUSE_CHILD_OVERLAYS = [SCENES.SHOP, SCENES.SETTINGS, SCENES.CODEX];

/** Opened from Menu (Menu paused behind). */
const MENU_OVERLAYS = [SCENES.SHOP, SCENES.SETTINGS, SCENES.CODEX];

let gameRef = null;
let lastMenuBackAt = 0;
let overlayHistoryDepth = 0;
let suppressNextHistoryPop = false;

export function attachNavigation(game) {
  gameRef = game;
}

function sm() {
  return gameRef?.scene;
}

function tryOverlayBack(scenes, keys) {
  for (const key of keys) {
    if (!scenes.isActive(key)) continue;
    const scene = scenes.getScene(key);
    if (scene?.handleBack?.()) {
      return { handled: true, action: 'overlay', key };
    }
  }
  return null;
}

function isMenuFlow(scenes) {
  return scenes.isPaused(SCENES.MENU) || scenes.isSleeping(SCENES.MENU);
}

function isGameplayRunning(scenes) {
  const gameScene = scenes.getScene(SCENES.GAME);
  return !!(
    scenes.isActive(SCENES.GAME)
    && gameScene?.sys?.isActive?.()
    && !gameScene.over
    && !gameScene.transitioning
    && !scenes.isPaused(SCENES.GAME)
  );
}

/**
 * @returns {{ handled: boolean, action?: string }}
 */
export function goBack(game = gameRef) {
  const scenes = game?.scene;
  if (!scenes) return { handled: false };

  const blocking = tryOverlayBack(scenes, BLOCKING_OVERLAYS);
  if (blocking) return blocking;

  const pauseActive = scenes.isActive(SCENES.PAUSE);
  const pauseSleeping = scenes.isSleeping(SCENES.PAUSE);

  if (pauseActive) {
    const pauseScene = scenes.getScene(SCENES.PAUSE);
    if (pauseScene?.handleBack?.()) {
      return { handled: true, action: 'pause-resume', key: SCENES.PAUSE };
    }
  }

  if (pauseSleeping || pauseActive) {
    const child = tryOverlayBack(scenes, PAUSE_CHILD_OVERLAYS);
    if (child) return child;
    if (pauseSleeping && !pauseActive) {
      scenes.wake(SCENES.PAUSE);
      return { handled: true, action: 'wake-pause' };
    }
  }

  if (isGameplayRunning(scenes)) {
    for (const key of PAUSE_CHILD_OVERLAYS) {
      if (scenes.isActive(key) && !isMenuFlow(scenes)) {
        scenes.stop(key);
      }
    }
    scenes.getScene(SCENES.GAME).requestPause();
    return { handled: true, action: 'pause-game' };
  }

  if (isMenuFlow(scenes)) {
    const menuOverlay = tryOverlayBack(scenes, MENU_OVERLAYS);
    if (menuOverlay) return menuOverlay;
  }

  if (scenes.isActive(SCENES.MENU) && !scenes.isPaused(SCENES.MENU)) {
    return { handled: handleMenuExitAttempt(game), action: 'menu-exit' };
  }

  return { handled: false, action: 'none' };
}

function handleMenuExitAttempt(game) {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }
  const now = Date.now();
  if (now - lastMenuBackAt < 2000) {
    requestExitApp();
    return true;
  }
  lastMenuBackAt = now;
  game?.events?.emit('hud:toast', { text: 'Press back again to exit', ms: 2000 });
  return true;
}

export async function requestExitApp() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { App } = await import('@capacitor/app');
    await App.exitApp();
  } catch (e) {
    console.warn('[Navigation] exitApp failed', e);
  }
}

/** Push a history entry when an overlay opens (PWA browser back). */
export function pushOverlayHistory() {
  if (Capacitor.isNativePlatform() || typeof window === 'undefined') return;
  try {
    window.history.pushState({ neonOverlay: true }, '');
    overlayHistoryDepth += 1;
  } catch { /* private mode */ }
}

function syncHistoryAfterOverlayClose() {
  if (Capacitor.isNativePlatform() || overlayHistoryDepth <= 0) return;
  overlayHistoryDepth -= 1;
  suppressNextHistoryPop = true;
  try {
    window.history.back();
  } catch { /* ignore */ }
}

/** Call from InputRouter when an overlay closes via UI (not popstate). */
export function popOverlayHistory() {
  syncHistoryAfterOverlayClose();
}

export function attachPopstateListener(game) {
  if (Capacitor.isNativePlatform() || typeof window === 'undefined') return;
  attachNavigation(game);
  window.addEventListener('popstate', () => {
    if (suppressNextHistoryPop) {
      suppressNextHistoryPop = false;
      return;
    }
    if (overlayHistoryDepth > 0) overlayHistoryDepth -= 1;
    goBack(game);
  });
}

export function attachEscapeListener(game) {
  if (typeof window === 'undefined') return;
  attachNavigation(game);
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const result = goBack(game);
    if (result.handled) e.preventDefault();
  });
}
