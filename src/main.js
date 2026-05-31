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
  syncSceneCameras,
  syncViewportLayout,
} from './systems/LayoutManager.js';
import { attachFullscreenListener, lockMobileViewport } from './systems/Fullscreen.js';

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
      width: GAME.WIDTH,
      height: GAME.HEIGHT,
      parent: 'game-root',
    },
    input: {
      activePointers: 1,
      touch: { capture: true },
    },
    render: {
      antialias: !isMobile,
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

function handleViewportChange() {
  if (!game?.scale) return;
  if (isGameplayLocked(game)) {
    refreshDisplayScale(game);
    return;
  }

  const layoutChanged = syncViewportLayout();

  if (layoutChanged) {
    applyLogicalResize(game);
    refreshDisplayScale(game);
    syncSceneCameras(game);

    // Skip UI scene restart during initial mobile viewport settle (address bar, safe area).
    if (Date.now() - bootSettledAt < 1800) return;

    restartUiScenes();

    const gs = game.scene.getScene(SCENES.GAME);
    if (gs?.scene?.isActive() && gs.relayout) gs.relayout();

    if (game.scene.isActive(SCENES.HUD)) {
      game.scene.stop(SCENES.HUD);
      game.scene.launch(SCENES.HUD);
    }
  } else {
    refreshDisplayScale(game);
    syncSceneCameras(game);
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

function bootGame() {
  lockMobileViewport();
  game = new Phaser.Game(buildPhaserConfig());
  window.__NEON = game;

  game.events.once(Phaser.Core.Events.READY, () => {
    bootSettledAt = Date.now();
    refreshDisplayScale(game);
    scheduleViewportChange();

    InputRouter.attach(game);
    RunPersistence.attachAutoSave(game);
    const adProvider = createAdProvider(game);
    Monetization.register({
      ...adProvider,
      init: async () => {
        Monetization.applyConfig();
        Monetization.removeAds = SaveManager.getRemoveAds();
        try {
          await adProvider.init?.();
          await Monetization.syncStoreEntitlements();
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootGame, { once: true });
} else {
  bootGame();
}

if ('serviceWorker' in navigator && import.meta.env && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

export default game;
