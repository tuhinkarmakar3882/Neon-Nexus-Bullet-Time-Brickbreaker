/**
 * Phaser bootstrap — play route only (no Menu / Shop / Settings / Codex scenes).
 */
import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { BootScene } from '../scenes/BootScene.js';
import { PreloadScene } from '../scenes/PreloadScene.js';
import { GameScene } from '../scenes/GameScene.js';
import { UIScene } from '../scenes/UIScene.js';
import { PauseScene } from '../scenes/PauseScene.js';
import { GameOverScene } from '../scenes/GameOverScene.js';
import { LevelCompleteScene } from '../scenes/LevelCompleteScene.js';
import { AdBreakScene } from '../scenes/AdBreakScene.js';
import { PurchaseScene } from '../scenes/PurchaseScene.js';
import { InputRouter } from '../systems/InputRouter.js';
import { RunPersistence } from '../systems/RunPersistence.js';
import { isIapEnabled } from '../config/AdsConfig.js';
import { Monetization } from '../systems/Monetization.js';
import { createAdProvider } from '../systems/createAdProvider.js';
import { SaveManager } from '../systems/SaveManager.js';
import {
  applyLogicalResize,
  isGameplayLocked,
  refreshDisplayScale,
  syncViewportLayout,
  syncPlayFrameLayout,
} from '../systems/LayoutManager.js';
import { attachFullscreenListener, lockMobileViewport } from '../systems/Fullscreen.js';
import { initNativeBridge } from '../systems/NativeBridge.js';
import { attachAppLifecycle } from '../systems/AppLifecycle.js';
import { runMigrations } from '../systems/SaveMigration.js';
import {
  attachEscapeListener,
  attachNavigation,
  attachPopstateListener,
  goBack,
  popOverlayHistory,
  pushOverlayHistory,
  markHistorySyncSkipped,
} from '../systems/Navigation.js';
import { attachGameKeyboard, detachGameKeyboard } from '../systems/GameKeyboard.js';
import { attachLegalShell, wireLegalShellNavigation } from '../shell/LegalShell.js';
import { audio } from '../systems/AudioManager.js';
import { syncPendingEntitlements } from '../systems/WebUnlock.js';
import { launchParallelScene } from '../systems/SceneLaunch.js';
import { Capacitor } from '@capacitor/core';
import { getEnv } from '../config/env.js';
import { peekForceNew, peekPlayIntent } from '../shell/playIntent.js';
import { setBootSplash } from '../shell/BootSplash.js';
import { attachRuntimeGuards } from '../systems/GameGuard.js';

const isMobile = typeof navigator !== 'undefined'
  && /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);

let game = null;
let bootSettledAt = 0;

function isProd() {
  return getEnv('NODE_ENV', '') === 'production'
    || getEnv('MODE', '') === 'production';
}

function buildPhaserConfig() {
  syncViewportLayout();
  return {
    type: Phaser.AUTO,
    parent: 'game-root',
    backgroundColor: '#08050c',
    width: GAME.WIDTH,
    height: GAME.HEIGHT,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      autoRound: false,
      width: GAME.WIDTH,
      height: GAME.HEIGHT,
      parent: 'game-root',
    },
    input: {
      activePointers: 1,
      touch: { capture: true },
    },
    render: {
      antialias: true,
      antialiasGL: true,
      roundPixels: false,
      transparent: false,
      clearBeforeRender: true,
      powerPreference: isMobile ? 'default' : 'high-performance',
      batchSize: isMobile ? 2048 : 4096,
    },
    fps: { target: 60, min: 30 },
    scene: [
      BootScene,
      PreloadScene,
      GameScene,
      UIScene,
      PauseScene,
      GameOverScene,
      LevelCompleteScene,
      AdBreakScene,
      PurchaseScene,
    ],
  };
}

function restartUiScenes() {
  const restartKeys = [
    SCENES.PAUSE,
    SCENES.GAMEOVER,
    SCENES.LEVEL_COMPLETE,
  ];
  for (const key of restartKeys) {
    const s = game.scene.getScene(key);
    if (s?.scene?.isActive()) s.scene.restart();
  }
}

function handleViewportChange() {
  if (!game?.scale) return;
  try {
    handleViewportChangeInner();
  } catch (e) {
    console.warn('[Neon Nexus] viewport layout failed', e);
  }
}

function handleViewportChangeInner() {
  if (!game?.scale) return;
  if (isGameplayLocked(game)) {
    refreshDisplayScale(game);
    return;
  }

  const layoutChanged = syncViewportLayout();
  if (layoutChanged) {
    applyLogicalResize(game);
    if (Date.now() - bootSettledAt < 1800) return;
    restartUiScenes();
    const gs = game.scene.getScene(SCENES.GAME);
    if (gs?.scene?.isActive() && gs.relayout) gs.relayout();
    if (game.scene.isActive(SCENES.UI)) {
      game.scene.stop(SCENES.UI);
      launchParallelScene(game, SCENES.UI);
    }
  } else {
    refreshDisplayScale(game);
  }
}

let resizeTimer = null;
function scheduleViewportChange() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(handleViewportChange, 120);
}

function attachViewportListeners() {
  window.addEventListener('resize', scheduleViewportChange);
  window.addEventListener('orientationchange', () => {
    lockMobileViewport();
    scheduleViewportChange();
  });
  window.visualViewport?.addEventListener('resize', scheduleViewportChange);
  window.visualViewport?.addEventListener('scroll', scheduleViewportChange);
  attachFullscreenListener(() => scheduleViewportChange());
}

function warnProductionConfig() {
  if (!isProd()) return;
  const adMode = (getEnv('VITE_AD_PROVIDER', 'demo')).toLowerCase();
  if (adMode === 'demo') {
    console.warn('[Neon Nexus] VITE_AD_PROVIDER=demo in production — set to google for ad-supported release.');
  }
  if (!isIapEnabled()) return;
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android' && !getEnv('VITE_REVENUECAT_ANDROID_KEY')) {
    console.warn('[Neon Nexus] VITE_REVENUECAT_ANDROID_KEY missing — IAP will use demo store on Android.');
  }
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' && !getEnv('VITE_REVENUECAT_IOS_KEY')) {
    console.warn('[Neon Nexus] VITE_REVENUECAT_IOS_KEY missing — IAP will use demo store on iOS.');
  }
}

export function destroyGame() {
  if (!game) return;
  detachGameKeyboard();
  try {
    const intent = window.__neonPlayIntent ?? peekPlayIntent();
    const forceNew = intent?.extra?.forceNew === true || peekForceNew();
    if (forceNew) {
      RunPersistence.clearRun();
    } else {
      const gs = game.scene?.getScene(SCENES.GAME);
      if (gs?.scene?.isActive?.() && !gs.over) RunPersistence.saveRun(gs);
    }
  } catch { /* ignore */ }
  try {
    game.destroy(true);
  } catch { /* ignore */ }
  game = null;
  window.__NEON = null;
}

export function bootPlayGame() {
  if (game) return game;
  try {
    runMigrations();
  } catch (e) {
    console.warn('[Neon Nexus] save migration skipped', e);
  }
  warnProductionConfig();
  audio.preloadMusicCatalog();

  if (!window.__neonPlayIntent) {
    window.__neonPlayIntent = peekPlayIntent();
  }

  GAME.USE_DOM_HUD = typeof document !== 'undefined'
    && !!document.querySelector('.play-stage--hud');

  syncViewportLayout();
  setBootSplash({ progress: 18, label: 'Initializing bullet-time…' });
  game = new Phaser.Game(buildPhaserConfig());
  window.__NEON = game;
  window.__NEON_FLAGS = { iapEnabled: isIapEnabled() };

  game.events.once(Phaser.Core.Events.READY, () => {
    bootSettledAt = Date.now();
    setBootSplash({ progress: 26, label: 'Forging bricks & Jardinains…' });
    requestAnimationFrame(() => {
      syncPlayFrameLayout(game);
      scheduleViewportChange();
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('neon:game-ready', { detail: { game } }));
    }

    attachRuntimeGuards(game);
    InputRouter.attach(game);
    attachNavigation(game);
    wireLegalShellNavigation({
      pushOverlay: pushOverlayHistory,
      popOverlay: popOverlayHistory,
      markSkip: markHistorySyncSkipped,
    });
    attachLegalShell(game);
    attachPopstateListener(game);
    attachEscapeListener(game);
    attachGameKeyboard(game);
    attachAppLifecycle(game);
    window.__neonGoBack = () => goBack(game);
    RunPersistence.attachAutoSave(game);

    const adProvider = createAdProvider(game);
    Monetization.register({
      ...adProvider,
      init: async () => {
        Monetization.applyConfig();
        Monetization.removeAds = SaveManager.getRemoveAds();
        try {
          await adProvider.init?.();
          await initNativeBridge(game);
          await Monetization.syncStoreEntitlements();
          await syncPendingEntitlements();
        } catch (e) {
          console.warn('[Monetization] init skipped', e);
        }
      },
    }, game);

  });

  attachViewportListeners();
  return game;
}

export default bootPlayGame;
