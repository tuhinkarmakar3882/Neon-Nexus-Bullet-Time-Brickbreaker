import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { PADDLE_HULLS, BALL_TRAILS, GARDEN_THEMES } from '../config/Cosmetics.js';
import { makeButton, makeOverlayPanel } from '../utils/UI.js';
import { MetaProgress } from '../systems/MetaProgress.js';
import { Monetization } from '../systems/Monetization.js';
import { InputRouter } from '../systems/InputRouter.js';
import { clamp } from '../utils/Helpers.js';
import { audio } from '../systems/AudioManager.js';

const DEPTH = 1002;
const ROW_H = 54;
const ROW_GAP = 10;
const SECTION_GAP = 22;

export class ShopScene extends Phaser.Scene {
  constructor() { super(SCENES.SHOP); }

  init(data) { this.from = data?.from ?? SCENES.MENU; }

  create() {
    InputRouter.onOverlayOpen(SCENES.SHOP);
    this.input.setTopOnly(true);
    this._bannerWasVisible = document.getElementById('ad-banner')?.classList.contains('visible');
    Monetization.hideBanner();

    const W = GAME.WIDTH;
    const panel = makeOverlayPanel(this, { dimAlpha: 0.94, cardH: GAME.HEIGHT * 0.9 });
    this.panel = panel;

    const cardTop = panel.cy - panel.cardH / 2;
    const cardBottom = panel.cy + panel.cardH / 2;
    const contentLeft = panel.cx - panel.cardW / 2 + 20;
    this.contentWidth = panel.cardW - 40;
    const headerBottom = cardTop + 112;
    const footerTop = cardBottom - 68;
    this.contentTop = headerBottom;
    this.contentH = footerTop - headerBottom;

    this.add.text(panel.cx, cardTop + 40, 'GARDEN SHOP', {
      fontFamily: 'Orbitron, monospace',
      fontSize: clamp(Math.round(W * 0.038), 30, 42) + 'px',
      fontStyle: '900',
      color: cssHex(PAL.accent),
    }).setOrigin(0.5).setDepth(DEPTH + 2).setShadow(0, 0, cssHex(PAL.accent), 14, true, true);

    this.add.text(panel.cx, cardTop + 72, 'GEMS', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '11px',
      color: PAL.textMuted,
      letterSpacing: '0.22em',
    }).setOrigin(0.5).setDepth(DEPTH + 2);

    this.status = this.add.text(panel.cx, cardTop + 92, `💎  ${MetaProgress.getGems()}`, {
      fontFamily: 'Orbitron, monospace',
      fontSize: '22px',
      color: cssHex(PAL.accent2),
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH + 2);

    const divider = this.add.graphics().setDepth(DEPTH + 2);
    divider.lineStyle(1, PAL.accent, 0.28);
    divider.lineBetween(contentLeft, headerBottom - 10, contentLeft + this.contentWidth, headerBottom - 10);

    this.scrollY = 0;
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
    maskGfx.fillRect(contentLeft, headerBottom, this.contentWidth, this.contentH);
    this.scrollLayer.setMask(maskGfx.createGeometryMask());

    this.fadeTop = this.add.rectangle(
      panel.cx, headerBottom + 18, this.contentWidth, 28, 0x080b16, 0.55,
    ).setDepth(DEPTH + 1).setVisible(false);
    this.fadeBottom = this.add.rectangle(
      panel.cx, footerTop - 18, this.contentWidth, 28, 0x080b16, 0.55,
    ).setDepth(DEPTH + 1).setVisible(false);

    this.scrollHint = this.add.text(panel.cx, footerTop - 28, 'SWIPE TO SCROLL', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '10px',
      color: PAL.textMuted,
      letterSpacing: '0.18em',
    }).setOrigin(0.5).setDepth(DEPTH + 2).setAlpha(this.maxScroll > 0 ? 0.55 : 0);

    this._ptrDown = false;
    this._didDrag = false;
    this._onPtrDown = (p) => {
      if (!this.inScrollBounds(p)) return;
      this._ptrDown = true;
      this._didDrag = false;
      this._ptrStartY = p.y;
      this._scrollAtDown = this.scrollY;
    };
    this._onPtrMove = (p) => {
      if (!this._ptrDown) return;
      const dy = p.y - this._ptrStartY;
      if (Math.abs(dy) > 8) this._didDrag = true;
      if (!this._didDrag) return;
      this.scrollY = clamp(this._scrollAtDown + dy, 0, this.maxScroll);
      this.scrollLayer.y = this.contentTop - this.scrollY;
      this.updateScrollFade();
    };
    this._onPtrUp = () => {
      this._ptrDown = false;
    };
    this.input.on('pointerdown', this._onPtrDown);
    this.input.on('pointermove', this._onPtrMove);
    this.input.on('pointerup', this._onPtrUp);
    this.input.on('wheel', (_p, _dx, _dy, dz) => {
      if (this.maxScroll <= 0) return;
      this.scrollBy(dz * 0.4);
    });

    makeButton(this, panel.cx, cardBottom - 36, 'BACK', () => this.close(), {
      width: 240,
      height: 52,
      fontSize: '20px',
      primary: false,
      depth: DEPTH + 3,
    });

    this.updateScrollFade();
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
      fontFamily: 'Orbitron, monospace',
      fontSize: '12px',
      color: cssHex(PAL.accent3),
      fontStyle: 'bold',
      letterSpacing: '0.14em',
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
    const row = this.add.container(0, y + ROW_H / 2);

    const bg = this.add.graphics();
    const drawBg = (hover = false) => {
      bg.clear();
      bg.fillStyle(equipped ? 0x142038 : 0x080c14, equipped ? 0.95 : hover ? 0.88 : 0.72);
      bg.fillRoundedRect(-rowW / 2, -ROW_H / 2, rowW, ROW_H, 12);
      bg.lineStyle(2, equipped ? PAL.accent : owned ? 0x557799 : 0x334455, equipped ? 1 : 0.85);
      bg.strokeRoundedRect(-rowW / 2, -ROW_H / 2, rowW, ROW_H, 12);
    };
    drawBg(false);

    const swatch = this.add.circle(-rowW / 2 + 26, 0, 15, tint);
    swatch.setStrokeStyle(2, 0xffffff, 0.35);

    const nameText = this.add.text(-rowW / 2 + 52, equipped ? -7 : 0, c.label, {
      fontFamily: 'Orbitron, monospace',
      fontSize: '15px',
      color: equipped ? cssHex(PAL.accent) : '#e8eefc',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    const parts = [bg, swatch, nameText];

    if (equipped) {
      parts.push(this.add.text(-rowW / 2 + 52, 11, 'EQUIPPED', {
        fontFamily: 'Orbitron, monospace',
        fontSize: '10px',
        color: cssHex(PAL.accent2),
        letterSpacing: '0.12em',
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
      fontFamily: 'Orbitron, monospace',
      fontSize: equipped ? '18px' : actionLabel === '★ PREMIUM' ? '10px' : '13px',
      color: actionColor,
      fontStyle: owned && !equipped ? 'bold' : 'normal',
    }).setOrigin(1, 0.5));

    const zone = this.add.zone(0, 0, rowW, ROW_H);
    zone.setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => drawBg(true));
    zone.on('pointerout', () => drawBg(false));
    zone.on('pointerup', () => {
      if (this._didDrag) return;
      this.selectCosmetic(c, kind);
    });
    parts.push(zone);

    row.add(parts);
    this.scrollLayer.add(row);
    return y + ROW_H + ROW_GAP;
  }

  addSupportRow(y) {
    const rowW = this.contentWidth - 8;
    const gap = 12;
    const btnW = (rowW - gap) / 2;
    const row = this.add.container(0, y + 28);

    const coinsBtn = makeButton(this, 0, 0, 'GEMS +50', async () => {
      const res = await Monetization.purchase('coins_small');
      if (res?.success) this.updateTreasury();
    }, { width: btnW, height: 48, fontSize: '14px', primary: false, depth: DEPTH + 1 });
    coinsBtn.setPosition(-btnW / 2 - gap / 2, 0);

    const premBtn = makeButton(this, 0, 0, 'PREMIUM', async () => {
      const res = await Monetization.purchase('premium');
      if (res?.success) {
        MetaProgress.setPremium(true);
        this.refresh();
      }
    }, { width: btnW, height: 48, fontSize: '14px', primary: false, depth: DEPTH + 1 });
    premBtn.setPosition(btnW / 2 + gap / 2, 0);

    row.add([coinsBtn, premBtn]);
    this.scrollLayer.add(row);
    return y + 64;
  }

  selectCosmetic(c, kind) {
    const owned = MetaProgress.ownsCosmetic(kind, c.id);
    if (owned) {
      MetaProgress.equipCosmetic(kind, c.id);
      audio.blip(880);
      this.refresh();
      return;
    }
    if (c.premium && !MetaProgress.isPremium()) {
      this.status.setText('Requires Premium pass');
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
    this.input.off('pointerdown', this._onPtrDown);
    this.input.off('pointermove', this._onPtrMove);
    this.input.off('pointerup', this._onPtrUp);
    if (this._bannerWasVisible) Monetization.showBanner();
    InputRouter.onOverlayClose(this.from === SCENES.MENU);
    this.scene.stop();
    if (this.scene.isPaused(this.from)) this.scene.resume(this.from);
  }

  shutdown() {
    if (this._bannerWasVisible) Monetization.showBanner();
  }
}
