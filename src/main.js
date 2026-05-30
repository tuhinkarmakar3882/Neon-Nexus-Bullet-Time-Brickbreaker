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
    powerPreference: 'high-performance',
  },
  fps: {
    target: 60,
    min: 30,
  },
  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    GameScene,
    HUDScene,
    PauseScene,
    SettingsScene,
    GameOverScene,
    LevelCompleteScene,
  ],
};

const game = new Phaser.Game(config);

// Remove the HTML boot splash once Phaser is up and the Menu is ready.
game.events.once(Phaser.Core.Events.READY, () => {
  const splash = document.getElementById('boot-splash');
  if (splash) {
    setTimeout(() => splash.classList.add('hide'), 350);
    setTimeout(() => splash.remove(), 1100);
  }
});

// PWA: register the offline service worker (production only).
if ('serviceWorker' in navigator && import.meta.env && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

window.__NEON = game;
export default game;
