import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { makeResponsiveOverlayPanel } from '../utils/UI.js';
import { InputRouter } from '../systems/InputRouter.js';
import { fitTextWidth, orbitronStyle, uiPx } from '../utils/Typography.js';

/** Brief interstitial overlay — used when demo provider simulates ads. Skipped for native Google interstitials. */
export class AdBreakScene extends Phaser.Scene {
  constructor() { super(SCENES.AD_BREAK); }

  init(data) {
    this._provider = data?.provider ?? 'demo';
  }

  create() {
    InputRouter.onOverlayOpen(SCENES.AD_BREAK);
    this.input.setTopOnly(true);
    const panel = makeResponsiveOverlayPanel(this, { dimAlpha: 0.92, heightRatio: 0.55, maxCardW: 520 });
    const isDemo = this._provider === 'demo';
    const barW = Math.min(GAME.WIDTH * 0.72, panel.cardW * 0.82);

    const title = this.add.text(panel.cx, panel.cy - uiPx(48, { min: 36, max: 52 }), 'AD BREAK', {
      ...orbitronStyle(36, cssHex(PAL.textMuted), { fontStyle: '900', align: 'center' }),
    }).setOrigin(0.5).setDepth(1001);
    fitTextWidth(title, panel.cardW * 0.9, uiPx(22, { min: 18, max: 28 }));

    const body = this.add.text(panel.cx, panel.cy - uiPx(4, { min: 0, max: 8 }), isDemo
      ? 'Support the garden\n(demo simulated ad)'
      : 'Thanks for supporting\nNeon Nexus', {
      ...orbitronStyle(16, PAL.text, { align: 'center', wordWrap: { width: panel.cardW * 0.85 } }),
    }).setOrigin(0.5).setDepth(1001);
    fitTextWidth(body, panel.cardW * 0.85, uiPx(12, { min: 11, max: 14 }));

    this.bar = this.add.graphics().setDepth(1002);
    this._barW = barW;
    this._progress = 0;
    const barY = panel.cy + uiPx(56, { min: 44, max: 64 });

    this.time.addEvent({
      delay: 40,
      repeat: 34,
      callback: () => {
        this._progress = Math.min(1, this._progress + 0.03);
        this.bar.clear();
        this.bar.fillStyle(0x222c4a, 0.9);
        this.bar.fillRoundedRect(panel.cx - this._barW / 2, barY, this._barW, uiPx(10, { min: 8, max: 12 }), 6);
        this.bar.fillStyle(PAL.accent, 0.95);
        this.bar.fillRoundedRect(panel.cx - this._barW / 2, barY, this._barW * this._progress, uiPx(10, { min: 8, max: 12 }), 6);
      },
    });

    this.time.delayedCall(1500, () => this.finish());
  }

  finish() {
    if (this._finished) return;
    this._finished = true;
    InputRouter.onOverlayClose(SCENES.AD_BREAK);
    this.scene.stop();
    this.game.events.emit('ad:break:done');
  }

  handleBack() {
    this.finish();
    return true;
  }
}
