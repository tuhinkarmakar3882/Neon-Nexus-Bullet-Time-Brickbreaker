import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { makeOverlayPanel } from '../utils/UI.js';
import { InputRouter } from '../systems/InputRouter.js';

/** Brief interstitial overlay — used when demo provider simulates ads. Skipped for native Google interstitials. */
export class AdBreakScene extends Phaser.Scene {
  constructor() { super(SCENES.AD_BREAK); }

  init(data) {
    this._provider = data?.provider ?? 'demo';
  }

  create() {
    InputRouter.onOverlayOpen(SCENES.AD_BREAK);
    this.input.setTopOnly(true);
    const panel = makeOverlayPanel(this, { dimAlpha: 0.92 });
    const W = GAME.WIDTH;
    const isDemo = this._provider === 'demo';

    this.add.text(panel.cx, panel.cy - 60, 'AD BREAK', {
      fontFamily: 'Orbitron, monospace', fontSize: '42px', fontStyle: '900', color: cssHex(PAL.textMuted),
    }).setOrigin(0.5).setDepth(1001);

    this.add.text(panel.cx, panel.cy, isDemo
      ? 'Support the garden\n(demo simulated ad)'
      : 'Thanks for supporting\nNeon Nexus', {
      fontFamily: 'Orbitron, monospace', fontSize: '20px', color: PAL.text, align: 'center',
    }).setOrigin(0.5).setDepth(1001);

    this.bar = this.add.graphics().setDepth(1002);
    this._barW = Math.min(W * 0.6, 360);
    this._progress = 0;

    this.time.addEvent({
      delay: 40,
      repeat: 34,
      callback: () => {
        this._progress = Math.min(1, this._progress + 0.03);
        this.bar.clear();
        this.bar.fillStyle(0x222c4a, 0.9);
        this.bar.fillRoundedRect(panel.cx - this._barW / 2, panel.cy + 70, this._barW, 12, 6);
        this.bar.fillStyle(PAL.accent, 0.95);
        this.bar.fillRoundedRect(panel.cx - this._barW / 2, panel.cy + 70, this._barW * this._progress, 12, 6);
      },
    });

    this.time.delayedCall(1500, () => this.finish());
  }

  finish() {
    InputRouter.onOverlayClose();
    this.scene.stop();
    this.game.events.emit('ad:break:done');
  }
}
