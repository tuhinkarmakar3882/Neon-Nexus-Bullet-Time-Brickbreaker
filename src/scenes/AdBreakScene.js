import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { makeResponsiveOverlayPanel, makeButton } from '../utils/UI.js';
import { InputRouter } from '../systems/InputRouter.js';
import { fitTextWidth, orbitronStyle, uiPx } from '../utils/Typography.js';

/** Mock interstitial — Close enabled after 2s; user must tap Continue (no auto-skip). */
export class AdBreakScene extends Phaser.Scene {
  constructor() { super(SCENES.AD_BREAK); }

  init(data) {
    this._provider = data?.provider ?? 'demo';
    this._placement = data?.placement ?? '';
  }

  create() {
    InputRouter.onOverlayOpen(SCENES.AD_BREAK);
    this.input.setTopOnly(true);
    const panel = makeResponsiveOverlayPanel(this, { dimAlpha: 0.92, heightRatio: 0.55, maxCardW: 520 });
    const isReward = this._provider === 'reward';
    const isDemo = this._provider === 'demo' || isReward;
    const barW = Math.min(GAME.WIDTH * 0.72, panel.cardW * 0.82);

    const title = this.add.text(panel.cx, panel.cy - uiPx(48, { min: 36, max: 52 }), isReward ? 'REWARDED' : 'AD BREAK', {
      ...orbitronStyle(36, cssHex(PAL.textMuted), { fontStyle: '900', align: 'center' }),
    }).setOrigin(0.5).setDepth(1001);
    fitTextWidth(title, panel.cardW * 0.9, uiPx(22, { min: 18, max: 28 }));

    const body = this.add.text(panel.cx, panel.cy - uiPx(4, { min: 0, max: 8 }), isReward
      ? 'Watch to claim your reward\n(simulated on web demo)'
      : isDemo
        ? 'Support the garden\n(demo simulated ad)'
        : 'Thanks for supporting\nNeon Nexus', {
      ...orbitronStyle(16, PAL.text, { align: 'center', wordWrap: { width: panel.cardW * 0.85 } }),
    }).setOrigin(0.5).setDepth(1001);
    fitTextWidth(body, panel.cardW * 0.85, uiPx(12, { min: 11, max: 14 }));

    this.bar = this.add.graphics().setDepth(1002);
    this._barW = barW;
    this._progress = 0;
    const barY = panel.cy + uiPx(40, { min: 32, max: 48 });

    this.time.addEvent({
      delay: 40,
      repeat: 49,
      callback: () => {
        this._progress = Math.min(1, this._progress + 0.02);
        this.bar.clear();
        this.bar.fillStyle(0x222c4a, 0.9);
        this.bar.fillRoundedRect(panel.cx - this._barW / 2, barY, this._barW, uiPx(10, { min: 8, max: 12 }), 6);
        this.bar.fillStyle(PAL.accent, 0.95);
        this.bar.fillRoundedRect(panel.cx - this._barW / 2, barY, this._barW * this._progress, uiPx(10, { min: 8, max: 12 }), 6);
      },
    });

    const btnW = uiPx(160, { min: 140, max: 180 });
    const btnH = uiPx(44, { min: 40, max: 48 });
    this.closeBtn = makeButton(this, panel.cx, panel.cy + uiPx(88, { min: 72, max: 96 }), 'CLOSE', () => this.finish(), {
      width: btnW,
      height: btnH,
      fontSize: '14px',
      primary: true,
    });
    this.closeBtn.setAlpha(0.35).disableInteractive();

    this.time.delayedCall(2000, () => {
      if (!this.closeBtn?.active) return;
      this.closeBtn.setAlpha(1);
      this.closeBtn.setInteractive({ useHandCursor: true });
    });
  }

  finish() {
    if (this._finished) return;
    this._finished = true;
    InputRouter.onOverlayClose(SCENES.AD_BREAK);
    this.scene.stop();
    if (this._provider === 'reward') {
      this.game.events.emit('ad:reward:done', { placement: this._placement });
    } else {
      this.game.events.emit('ad:break:done');
    }
  }

  handleBack() {
    if (this.closeBtn?.alpha >= 1) {
      this.finish();
      return true;
    }
    return false;
  }
}
