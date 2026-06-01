import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { COSMETIC_SECTIONS } from '../config/Cosmetics.js';
import { makeButton, makeResponsiveOverlayPanel, overlayFrame, attachOverlayScroll, clampOverlayScroll } from '../utils/UI.js';
import { MetaProgress } from '../systems/MetaProgress.js';
import { applyEquippedCosmeticsToGame, emitCosmeticsChanged } from '../systems/CosmeticsBridge.js';
import { isIapEnabled } from '../config/AdsConfig.js';
import { Monetization } from '../systems/Monetization.js';
import { InputRouter } from '../systems/InputRouter.js';
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

    this._rowH = uiPx(68, { min: 60, max: 72 });
    this._rowGap = uiPx(10, { min: 8, max: 12 });
    this._depth = 1002;
    this._purchasing = false;
    this._hitRows = [];
    this._rowNodes = [];

    const panel = makeResponsiveOverlayPanel(this, { dimAlpha: 0.94, maxCardW: 720 });
    this.panel = panel;
    const frame = overlayFrame(panel, {
      footerReserve: uiPx(72, { min: 64, max: 76 }),
      headerReserve: uiPx(118, { min: 104, max: 124 }),
    });
    this.frame = frame;
    this.contentWidth = panel.cardW - frame.pad * 2;
    this.contentTop = frame.contentTop;
    this.contentH = Math.max(80, frame.footerY - frame.contentTop - uiPx(30, { min: 26, max: 34 }));

    const cardTop = frame.cardTop;
    this.add.text(frame.cx, cardTop + uiPx(24, { min: 20, max: 28 }), 'GARDEN SHOP', {
      ...orbitronStyle(32, cssHex(PAL.accent), { fontStyle: '900', align: 'center' }),
    }).setOrigin(0.5, 0).setDepth(this._depth + 2);

    this.hintLine = this.add.text(frame.cx, cardTop + uiPx(54, { min: 46, max: 58 }),
      'Spend gems on visuals — changes apply instantly in-game', {
        ...bodyStyle(11, PAL.textMuted, { align: 'center', wordWrap: { width: this.contentWidth } }),
      }).setOrigin(0.5, 0).setDepth(this._depth + 2);

    this.status = this.add.text(frame.cx, cardTop + uiPx(78, { min: 68, max: 86 }), '', {
      ...orbitronStyle(18, cssHex(PAL.accent2), { fontStyle: 'bold', align: 'center' }),
    }).setOrigin(0.5, 0).setDepth(this._depth + 2);

    this.previewText = this.add.text(frame.cx, frame.footerY - uiPx(58, { min: 50, max: 64 }), '', {
      ...bodyStyle(11, PAL.textMuted, { align: 'center', wordWrap: { width: this.contentWidth - 16 } }),
    }).setOrigin(0.5, 1).setDepth(this._depth + 3).setAlpha(0.9);

    const divider = this.add.graphics().setDepth(this._depth + 2);
    divider.lineStyle(1, PAL.accent, 0.28);
    divider.lineBetween(
      frame.cx - this.contentWidth / 2,
      this.contentTop - uiPx(8, { min: 6, max: 10 }),
      frame.cx + this.contentWidth / 2,
      this.contentTop - uiPx(8, { min: 6, max: 10 }),
    );

    this.scrollY = 0;
    this.scrollLayer = this.add.container(panel.cx, this.contentTop).setDepth(this._depth);

    const maskGfx = this.make.graphics().setDepth(this._depth);
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(frame.cx - this.contentWidth / 2, this.contentTop, this.contentWidth, this.contentH);
    this.scrollLayer.setMask(maskGfx.createGeometryMask());

    this.fadeTop = this.add.rectangle(
      frame.cx, this.contentTop + 18, this.contentWidth, uiPx(24, { min: 20, max: 28 }), 0x080b16, 0.55,
    ).setDepth(this._depth + 1).setVisible(false);
    this.fadeBottom = this.add.rectangle(
      frame.cx, frame.footerY - uiPx(48, { min: 42, max: 54 }),
      this.contentWidth, uiPx(24, { min: 20, max: 28 }), 0x080b16, 0.55,
    ).setDepth(this._depth + 1).setVisible(false);

    this.scrollHint = this.add.text(frame.cx, frame.footerY - uiPx(88, { min: 78, max: 96 }), 'SWIPE TO SCROLL', {
      ...orbitronStyle(9, PAL.textMuted, { letterSpacing: '0.18em', align: 'center' }),
    }).setOrigin(0.5).setDepth(this._depth + 2).setAlpha(0);

    this.rebuildCatalog();

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
      depth: this._depth + 3,
    });

    this.events.once('shutdown', () => {
      this._scroll?.destroy();
      if (this._onRowTap) this.input.off('pointerup', this._onRowTap);
    });
  }

  rebuildCatalog() {
    this.scrollLayer.removeAll(true);
    this._hitRows = [];
    this._rowNodes = [];
    let y = 8;

    for (const section of COSMETIC_SECTIONS) {
      y = this.addSection(section.title, section.blurb, y);
      for (const c of section.items) {
        y = this.addCosmeticRow(c, section.kind, y);
      }
      y += uiPx(16, { min: 12, max: 18 });
    }

    if (isIapEnabled()) {
      y = this.addSection('SUPPORT', 'Real-money packs when IAP is enabled.', y);
      y = this.addSupportRow(y);
    }

    this.contentHeight = y + 8;
    this.maxScroll = Math.max(0, this.contentHeight - this.contentH);
    this.updateTreasury();
    this.updatePreviewEquipped();
    this.updateScrollFade();
  }

  inScrollBounds(p) {
    const left = this.panel.cx - this.contentWidth / 2;
    return p.x >= left
      && p.x <= left + this.contentWidth
      && p.y >= this.contentTop
      && p.y <= this.contentTop + this.contentH;
  }

  addSection(title, blurb, y) {
    const label = this.add.text(-this.contentWidth / 2 + 4, y, title, {
      ...orbitronStyle(11, cssHex(PAL.accent3), { fontStyle: 'bold', letterSpacing: '0.14em' }),
    }).setOrigin(0, 0);
    this.scrollLayer.add(label);
    const desc = this.add.text(-this.contentWidth / 2 + 4, y + 18, blurb, {
      ...bodyStyle(10, PAL.textMuted, { wordWrap: { width: this.contentWidth - 12 } }),
    }).setOrigin(0, 0);
    this.scrollLayer.add(desc);
    return y + 18 + desc.height + 10;
  }

  addCosmeticRow(c, kind, y) {
    if (c.cost === 0 && !MetaProgress.ownsCosmetic(kind, c.id)) {
      MetaProgress.unlockCosmetic(kind, c.id);
    }
    const owned = MetaProgress.ownsCosmetic(kind, c.id);
    const equipped = MetaProgress.getEquipped()[kind] === c.id;
    const rowW = this.contentWidth - 8;
    const tint = kind === 'theme' ? c.accent : c.tint;
    const rowTop = y;
    const row = this.add.container(0, rowTop + this._rowH / 2);

    const bg = this.add.graphics();
    const drawBg = (hover = false) => {
      bg.clear();
      bg.fillStyle(equipped ? 0x142038 : 0x080c14, equipped ? 0.95 : hover ? 0.88 : 0.72);
      bg.fillRoundedRect(-rowW / 2, -this._rowH / 2, rowW, this._rowH, 12);
      bg.lineStyle(2, equipped ? PAL.accent : owned ? 0x557799 : 0x334455, equipped ? 1 : 0.85);
      bg.strokeRoundedRect(-rowW / 2, -this._rowH / 2, rowW, this._rowH, 12);
    };
    drawBg(false);

    const swatch = this.add.circle(-rowW / 2 + 26, -6, 14, tint);
    swatch.setStrokeStyle(2, 0xffffff, 0.4);

    const nameText = this.add.text(-rowW / 2 + 52, -14, c.label, {
      ...orbitronStyle(14, equipped ? cssHex(PAL.accent) : '#e8eefc', { fontStyle: 'bold' }),
    }).setOrigin(0, 0.5);
    fitTextWidth(nameText, rowW - uiPx(108, { min: 90, max: 120 }), 10);

    const effectLine = this.add.text(-rowW / 2 + 52, 4, c.effect ?? c.desc ?? '', {
      ...bodyStyle(10, equipped ? cssHex(PAL.accent2) : PAL.textMuted, {
        wordWrap: { width: rowW - uiPx(108, { min: 90, max: 120 }) },
      }),
    }).setOrigin(0, 0);

    const parts = [bg, swatch, nameText, effectLine];

    let actionLabel;
    let actionColor;
    if (c.premium && !MetaProgress.isPremium() && !owned) {
      actionLabel = '★ PREMIUM';
      actionColor = cssHex(PAL.gold);
    } else if (equipped) {
      actionLabel = 'ACTIVE';
      actionColor = cssHex(PAL.accent);
    } else if (owned) {
      actionLabel = 'EQUIP';
      actionColor = cssHex(PAL.accent3);
    } else {
      actionLabel = c.cost === 0 ? 'FREE' : `${c.cost} 💎`;
      actionColor = cssHex(PAL.accent2);
    }

    const actionText = this.add.text(rowW / 2 - 14, 0, actionLabel, {
      ...displayStyle(actionLabel === '★ PREMIUM' ? 10 : 12, actionColor, {
        fontStyle: owned && !equipped ? '700' : '600',
      }),
    }).setOrigin(1, 0.5);
    parts.push(actionText);

    row.add(parts);
    row.setSize(rowW, this._rowH);
    row.setInteractive(
      new Phaser.Geom.Rectangle(-rowW / 2, -this._rowH / 2, rowW, this._rowH),
      Phaser.Geom.Rectangle.Contains,
    );
    row.on('pointerover', () => drawBg(true));
    row.on('pointerout', () => drawBg(false));

    this.scrollLayer.add(row);
    this._hitRows.push({ top: y, bottom: y + this._rowH, c, kind });
    this._rowNodes.push({ row, bg, drawBg, equipped, kind, id: c.id, actionText, nameText, effectLine });
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

  updatePreviewEquipped() {
    const eq = MetaProgress.getEquipped();
    this.previewText.setText(
      `Equipped: ${eq.hull} hull · ${eq.trail} trail · ${eq.theme} theme — tap a row to unlock or equip`,
    );
  }

  applyCosmeticLive(kind, id) {
    MetaProgress.equipCosmetic(kind, id);
    applyEquippedCosmeticsToGame(this.game);
    emitCosmeticsChanged(this.game);
    audio.blip(880);
    this.updateTreasury();
    this.refreshRowStates();
    this.updatePreviewEquipped();
    const fromGame = this.from === SCENES.GAME || this.from === SCENES.PAUSE;
    this.status.setText(fromGame ? 'Applied to your run!' : 'Equipped — start a game to preview');
    this.status.setColor(cssHex(PAL.accent2));
  }

  refreshRowStates() {
    const eq = MetaProgress.getEquipped();
    for (const node of this._rowNodes) {
      const owned = MetaProgress.ownsCosmetic(node.kind, node.id);
      const equipped = eq[node.kind] === node.id;
      node.equipped = equipped;
      node.drawBg(false);
      node.nameText?.setColor?.(equipped ? cssHex(PAL.accent) : '#e8eefc');
      node.effectLine?.setColor?.(equipped ? cssHex(PAL.accent2) : PAL.textMuted);
      if (node.actionText?.setText) {
        if (equipped) node.actionText.setText('ACTIVE');
        else if (owned) node.actionText.setText('EQUIP');
      }
    }
  }

  selectCosmetic(c, kind) {
    if (this._purchasing || this.scene.isActive(SCENES.PURCHASE)) return;
    const owned = MetaProgress.ownsCosmetic(kind, c.id);
    if (owned) {
      this.applyCosmeticLive(kind, c.id);
      return;
    }
    if (c.premium && !MetaProgress.isPremium()) {
      this.status.setText(
        isIapEnabled() ? 'Requires Premium Pass — see SUPPORT below' : 'Premium unlock coming soon',
      );
      this.status.setColor(cssHex(PAL.gold));
      return;
    }
    if (MetaProgress.spendGems(c.cost)) {
      MetaProgress.unlockCosmetic(kind, c.id);
      this.applyCosmeticLive(kind, c.id);
      this.status.setText(`Unlocked ${c.label}!`);
      return;
    }
    const need = c.cost - MetaProgress.getGems();
    this.status.setText(`Need ${need} more 💎 — clear levels & collect dew crystals`);
    this.status.setColor('#ff8899');
  }

  updateTreasury() {
    this.status.setText(`💎  ${MetaProgress.getGems().toLocaleString()} gems`);
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
        this.updateTreasury();
        if (productId === 'premium') this.rebuildCatalog();
        this.status.setText(`Purchase complete · ${MetaProgress.getGems()} 💎`);
        applyEquippedCosmeticsToGame(this.game);
        return;
      }
      if (res?.cancelled) {
        this.status.setText(`💎  ${MetaProgress.getGems().toLocaleString()} gems`);
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
    this.scrollY = clampOverlayScroll(this.scrollY + dy, this.maxScroll);
    this.scrollLayer.y = this.contentTop - this.scrollY;
    this.updateScrollFade();
  }

  updateScrollFade() {
    const canScroll = this.maxScroll > 0;
    this.fadeTop.setVisible(canScroll && this.scrollY > 4);
    this.fadeBottom.setVisible(canScroll && this.scrollY < this.maxScroll - 4);
    this.scrollHint.setAlpha(canScroll && this.scrollY < this.maxScroll - 8 ? 0.55 : 0);
  }

  close() {
    applyEquippedCosmeticsToGame(this.game);
    if (this._bannerWasVisible) Monetization.showBanner();
    InputRouter.onOverlayClose(SCENES.SHOP, this.from === SCENES.MENU);
    this.scene.stop();
    if (this.scene.isPaused(this.from)) this.scene.resume(this.from);
  }

  handleBack() {
    this.close();
    return true;
  }

  shutdown() {
    if (this._bannerWasVisible) Monetization.showBanner();
  }
}
