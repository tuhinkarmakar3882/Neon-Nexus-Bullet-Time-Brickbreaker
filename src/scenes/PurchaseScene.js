import Phaser from 'phaser';
import { SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { Capacitor } from '@capacitor/core';
import { isIapEnabled } from '../config/AdsConfig.js';
import { Monetization } from '../systems/Monetization.js';
import { InputRouter } from '../systems/InputRouter.js';
import { makeButton, makeResponsiveOverlayPanel, overlayFrame } from '../utils/UI.js';
import { fitTextWidth, orbitronStyle, uiPx } from '../utils/Typography.js';
import { LEGAL_PURCHASE_NOTICE } from '../utils/LegalLinks.js';

/** Modal checkout sheet — launched on top of Shop/Settings by the ad provider. */
export class PurchaseScene extends Phaser.Scene {
  constructor() { super(SCENES.PURCHASE); }

  init(data) {
    this.productId = data?.productId ?? 'remove_ads';
    this._from = data?.from ?? null;
    this._purchasing = false;
    this._status = null;
  }

  create() {
    InputRouter.onOverlayOpen(SCENES.PURCHASE);
    if (!isIapEnabled()) {
      this.time.delayedCall(0, () => {
        if (this.scene?.isActive?.()) this.closePurchase({ success: false, cancelled: true, productId: this.productId });
      });
      return;
    }
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

    const webStripe = !Capacitor.isNativePlatform() && !!import.meta.env.VITE_STRIPE_CHECKOUT_URL;
    const hint = Monetization.isSimulatedStore()
      ? 'Demo checkout — confirm to simulate payment.'
      : webStripe
        ? 'Checkout opens in your browser. Return here and use Restore or redeem your unlock code.'
        : 'Payment is handled by your app store.';
    this._status = this.add.text(frame.cx, blurb.y + blurb.height + uiPx(20, { min: 16, max: 24 }), hint, {
      ...orbitronStyle(11, PAL.textMuted, { align: 'center', wordWrap: { width: wrap } }),
    }).setOrigin(0.5, 0).setDepth(UI_DEPTH + 1);

    this.add.text(frame.cx, this._status.y + this._status.height + uiPx(12, { min: 10, max: 14 }), LEGAL_PURCHASE_NOTICE, {
      ...orbitronStyle(9, PAL.textMuted, { align: 'center', wordWrap: { width: wrap } }),
    }).setOrigin(0.5, 0).setDepth(UI_DEPTH + 1).setAlpha(0.85);

    const btnW = Math.min(frame.btnW, uiPx(280, { max: 300 }));

    makeButton(this, frame.cx, frame.footerY - uiPx(58, { min: 48, max: 62 }), 'CONFIRM PURCHASE', () => {
      this.confirmPurchase();
    }, {
      width: btnW,
      height: uiPx(50, { min: 44, max: 54 }),
      fontSize: '16px',
      depth: UI_DEPTH + 2,
    });

    makeButton(this, frame.cx, frame.footerY, 'CANCEL', () => {
      this.closePurchase({ success: false, cancelled: true, productId: this.productId });
    }, {
      width: btnW,
      height: uiPx(46, { min: 40, max: 50 }),
      fontSize: '15px',
      primary: false,
      depth: UI_DEPTH + 2,
    });
  }

  confirmPurchase() {
    if (this._purchasing) return;
    this._purchasing = true;
    this._status?.setText('Processing…');
    this._status?.setColor(cssHex(PAL.accent2));
    this.closePurchase({
      success: true,
      productId: this.productId,
      simulated: Monetization.isSimulatedStore(),
    });
  }

  closePurchase(result) {
    if (!this.scene.isActive()) return;
    const from = this._from;
    const sm = this.game.scene;
    this.game.events.emit('purchase:done', result);
    InputRouter.onOverlayClose(SCENES.PURCHASE);
    this.scene.stop();
    if (from && sm.isPaused(from)) sm.resume(from);
  }

  handleBack() {
    if (!this.scene.isActive() || this._purchasing) return false;
    this.closePurchase({ success: false, cancelled: true, productId: this.productId });
    return true;
  }
}
