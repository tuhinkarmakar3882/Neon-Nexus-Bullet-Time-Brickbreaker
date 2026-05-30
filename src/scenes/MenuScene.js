import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { Background } from '../objects/Background.js';
import { neonButton, addCameraFx } from '../utils/UI.js';
import { audio } from '../systems/AudioManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { clamp } from '../utils/Helpers.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super(SCENES.MENU); }

  create() {
    const W = GAME.WIDTH, H = GAME.HEIGHT;
    addCameraFx(this, { bloom: 0.8 });
    this.bg = new Background(this, PAL.accent);
    const cx = W / 2;
    const titleSize = clamp(Math.round(W * 0.094), 54, 124);

    const title = this.add.text(cx, H * 0.2, 'NEON NEXUS', {
      fontFamily: 'Orbitron, monospace', fontSize: titleSize + 'px', fontStyle: '900', color: cssHex(PAL.accent), align: 'center',
    }).setOrigin(0.5);
    title.setShadow(0, 0, cssHex(PAL.accent), 22, true, true);

    this.add.text(cx, H * 0.275, 'A R K A N O I D   R E F O R G E D', {
      fontFamily: 'Orbitron, monospace', fontSize: clamp(Math.round(W * 0.03), 18, 36) + 'px', fontStyle: 'bold', color: cssHex(PAL.accent2),
    }).setOrigin(0.5).setShadow(0, 0, cssHex(PAL.accent2), 14, true, true);

    this.add.text(cx, H * 0.335, `HIGH SCORE   ${SaveManager.getHighScore()}`, {
      fontFamily: 'Orbitron, monospace', fontSize: '24px', color: PAL.text,
    }).setOrigin(0.5).setAlpha(0.8);

    neonButton(this, cx, H * 0.49, 'PLAY', () => this.startGame(), { width: 360, height: 92, fontSize: '40px', color: PAL.accent });
    neonButton(this, cx, H * 0.59, 'SETTINGS', () => this.openSettings(), { width: 360, height: 68, primary: false, color: PAL.accent, fontSize: '26px' });

    this.add.text(cx, H * 0.71,
      'Smash the bricks. Catch the capsules.\nKnock the Jardinains off their perch\nbefore they pot your ship.',
      { fontFamily: 'Orbitron, monospace', fontSize: '21px', color: PAL.textMuted, align: 'center', lineSpacing: 9 }).setOrigin(0.5);

    this.add.text(cx, H * 0.81, 'Move: Mouse / Touch / \u2190 \u2192     Launch: Click / Tap / Space', {
      fontFamily: 'Orbitron, monospace', fontSize: '18px', color: PAL.textMuted,
    }).setOrigin(0.5).setAlpha(0.8);

    this.add.text(cx, H - 44, 'Made with \u2665 by Tuhin Karmakar', {
      fontFamily: 'Orbitron, monospace', fontSize: '18px', color: '#5f7088',
    }).setOrigin(0.5);

    this.tweens.add({ targets: title, scaleX: 1.025, scaleY: 1.025, yoyo: true, repeat: -1, duration: 2000, ease: 'Sine.easeInOut' });

    this.input.once('pointerdown', () => this.unlockAudio());
    this.input.keyboard.on('keydown-ENTER', () => this.startGame());
    this.input.keyboard.on('keydown-SPACE', () => this.startGame());
  }

  unlockAudio() {
    audio.init(); audio.resume();
    const s = SaveManager.loadSettings();
    audio.setSoundEnabled(s.sound); audio.setMusicEnabled(s.music); audio.startMusic();
  }

  startGame() {
    this.unlockAudio();
    this.cameras.main.fadeOut(280, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => { this.scene.start(SCENES.GAME); this.scene.stop(); });
  }

  openSettings() {
    this.scene.launch(SCENES.SETTINGS, { from: SCENES.MENU });
    this.scene.pause();
  }

  update(time, delta) { this.bg.update(delta / 1000); }
}
