import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { PAL } from '../config/Palette.js';

export class LevelCompleteScene extends Phaser.Scene {
  constructor() { super(SCENES.LEVEL_COMPLETE); }
  init(data) { this.d = data || {}; }

  create() {
    const W = GAME.WIDTH, H = GAME.HEIGHT, d = this.d;
    this.add.rectangle(W / 2, H / 2, W, H, 0x05060c, 0.72);

    const title = this.add.text(W / 2, H * 0.32, `LEVEL ${d.level ?? 1}\nCLEARED`, {
      fontFamily: 'Orbitron, monospace', fontSize: '72px', fontStyle: '900', color: '#2fe6c7', align: 'center',
    }).setOrigin(0.5).setShadow(0, 0, '#2fe6c7', 24, true, true).setScale(0.5).setAlpha(0);

    this.add.text(W / 2, H * 0.47, d.message || '', {
      fontFamily: 'Orbitron, monospace', fontSize: '26px', color: PAL.text, align: 'center', wordWrap: { width: W * 0.82 },
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.56, `CLEAR BONUS  +${d.bonus ?? 0}`, {
      fontFamily: 'Orbitron, monospace', fontSize: '30px', fontStyle: 'bold', color: '#ffd23d',
    }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.62, `SCORE  ${d.score ?? 0}`, {
      fontFamily: 'Orbitron, monospace', fontSize: '26px', color: PAL.textMuted,
    }).setOrigin(0.5);

    const hint = this.add.text(W / 2, H * 0.72, 'tap to continue', { fontFamily: 'Orbitron, monospace', fontSize: '22px', color: PAL.textMuted }).setOrigin(0.5).setAlpha(0.7);
    this.tweens.add({ targets: hint, alpha: 0.2, yoyo: true, repeat: -1, duration: 700 });

    this.add.particles(W / 2, H * 0.32, 'soft', {
      speed: { min: 220, max: 560 }, scale: { start: 0.8, end: 0 }, lifespan: 950, blendMode: 'ADD', quantity: 40, emitting: false,
      tint: [0x2fe6c7, 0xff4fa3, 0xffd23d, 0x5aa0ff],
    }).explode(64);

    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 420, ease: 'Back.easeOut' });

    let advanced = false;
    const advance = () => {
      if (advanced) return; advanced = true;
      const game = this.scene.get(SCENES.GAME);
      this.scene.stop();
      game.startNextLevel();
    };
    this.time.delayedCall(2600, advance);
    this.input.once('pointerdown', advance);
    this.input.keyboard.once('keydown-SPACE', advance);
  }
}
