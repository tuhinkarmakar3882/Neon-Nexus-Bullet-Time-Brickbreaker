import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { PADDLE_HULLS, BALL_TRAILS, GARDEN_THEMES } from '../config/Cosmetics.js';
import { makeButton, makeResponsiveOverlayPanel, overlayFrame, attachOverlayScroll } from '../utils/UI.js';
import { MetaProgress } from '../systems/MetaProgress.js';
import { Monetization } from '../systems/Monetization.js';
import { InputRouter } from '../systems/InputRouter.js';
import { clamp } from '../utils/Helpers.js';
import { audio } from '../systems/AudioManager.js';
import { fitTextWidth, orbitronStyle, displayStyle, bodyStyle, uiPx } from '../utils/Typography.js';

export class ShopScene extends Phaser.Scene {
  constructor() { super(SCENES.SHOP); }

  init(data) { this.from = data?.from ?? SCENES.MENU; }

  create() {
    InputRouter.onOverlayOpen(SCENES.SHOP);
    this.input.setTopOnly(true);
    this._bannerWasVisible = document.getElementById('ad-banner')?.classList.contains('visible');
    Monetization.hideBanner();

    const DEPTH = 1002;
    this._rowH = uiPx(52, { min: 46, max: 54 });
    this._rowGap = uiPx(10, { min: 8, max: 12 });
    const SECTION_GAP = uiPx(20, { min: 16, max: 22 });
    this._depth = DEPTH;

    const panel = makeResponsiveOverlayPanel(this, { dimAlpha: 0.94, maxCardW: 720 });
    this.panel = panel;
    const frame = overlayFrame(panel, { footerReserve: uiPx(64, { min: 56, max: 68 }), headerReserve: uiPx(108, { min: 96, max: 112 }) });

    const cardTop = frame.cardTop;
    this.contentWidth = panel.cardW - frame.pad * 2;
    const headerBottom = frame.contentTop;
    const contentBottom = frame.footerY - uiPx(30, { min: 26, max: 34 });
    this.contentTop = headerBottom;
    this.contentH = Math.max(80, contentBottom - headerBottom);

    const title = this.add.text(frame.cx, cardTop + uiPx(28, { min: 22, max: 32 }), 'GARDEN SHOP', {
      ...orbitronStyle(34, cssHex(PAL.accent), { fontStyle: '900', align: 'center' }),
    }).setOrigin(0.5, 0).setDepth(DEPTH + 2).setShadow(0, 0, cssHex(PAL.accent), 14, true, true);
    fitTextWidth(title, this.contentWidth, uiPx(24, { min: 20, max: 28 }));

    this.add.text(frame.cx, cardTop + uiPx(58, { min: 48, max: 62 }), 'GEMS', {
      ...orbitronStyle(10, PAL.textMuted, { letterSpacing: '0.22em', align: 'center' }),
    }).setOrigin(0.5, 0).setDepth(DEPTH + 2);

    this.status = this.add.text(frame.cx, cardTop + uiPx(76, { min: 64, max: 80 }), `💎  ${MetaProgress.getGems()}`, {
      ...orbitronStyle(20, cssHex(PAL.accent2), { fontStyle: 'bold', align: 'center' }),
    }).setOrigin(0.5, 0).setDepth(DEPTH + 2);

    const divider = this.add.graphics().setDepth(DEPTH + 2);
    divider.lineStyle(1, PAL.accent, 0.28);
    divider.lineBetween(frame.cx - this.contentWidth / 2, headerBottom - uiPx(8, { min: 6, max: 10 }), frame.cx + this.contentWidth / 2, headerBottom - uiPx(8, { min: 6, max: 10 }));

    this.scrollY = 0;
    this._hitRows = [];
    this.scrollLayer = this.add.container(panel.cx, headerBottom).setDepth(DEPTH);

    let y = 8;
    y = this.addSection('PADDLE HULLS', y);
    PADDLE_HULLS.forEach((c) => { y = this.addCosmeticRow(c, 'hull', y); });
    y += SECTION_GAP;
    y = this.addSection('BALL TRAILS', y);
    BALL_TRAILS.forEach((c) => { y = this.addCosmeticRow(c, 'trail', y); });
    y += SECTION_GAP;
    y = this.addSection('GARDEN THEMES', y);
    GARDEN_THEMES.forEach((c) => { y = this.addCosmeticRow(c, 'theme', y); });
    y += SECTION_GAP;
    y = this.addSection('SUPPORT', y);
    y = this.addSupportRow(y);

    this.contentHeight = y + 8;
    this.maxScroll = Math.max(0, this.contentHeight - this.contentH);

    const maskGfx = this.make.graphics().setDepth(DEPTH);
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(frame.cx - this.contentWidth / 2, headerBottom, this.contentWidth, this.contentH);
    this.scrollLayer.setMask(maskGfx.createGeometryMask());

    this.fadeTop = this.add.rectangle(
      frame.cx, headerBottom + 18, this.contentWidth, uiPx(24, { min: 20, max: 28 }), 0x080b16, 0.55,
    ).setDepth(DEPTH + 1).setVisible(false);
    this.fadeBottom = this.add.rectangle(
      frame.cx, contentBottom - uiPx(18, { min: 14, max: 22 }), this.contentWidth, uiPx(24, { min: 20, max: 28 }), 0x080b16, 0.55,
    ).setDepth(DEPTH + 1).setVisible(false);

    this.scrollHint = this.add.text(frame.cx, contentBottom - uiPx(22, { min: 18, max: 24 }), 'SWIPE TO SCROLL', {
      ...orbitronStyle(9, PAL.textMuted, { letterSpacing: '0.18em', align: 'center' }),
    }).setOrigin(0.5).setDepth(DEPTH + 2).setAlpha(this.maxScroll > 0 ? 0.55 : 0);

    const scrollLeft = frame.cx - this.contentWidth / 2;
    this._scroll = attachOverlayScroll(this, {
      left: scrollLeft,
      top: this.contentTop,
      width: this.contentWidth,
      height: this.contentH,
      getScroll: () => this.scrollY,
      setScroll: (v) => {
        this.scrollY = v;
        this.scrollLayer.y = this.contentTop - this.scrollY;
        this.updateScrollFade();
      },
      getMaxScroll: () => this.maxScroll,
    });

    this._onRowTap = (pointer) => {
      if (this._purchasing || this.scene.isActive(SCENES.PURCHASE)) return;
      if (this._scroll?.isDragGesture()) {
        this._scroll.resetGesture();
        return;
      }
      if (!this.inScrollBounds(pointer)) return;
      const localY = pointer.y - this.scrollLayer.y;
      for (const row of this._hitRows) {
        if (localY >= row.top && localY <= row.bottom) {
          if (row.action) row.action();
          else if (row.c && row.kind) this.selectCosmetic(row.c, row.kind);
          return;
        }
      }
    };
    this.input.on('pointerup', this._onRowTap);

    makeButton(this, frame.cx, frame.footerY, 'BACK', () => this.close(), {
      width: Math.min(this.contentWidth, uiPx(240, { max: 260 })),
      height: uiPx(48, { min: 42, max: 52 }),
      fontSize: '16px',
      primary: false,
      depth: DEPTH + 3,
    });

    this.updateScrollFade();
    this.events.once('shutdown', () => {
      this._scroll?.destroy();
      if (this._onRowTap) this.input.off('pointerup', this._onRowTap);
    });
  }

  inScrollBounds(p) {
    const left = this.panel.cx - this.contentWidth / 2;
    return p.x >= left
      && p.x <= left + this.contentWidth
      && p.y >= this.contentTop
      && p.y <= this.contentTop + this.contentH;
  }

  addSection(title, y) {
    const label = this.add.text(-this.contentWidth / 2 + 4, y, title, {
      ...orbitronStyle(11, cssHex(PAL.accent3), { fontStyle: 'bold', letterSpacing: '0.14em' }),
    }).setOrigin(0, 0);
    this.scrollLayer.add(label);
    return y + 28;
  }

  addCosmeticRow(c, kind, y) {
    if (c.cost === 0 && !MetaProgress.ownsCosmetic(kind, c.id)) {
      MetaProgress.unlockCosmetic(kind, c.id);
    }
    const owned = MetaProgress.ownsCosmetic(kind, c.id);
    const equipped = MetaProgress.getEquipped()[kind] === c.id;
    const rowW = this.contentWidth - 8;
    const tint = kind === 'theme' ? c.accent : c.tint;
    const row = this.add.container(0, y + this._rowH / 2);

    const bg = this.add.graphics();
    const drawBg = (hover = false) => {
      bg.clear();
      bg.fillStyle(equipped ? 0x142038 : 0x080c14, equipped ? 0.95 : hover ? 0.88 : 0.72);
      bg.fillRoundedRect(-rowW / 2, -this._rowH / 2, rowW, this._rowH, 12);
      bg.lineStyle(2, equipped ? PAL.accent : owned ? 0x557799 : 0x334455, equipped ? 1 : 0.85);
      bg.strokeRoundedRect(-rowW / 2, -this._rowH / 2, rowW, this._rowH, 12);
    };
    drawBg(false);

    const swatch = this.add.circle(-rowW / 2 + 26, 0, 15, tint);
    swatch.setStrokeStyle(2, 0xffffff, 0.35);

    const nameText = this.add.text(-rowW / 2 + 52, equipped ? -7 : 0, c.label, {
      ...orbitronStyle(14, equipped ? cssHex(PAL.accent) : '#e8eefc', { fontStyle: 'bold' }),
    }).setOrigin(0, 0.5);
    fitTextWidth(nameText, rowW - uiPx(100, { min: 80, max: 110 }), 10);

    const parts = [bg, swatch, nameText];

    if (equipped) {
      parts.push(this.add.text(-rowW / 2 + 52, 11, 'EQUIPPED', {
        ...displayStyle(10, cssHex(PAL.accent2), { letterSpacing: '0.12em', fontStyle: '600' }),
      }).setOrigin(0, 0.5));
    }

    let actionLabel;
    let actionColor;
    if (c.premium && !MetaProgress.isPremium() && !owned) {
      actionLabel = '★ PREMIUM';
      actionColor = cssHex(PAL.gold);
    } else if (equipped) {
      actionLabel = '✓';
      actionColor = cssHex(PAL.accent);
    } else if (owned) {
      actionLabel = 'EQUIP';
      actionColor = cssHex(PAL.accent3);
    } else {
      actionLabel = c.cost === 0 ? 'FREE' : `${c.cost} 💎`;
      actionColor = cssHex(PAL.accent2);
    }

    parts.push(this.add.text(rowW / 2 - 16, 0, actionLabel, {
      ...displayStyle(equipped ? 18 : actionLabel === '★ PREMIUM' ? 10 : 13, actionColor, {
        fontStyle: owned && !equipped ? '700' : '500',
      }),
    }).setOrigin(1, 0.5));

    row.add(parts);
    this.scrollLayer.add(row);
    this._hitRows.push({ top: y, bottom: y + this._rowH, c, kind });
    return y + this._rowH + this._rowGap;
  }

  addSupportRow(y) {
    const rowW = this.contentWidth - 8;
    const gap = uiPx(12, { min: 8, max: 12 });
    const btnW = (rowW - gap) / 2;
    const btnH = uiPx(44, { min: 40, max: 48 });
    const rowTop = y + uiPx(8, { min: 6, max: 10 });
    const row = this.add.container(0, rowTop + btnH / 2);

    const guard = (fn) => () => {
      if (this._purchasing || this._scroll?.isDragGesture()) return;
      fn();
    };

    const gemPrice = Monetization.formatPrice('coins_small') || '$0.99';
    const premPrice = Monetization.formatPrice('premium') || '$4.99';

    const coinsBtn = makeButton(this, 0, 0, `GEM PACK\n${gemPrice}`, guard(() => {
      this.buyStoreProduct('coins_small');
    }), { width: btnW, height: btnH, fontSize: '12px', primary: false, depth: this._depth + 1, fitLabel: false });
    coinsBtn.setPosition(-btnW / 2 - gap / 2, 0);

    const premBtn = makeButton(this, 0, 0, `PREMIUM\n${premPrice}`, guard(() => {
      this.buyStoreProduct('premium');
    }), { width: btnW, height: btnH, fontSize: '12px', primary: false, depth: this._depth + 1, fitLabel: false });
    premBtn.setPosition(btnW / 2 + gap / 2, 0);

    row.add([coinsBtn, premBtn]);
    this.scrollLayer.add(row);
    return y + btnH + uiPx(24, { min: 20, max: 28 });
  }

  selectCosmetic(c, kind) {
    if (this._purchasing || this.scene.isActive(SCENES.PURCHASE)) return;
    const owned = MetaProgress.ownsCosmetic(kind, c.id);
    if (owned) {
      MetaProgress.equipCosmetic(kind, c.id);
      audio.blip(880);
      this.refresh();
      return;
    }
    if (c.premium && !MetaProgress.isPremium()) {
      this.status.setText('Requires Premium — tap PREMIUM below');
      this.status.setColor(cssHex(PAL.gold));
      return;
    }
    if (MetaProgress.spendGems(c.cost)) {
      MetaProgress.unlockCosmetic(kind, c.id);
      MetaProgress.equipCosmetic(kind, c.id);
      audio.blip(880);
      this.refresh();
      return;
    }
    this.status.setText(`Need ${c.cost - MetaProgress.getGems()} more 💎`);
    this.status.setColor('#ff8899');
  }

  updateTreasury() {
    this.status.setText(`💎  ${MetaProgress.getGems()}`);
    this.status.setColor(cssHex(PAL.accent2));
  }

  async buyStoreProduct(productId) {
    if (this._purchasing || !Monetization.isStoreAvailable()) {
      if (!Monetization.isStoreAvailable()) {
        this.status.setText('Store unavailable in this build');
        this.status.setColor('#ff8899');
      }
      return;
    }
    this._purchasing = true;
    this.status.setText('Opening checkout…');
    this.status.setColor(cssHex(PAL.accent2));
    try {
      const res = await Monetization.purchase(productId);
      if (res?.success) {
        if (productId === 'coins_small') {
          this.updateTreasury();
          this.status.setText(`Purchase complete · ${MetaProgress.getGems()} 💎`);
        } else {
          this.refresh();
        }
        return;
      }
      if (res?.cancelled) {
        this.status.setText('');
        return;
      }
      this.status.setText(Monetization.purchaseErrorMessage(res));
      this.status.setColor('#ff8899');
    } finally {
      this._purchasing = false;
    }
  }

  scrollBy(dy) {
    if (this.maxScroll <= 0) return;
    this.scrollY = clamp(this.scrollY + dy, 0, this.maxScroll);
    this.scrollLayer.y = this.contentTop - this.scrollY;
    this.updateScrollFade();
  }

  updateScrollFade() {
    const canScroll = this.maxScroll > 0;
    this.fadeTop.setVisible(canScroll && this.scrollY > 4);
    this.fadeBottom.setVisible(canScroll && this.scrollY < this.maxScroll - 4);
    this.scrollHint.setAlpha(canScroll && this.scrollY < this.maxScroll - 8 ? 0.55 : 0);
  }

  refresh() {
    this.scene.restart({ from: this.from });
  }

  close() {
    this._scroll?.destroy();
    this.input.off('pointerup', this._onRowTap);
    if (this._bannerWasVisible) Monetization.showBanner();
    InputRouter.onOverlayClose(SCENES.SHOP, this.from === SCENES.MENU);
    this.scene.stop();
    if (this.scene.isPaused(this.from)) this.scene.resume(this.from);
  }

  shutdown() {
    if (this._bannerWasVisible) Monetization.showBanner();
  }
}
