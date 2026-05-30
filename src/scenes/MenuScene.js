import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { Background } from '../objects/Background.js';
import { neonButton, addCameraFx } from '../utils/UI.js';
import { audio } from '../systems/AudioManager.js';
import { SaveManager } from '../systems/SaveManager.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.MENU);
  }

  create() {
    addCameraFx(this, { bloom: 1.1 });
    this.bg = new Background(this, 0x00ffc3);

    const cx = GAME.WIDTH / 2;

    const title = this.add.text(cx, GAME.HEIGHT * 0.22, 'NEON NEXUS', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '92px',
      fontStyle: '900',
      color: '#00ffc3',
      align: 'center',
    }).setOrigin(0.5);
    title.setShadow(0, 0, '#00ffc3', 24, true, true);

    this.add.text(cx, GAME.HEIGHT * 0.30, 'BULLET-TIME BRICK BREAKER', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#ff2bd6',
    }).setOrigin(0.5).setShadow(0, 0, '#ff2bd6', 18, true, true);

    const high = SaveManager.getHighScore();
    this.add.text(cx, GAME.HEIGHT * 0.37, `HIGH SCORE   ${high}`, {
      fontFamily: 'Orbitron, monospace',
      fontSize: '26px',
      color: '#cfe9ff',
    }).setOrigin(0.5).setAlpha(0.85);

    neonButton(this, cx, GAME.HEIGHT * 0.52, 'PLAY', () => this.startGame(), { width: 360, height: 92, fontSize: '40px' });
    neonButton(this, cx, GAME.HEIGHT * 0.62, 'SETTINGS', () => this.openSettings(), {
      width: 360, height: 72, primary: false, color: 0x00ffc3, fontSize: '28px',
    });

    this.add.text(cx, GAME.HEIGHT * 0.74,
      'Move: Mouse / Touch / ←  →\nLaunch: Click / Tap / Space\nPause: P',
      {
        fontFamily: 'Orbitron, monospace',
        fontSize: '22px',
        color: '#9fb4cc',
        align: 'center',
        lineSpacing: 10,
      }).setOrigin(0.5);

    this.add.text(cx, GAME.HEIGHT - 50, 'Made with \u2665 by Tuhin Karmakar', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '20px',
      color: '#5f7088',
    }).setOrigin(0.5);

    // Title breathing animation
    this.tweens.add({ targets: title, scaleX: 1.03, scaleY: 1.03, yoyo: true, repeat: -1, duration: 1800, ease: 'Sine.easeInOut' });

    // First user gesture unlocks audio everywhere.
    this.input.once('pointerdown', () => {
      audio.init();
      audio.resume();
      const s = SaveManager.loadSettings();
      audio.setEnabled(s.sound);
      audio.startMusic();
    });

    this.input.keyboard.on('keydown-ENTER', () => this.startGame());
    this.input.keyboard.on('keydown-SPACE', () => this.startGame());
  }

  startGame() {
    audio.init(); audio.resume();
    const s = SaveManager.loadSettings();
    audio.setEnabled(s.sound);
    audio.startMusic();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENES.GAME);
    });
  }

  openSettings() {
    this.scene.launch(SCENES.SETTINGS, { from: SCENES.MENU });
    this.scene.pause();
  }

  update(time, delta) {
    this.bg.update(delta / 1000);
  }
}
