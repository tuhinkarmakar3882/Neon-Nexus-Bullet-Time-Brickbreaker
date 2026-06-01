/** Unified back navigation — Android hardware back, browser history, and Escape. */
import { Capacitor } from '@capacitor/core';
import { SCENES } from '../config/Constants.js';

export const NAV = {
  MENU: 'menu',
  GAME: 'game',
  PAUSE: 'pause',
  OVERLAY: 'overlay',
};

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
let historyDepth = 0;
let suppressNextHistoryPop = false;
let skipNextHistorySync = false;

export function attachNavigation(game) {
  gameRef = game;
}

function historyEnabled() {
  return typeof window !== 'undefined' && !Capacitor.isNativePlatform();
}

function pushNavState(kind) {
  if (!historyEnabled()) return;
  try {
    window.history.pushState({ neonNav: kind }, '');
    historyDepth += 1;
  } catch { /* private mode */ }
}

function syncHistoryPop() {
  if (!historyEnabled() || historyDepth <= 0) return;
  historyDepth -= 1;
  suppressNextHistoryPop = true;
  try {
    window.history.back();
  } catch { /* ignore */ }
}

/** Menu is the history baseline (not counted in depth). */
export function establishMenuHistory() {
  if (!historyEnabled()) return;
  try {
    window.history.replaceState({ neonNav: NAV.MENU }, '');
    historyDepth = 0;
  } catch { /* private mode */ }
}

/** New run / resume — push gameplay onto the stack (web/PWA back). */
export function pushGameplayHistory() {
  pushNavState(NAV.GAME);
}

/** Pause menu layer on top of gameplay. */
export function pushPauseHistory() {
  pushNavState(NAV.PAUSE);
}

/** Generic overlay (shop, settings from menu, etc.). */
export function pushOverlayHistory() {
  pushNavState(NAV.OVERLAY);
}

/** Returning to main menu — reset stack to menu baseline. */
export function clearGameplayHistory() {
  establishMenuHistory();
}

/** After programmatic close (Resume button) — sync browser stack. */
export function popOverlayHistory() {
  if (skipNextHistorySync) {
    skipNextHistorySync = false;
    return;
  }
  syncHistoryPop();
}

export function markHistorySyncSkipped() {
  skipNextHistorySync = true;
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

export function quitGameToMenu(game = gameRef) {
  const scenes = game?.scene;
  if (!scenes) return;
  for (const key of [SCENES.PAUSE, ...PAUSE_CHILD_OVERLAYS, SCENES.GAMEOVER, SCENES.LEVEL_COMPLETE]) {
    if (scenes.isActive(key)) scenes.stop(key);
  }
  if (scenes.isActive(SCENES.HUD)) scenes.stop(SCENES.HUD);
  if (scenes.isActive(SCENES.GAME)) scenes.stop(SCENES.GAME);
  clearGameplayHistory();
  scenes.start(SCENES.MENU);
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

  if (scenes.isActive(SCENES.GAME) && !scenes.isActive(SCENES.MENU)) {
    quitGameToMenu(game);
    return { handled: true, action: 'game-exit' };
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

export function attachPopstateListener(game) {
  if (!historyEnabled()) return;
  attachNavigation(game);
  window.addEventListener('popstate', () => {
    if (suppressNextHistoryPop) {
      suppressNextHistoryPop = false;
      return;
    }
    if (historyDepth > 0) historyDepth -= 1;

    const kind = window.history.state?.neonNav;
    const scenes = game?.scene;
    if (kind === NAV.MENU && scenes?.isActive(SCENES.GAME)) {
      quitGameToMenu(game);
      return;
    }

    markHistorySyncSkipped();
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
