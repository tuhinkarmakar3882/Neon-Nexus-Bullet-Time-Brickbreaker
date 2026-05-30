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
    this.add.rectangle(W / 2, H / 2, W, H, 0x05060a, 0.88);
    this.add.text(W / 2, H * 0.14, 'SETTINGS', {
      fontFamily: 'Orbitron, monospace', fontSize: '66px', fontStyle: '900', color: '#00ffc3',
    }).setOrigin(0.5).setShadow(0, 0, '#00ffc3', 20, true, true);

    this.settings = SaveManager.loadSettings();

    const items = [
      ['sound', 'SOUND FX'],
      ['music', 'MUSIC'],
      ['bulletTime', 'BULLET TIME'],
      ['flashText', 'FLASH TEXT'],
      ['particles', 'PARTICLES'],
    ];

    const startY = H * 0.27;
    const stepY = H * 0.1;
    this.toggles = {};
    items.forEach(([key, label], i) => {
      const y = startY + i * stepY;
      this.add.text(W / 2 - 250, y, label, {
        fontFamily: 'Orbitron, monospace', fontSize: '30px', color: '#cfe9ff',
      }).setOrigin(0, 0.5);
      this.toggles[key] = this.makeToggle(W / 2 + 210, y, key);
    });

    neonButton(this, W / 2, H * 0.85, 'SAVE & CLOSE', () => this.close(), { width: 420, height: 80, fontSize: '32px' });
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
      audio.init();
      if (key === 'sound') { audio.setSoundEnabled(this.settings.sound); audio.blip(720); }
      if (key === 'music') { audio.setMusicEnabled(this.settings.music); }
    });
    return c;
  }

  close() {
    SaveManager.saveSettings(this.settings);
    audio.setSoundEnabled(this.settings.sound);
    audio.setMusicEnabled(this.settings.music);
    const gameScene = this.scene.get(SCENES.GAME);
    if (gameScene && gameScene.settings) gameScene.settings = SaveManager.loadSettings();

    this.scene.stop();
    if (this.scene.isSleeping(this.from)) this.scene.wake(this.from);
    else if (this.scene.isPaused(this.from)) this.scene.resume(this.from);
  }
}
