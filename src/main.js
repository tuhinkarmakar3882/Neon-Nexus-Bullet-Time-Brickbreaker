import Phaser from 'phaser';
import { GAME, computeLayout } from './config/Constants.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { HUDScene } from './scenes/HUDScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { LevelCompleteScene } from './scenes/LevelCompleteScene.js';

// Size the design canvas to the device aspect ratio so the game FILLS the
// screen (landscape on desktop, portrait on phones) instead of letterboxing.
computeLayout(window.innerWidth, window.innerHeight);

const config = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#05060a',
  width: GAME.WIDTH,
  height: GAME.HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    roundPixels: false,
    powerPreference: 'high-performance',
  },
  fps: { target: 60, min: 30 },
  scene: [
    BootScene, PreloadScene, MenuScene, GameScene, HUDScene,
    PauseScene, SettingsScene, GameOverScene, LevelCompleteScene,
  ],
};

const game = new Phaser.Game(config);

game.events.once(Phaser.Core.Events.READY, () => {
  const splash = document.getElementById('boot-splash');
  if (splash) {
    setTimeout(() => splash.classList.add('hide'), 350);
    setTimeout(() => splash.remove(), 1100);
  }
});

// On a significant aspect-ratio change (e.g. device rotation), re-derive the
// layout. A reload is the simplest, glitch-free way to re-tune every entity.
let initialAspect = window.innerWidth / window.innerHeight;
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const a = window.innerWidth / window.innerHeight;
    if (Math.abs(a - initialAspect) / initialAspect > 0.25) {
      initialAspect = a;
      window.location.reload();
    }
  }, 450);
});

// PWA: register the offline service worker (production only).
if ('serviceWorker' in navigator && import.meta.env && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

window.__NEON = game;
export default game;
