import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';

export class LevelCompleteScene extends Phaser.Scene {
  constructor() {
    super(SCENES.LEVEL_COMPLETE);
  }

  init(data) {
    this.data2 = data || {};
  }

  create() {
    const W = GAME.WIDTH, H = GAME.HEIGHT;
    const d = this.data2;
    this.add.rectangle(W / 2, H / 2, W, H, 0x05060a, 0.7);

    const title = this.add.text(W / 2, H * 0.38, `LEVEL ${d.level ?? 1}\nCLEARED`, {
      fontFamily: 'Orbitron, monospace', fontSize: '76px', fontStyle: '900', color: '#00ffc3', align: 'center',
    }).setOrigin(0.5).setShadow(0, 0, '#00ffc3', 24, true, true).setScale(0.5).setAlpha(0);

    this.add.text(W / 2, H * 0.55, d.message || '', {
      fontFamily: 'Orbitron, monospace', fontSize: '28px', color: '#cfe9ff', align: 'center',
      wordWrap: { width: W * 0.82 },
    }).setOrigin(0.5);

    const hint = this.add.text(W / 2, H * 0.7, 'tap to continue', {
      fontFamily: 'Orbitron, monospace', fontSize: '22px', color: '#9fb4cc',
    }).setOrigin(0.5).setAlpha(0.7);
    this.tweens.add({ targets: hint, alpha: 0.2, yoyo: true, repeat: -1, duration: 700 });

    // Celebratory burst
    this.add.particles(W / 2, H * 0.38, 'soft', {
      speed: { min: 200, max: 520 }, scale: { start: 0.8, end: 0 }, lifespan: 900,
      blendMode: 'ADD', quantity: 40, emitting: false,
      tint: [0x00ffc3, 0xff2bd6, 0xffd23d, 0x00b3ff],
    }).explode(60);

    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 400, ease: 'Back.easeOut' });

    let advanced = false;
    const advance = () => {
      if (advanced) return;
      advanced = true;
      const game = this.scene.get(SCENES.GAME);
      this.scene.stop();
      game.startNextLevel();
    };

    this.time.delayedCall(2600, advance);
    this.input.once('pointerdown', advance);
    this.input.keyboard.once('keydown-SPACE', advance);
  }
}
