import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { Background } from '../objects/Background.js';
import { neonButton, addCameraFx } from '../utils/UI.js';
import { audio } from '../systems/AudioManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { clamp } from '../utils/Helpers.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.MENU);
  }

  create() {
    const W = GAME.WIDTH, H = GAME.HEIGHT;
    addCameraFx(this, { bloom: 1.15 });
    this.bg = new Background(this, 0x00ffc3);
    const cx = W / 2;
    const titleSize = clamp(Math.round(W * 0.1), 56, 128);

    const title = this.add.text(cx, H * 0.22, 'NEON NEXUS', {
      fontFamily: 'Orbitron, monospace', fontSize: titleSize + 'px', fontStyle: '900', color: '#00ffc3', align: 'center',
    }).setOrigin(0.5);
    title.setShadow(0, 0, '#00ffc3', 26, true, true);

    this.add.text(cx, H * 0.30, 'BULLET-TIME BRICK BREAKER', {
      fontFamily: 'Orbitron, monospace', fontSize: clamp(Math.round(W * 0.035), 22, 44) + 'px', fontStyle: 'bold', color: '#ff2bd6',
    }).setOrigin(0.5).setShadow(0, 0, '#ff2bd6', 18, true, true);

    this.add.text(cx, H * 0.37, `HIGH SCORE   ${SaveManager.getHighScore()}`, {
      fontFamily: 'Orbitron, monospace', fontSize: '26px', color: '#cfe9ff',
    }).setOrigin(0.5).setAlpha(0.85);

    neonButton(this, cx, H * 0.52, 'PLAY', () => this.startGame(), { width: 360, height: 92, fontSize: '40px' });
    neonButton(this, cx, H * 0.62, 'SETTINGS', () => this.openSettings(), {
      width: 360, height: 70, primary: false, color: 0x00ffc3, fontSize: '28px',
    });

    this.add.text(cx, H * 0.74, 'Move: Mouse / Touch / \u2190  \u2192\nLaunch: Click / Tap / Space\nPause: P', {
      fontFamily: 'Orbitron, monospace', fontSize: '22px', color: '#9fb4cc', align: 'center', lineSpacing: 10,
    }).setOrigin(0.5);

    this.add.text(cx, H - 46, 'Made with \u2665 by Tuhin Karmakar', {
      fontFamily: 'Orbitron, monospace', fontSize: '20px', color: '#5f7088',
    }).setOrigin(0.5);

    this.tweens.add({ targets: title, scaleX: 1.03, scaleY: 1.03, yoyo: true, repeat: -1, duration: 1800, ease: 'Sine.easeInOut' });

    this.input.once('pointerdown', () => this.unlockAudio());
    this.input.keyboard.on('keydown-ENTER', () => this.startGame());
    this.input.keyboard.on('keydown-SPACE', () => this.startGame());
  }

  unlockAudio() {
    audio.init();
    audio.resume();
    const s = SaveManager.loadSettings();
    audio.setSoundEnabled(s.sound);
    audio.setMusicEnabled(s.music);
    audio.startMusic();
  }

  startGame() {
    this.unlockAudio();
    this.cameras.main.fadeOut(280, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENES.GAME);
      this.scene.stop();
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
