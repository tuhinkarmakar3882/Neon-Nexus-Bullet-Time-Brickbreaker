import Phaser from 'phaser';
import { GAME, SCENES } from './config/Constants.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { HUDScene } from './scenes/HUDScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { LevelCompleteScene } from './scenes/LevelCompleteScene.js';
import { CodexScene } from './scenes/CodexScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { AdBreakScene } from './scenes/AdBreakScene.js';
import { PurchaseScene } from './scenes/PurchaseScene.js';
import { InputRouter } from './systems/InputRouter.js';
import { RunPersistence } from './systems/RunPersistence.js';
import { Monetization } from './systems/Monetization.js';
import { createAdProvider } from './systems/createAdProvider.js';
import { SaveManager } from './systems/SaveManager.js';
import {
  applyLogicalResize,
  isGameplayLocked,
  refreshDisplayScale,
  syncViewportLayout,
} from './systems/LayoutManager.js';
import { attachFullscreenListener, lockMobileViewport } from './systems/Fullscreen.js';
import { initNativeBridge } from './systems/NativeBridge.js';
import { runMigrations } from './systems/SaveMigration.js';
import { attachEscapeListener, attachNavigation, attachPopstateListener, goBack } from './systems/Navigation.js';
import { audio } from './systems/AudioManager.js';
import { syncPendingEntitlements } from './systems/WebUnlock.js';
import { initInstallPrompt } from './systems/InstallPrompt.js';
import { launchParallelScene } from './systems/SceneLaunch.js';
import { Capacitor } from '@capacitor/core';

const isMobile = typeof navigator !== 'undefined'
  && /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);

let game = null;
let bootSettledAt = 0;

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
      powerPreference: isMobile ? 'default' : 'high-performance',
      batchSize: isMobile ? 2048 : 4096,
    },
    fps: { target: 60, min: 30 },
    scene: [
      BootScene, PreloadScene, MenuScene, GameScene, HUDScene,
      PauseScene, SettingsScene, GameOverScene, LevelCompleteScene, CodexScene, ShopScene, AdBreakScene, PurchaseScene,
    ],
  };
}

function restartUiScenes() {
  const settings = game.scene.getScene(SCENES.SETTINGS);
  if (settings?.scene?.isActive()) {
    settings.scene.restart({ from: settings.from ?? SCENES.MENU });
    return;
  }

  const restartKeys = [
    SCENES.MENU,
    SCENES.PAUSE,
    SCENES.GAMEOVER,
    SCENES.LEVEL_COMPLETE,
    SCENES.CODEX,
    SCENES.SHOP,
  ];
  for (const key of restartKeys) {
    const s = game.scene.getScene(key);
    if (s?.scene?.isActive()) s.scene.restart();
  }
}

function isMenuLaunching(game) {
  const menu = game?.scene?.getScene(SCENES.MENU);
  return !!menu?._launchingGame;
}

function handleViewportChange() {
  if (!game?.scale) return;
  if (isGameplayLocked(game)) {
    refreshDisplayScale(game);
    return;
  }

  const layoutChanged = syncViewportLayout();

  if (layoutChanged) {
    applyLogicalResize(game);

    // Skip UI scene restart during initial mobile viewport settle (address bar, safe area).
    if (Date.now() - bootSettledAt < 1800) return;

    // Fullscreen / URL-bar collapse must not restart the menu mid fade-to-game.
    if (isMenuLaunching(game)) {
      refreshDisplayScale(game);
      return;
    }

    restartUiScenes();

    const gs = game.scene.getScene(SCENES.GAME);
    if (gs?.scene?.isActive() && gs.relayout) gs.relayout();

    if (game.scene.isActive(SCENES.HUD)) {
      game.scene.stop(SCENES.HUD);
      launchParallelScene(game, SCENES.HUD);
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
  if (!import.meta.env?.PROD) return;
  const adMode = (import.meta.env.VITE_AD_PROVIDER || 'demo').toLowerCase();
  if (adMode === 'demo') {
    console.warn('[Neon Nexus] VITE_AD_PROVIDER=demo in production — set to google for ad-supported release.');
  }
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android' && !import.meta.env.VITE_REVENUECAT_ANDROID_KEY) {
    console.warn('[Neon Nexus] VITE_REVENUECAT_ANDROID_KEY missing — IAP will use demo store on Android.');
  }
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' && !import.meta.env.VITE_REVENUECAT_IOS_KEY) {
    console.warn('[Neon Nexus] VITE_REVENUECAT_IOS_KEY missing — IAP will use demo store on iOS.');
  }
}

function bootGame() {
  runMigrations();
  lockMobileViewport();
  warnProductionConfig();
  audio.preloadMusicCatalog();
  game = new Phaser.Game(buildPhaserConfig());
  window.__NEON = game;

  game.events.once(Phaser.Core.Events.READY, () => {
    bootSettledAt = Date.now();
    refreshDisplayScale(game);
    scheduleViewportChange();

    InputRouter.attach(game);
    attachNavigation(game);
    attachPopstateListener(game);
    attachEscapeListener(game);
    if (typeof window !== 'undefined') {
      window.__neonGoBack = () => goBack(game);
    }
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

    const splash = document.getElementById('boot-splash');
    if (splash) {
      setTimeout(() => splash.classList.add('hide'), 350);
      setTimeout(() => splash.remove(), 1100);
    }
  });
}

attachViewportListeners();
initInstallPrompt();

/** PWA: register Workbox SW and reload when a new build is deployed. */
function registerPwaServiceWorker() {
  if (!import.meta.env.PROD || typeof window === 'undefined' || Capacitor.isNativePlatform()) return;
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('./sw.js', { scope: './' }).then((registration) => {
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          window.location.reload();
        }
      });
    });
    setInterval(() => registration.update(), 60 * 60 * 1000);
  }).catch((err) => {
    console.warn('[PWA] service worker registration failed', err);
  });
}

registerPwaServiceWorker();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootGame, { once: true });
} else {
  bootGame();
}

export default game;
