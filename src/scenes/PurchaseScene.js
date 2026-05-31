import Phaser from 'phaser';
import { SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { Monetization } from '../systems/Monetization.js';
import { makeButton, makeResponsiveOverlayPanel, overlayFrame } from '../utils/UI.js';
import { InputRouter } from '../systems/InputRouter.js';
import { fitTextWidth, orbitronStyle, uiPx } from '../utils/Typography.js';

/** Store checkout sheet — demo simulates payment; native uses window.__nativePurchase hooks. */
export class PurchaseScene extends Phaser.Scene {
  constructor() { super(SCENES.PURCHASE); }

  init(data) {
    this.productId = data?.productId ?? 'remove_ads';
    this._from = data?.from ?? null;
  }

  create() {
    InputRouter.onOverlayOpen(SCENES.PURCHASE);
    this.input.setTopOnly(true);
    const UI_DEPTH = 1200;

    const product = Monetization.getProduct(this.productId);
    const panel = makeResponsiveOverlayPanel(this, { dimAlpha: 0.94, heightRatio: 0.62, maxCardW: 520, depth: UI_DEPTH });
    const frame = overlayFrame(panel, { footerReserve: uiPx(72, { min: 60, max: 76 }) });
    const wrap = frame.wrap;

    const title = this.add.text(frame.cx, frame.titleY, (product?.title ?? 'PURCHASE').toUpperCase(), {
      ...orbitronStyle(32, cssHex(PAL.accent), { fontStyle: '900', align: 'center' }),
    }).setOrigin(0.5, 0).setDepth(UI_DEPTH + 1).setShadow(0, 0, cssHex(PAL.accent), 14, true, true);
    fitTextWidth(title, wrap, uiPx(22, { min: 18, max: 28 }));

    const price = this.add.text(frame.cx, frame.contentTop + uiPx(8, { min: 4, max: 10 }), product?.price ?? '', {
      ...orbitronStyle(28, cssHex(PAL.accent2), { fontStyle: 'bold', align: 'center' }),
    }).setOrigin(0.5, 0).setDepth(UI_DEPTH + 1);

    const blurb = this.add.text(frame.cx, price.y + uiPx(40, { min: 32, max: 44 }), product?.blurb ?? '', {
      ...orbitronStyle(15, PAL.text, { align: 'center', wordWrap: { width: wrap } }),
    }).setOrigin(0.5, 0).setDepth(UI_DEPTH + 1);
    fitTextWidth(blurb, wrap, uiPx(12, { min: 11, max: 14 }));

    const hint = Monetization.isSimulatedStore()
      ? 'Demo checkout — confirm to simulate payment.'
      : 'Payment is handled by your app store.';
    this.add.text(frame.cx, blurb.y + blurb.height + uiPx(20, { min: 16, max: 24 }), hint, {
      ...orbitronStyle(11, PAL.textMuted, { align: 'center', wordWrap: { width: wrap } }),
    }).setOrigin(0.5, 0).setDepth(UI_DEPTH + 1);

    const btnW = Math.min(frame.btnW, uiPx(280, { max: 300 }));

    makeButton(this, frame.cx, frame.footerY - uiPx(58, { min: 48, max: 62 }), 'CONFIRM PURCHASE', async () => {
      await this.finish({ success: true, productId: this.productId, simulated: Monetization.isSimulatedStore() });
    }, {
      width: btnW,
      height: uiPx(50, { min: 44, max: 54 }),
      fontSize: '16px',
      depth: UI_DEPTH + 2,
    });

    makeButton(this, frame.cx, frame.footerY, 'CANCEL', () => {
      this.finish({ success: false, cancelled: true, productId: this.productId });
    }, {
      width: btnW,
      height: uiPx(46, { min: 40, max: 50 }),
      fontSize: '15px',
      primary: false,
      depth: UI_DEPTH + 2,
    });
  }

  async finish(result) {
    InputRouter.onOverlayClose(false);
    const from = this._from;
    this.scene.stop();
    if (from && this.scene.isPaused(from)) this.scene.resume(from);
    this.game.events.emit('purchase:done', result);
  }
}
