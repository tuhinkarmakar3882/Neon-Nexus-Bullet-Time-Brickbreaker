import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { neonButton } from '../utils/UI.js';
import { SaveManager } from '../systems/SaveManager.js';
import { audio } from '../systems/AudioManager.js';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super(SCENES.SETTINGS);
  }

  init(data) {
    this.from = data?.from ?? SCENES.MENU;
  }

  create() {
    const W = GAME.WIDTH, H = GAME.HEIGHT;
    this.add.rectangle(W / 2, H / 2, W, H, 0x05060a, 0.85);
    this.add.text(W / 2, H * 0.18, 'SETTINGS', {
      fontFamily: 'Orbitron, monospace', fontSize: '70px', fontStyle: '900', color: '#00ffc3',
    }).setOrigin(0.5).setShadow(0, 0, '#00ffc3', 20, true, true);

    this.settings = SaveManager.loadSettings();

    const items = [
      ['sound', 'SOUND'],
      ['bulletTime', 'BULLET TIME'],
      ['flashText', 'FLASH TEXT'],
      ['particles', 'PARTICLES'],
    ];

    this.toggles = {};
    items.forEach(([key, label], i) => {
      const y = H * 0.34 + i * 110;
      this.add.text(W / 2 - 240, y, label, {
        fontFamily: 'Orbitron, monospace', fontSize: '32px', color: '#cfe9ff',
      }).setOrigin(0, 0.5);
      this.toggles[key] = this.makeToggle(W / 2 + 200, y, key);
    });

    neonButton(this, W / 2, H * 0.82, 'SAVE & CLOSE', () => this.close(), { width: 420, height: 84, fontSize: '32px' });
  }

  makeToggle(x, y, key) {
    const c = this.add.container(x, y);
    const draw = () => {
      c.removeAll(true);
      const on = this.settings[key];
      const g = this.add.graphics();
      g.fillStyle(on ? 0x00ffc3 : 0x333a44, 1);
      g.fillRoundedRect(-56, -26, 112, 52, 26);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(on ? 30 : -30, 0, 20);
      c.add(g);
    };
    draw();
    c.setSize(112, 52);
    c.setInteractive(new Phaser.Geom.Rectangle(-56, -26, 112, 52), Phaser.Geom.Rectangle.Contains);
    c.on('pointerup', () => {
      this.settings[key] = !this.settings[key];
      draw();
      if (key === 'sound') { audio.init(); audio.setEnabled(this.settings.sound); audio.blip(660, 0.05); }
    });
    return c;
  }

  close() {
    SaveManager.saveSettings(this.settings);
    audio.setEnabled(this.settings.sound);
    // live-apply to running game
    const gameScene = this.scene.get(SCENES.GAME);
    if (gameScene && gameScene.settings) gameScene.settings = SaveManager.loadSettings();

    this.scene.stop();
    if (this.scene.isPaused(this.from) || this.scene.isSleeping(this.from)) {
      this.scene.wake(this.from);
    } else {
      this.scene.resume(this.from);
    }
  }
}
