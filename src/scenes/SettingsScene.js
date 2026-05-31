import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { VFX_LEVELS, resolveSettings } from '../config/VfxQuality.js';
import { makeButton, makeResponsiveOverlayPanel, makeToggle, overlayFrame } from '../utils/UI.js';
import { SaveManager } from '../systems/SaveManager.js';
import { Monetization } from '../systems/Monetization.js';
import { audio } from '../systems/AudioManager.js';
import { InputRouter } from '../systems/InputRouter.js';
import { fitTextWidth, orbitronStyle, uiPx } from '../utils/Typography.js';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super(SCENES.SETTINGS);
  }

  init(data) {
    this.from = data?.from ?? SCENES.MENU;
    this.settings = SaveManager.loadSettings();
  }

  create() {
    InputRouter.onOverlayOpen(SCENES.SETTINGS);
    this.input.setTopOnly(true);
    this.game.scale.refresh();
    const panel = makeResponsiveOverlayPanel(this, { maxCardW: 680 });
    const compact = GAME.HEIGHT < 720 || (GAME.IS_PORTRAIT && GAME.HEIGHT < 780);
    const frame = overlayFrame(panel, {
      footerReserve: uiPx(72, { min: 60, max: 76 }),
      headerReserve: uiPx(compact ? 64 : 72, { min: 56, max: 80 }),
    });
    const rowW = Math.min(panel.cardW * 0.9, uiPx(480, { max: 520 }));
    const labelX = frame.cx - rowW / 2;
    const toggleW = uiPx(72, { min: 48, max: 88 });
    const toggleH = uiPx(36, { min: 28, max: 40 });
    const toggleX = frame.cx + rowW / 2 - toggleW / 2;
    const shopBtnW = Math.min(rowW, uiPx(400, { max: 420 }));
    const rowGap = toggleH + uiPx(18, { min: 14, max: 22 });

    const title = this.add.text(frame.cx, frame.titleY, 'SETTINGS', {
      ...orbitronStyle(40, cssHex(PAL.accent), { fontStyle: '900', align: 'center' }),
    }).setOrigin(0.5, 0).setDepth(1001).setShadow(0, 0, cssHex(PAL.accent), 16, true, true);
    fitTextWidth(title, frame.wrap, uiPx(26, { min: 22, max: 32 }));

    let y = frame.contentTop;

    this.add.text(frame.cx, y, 'VFX QUALITY', {
      ...orbitronStyle(12, PAL.textMuted, { letterSpacing: '0.18em', align: 'center' }),
    }).setOrigin(0.5, 0).setDepth(1001);
    y += uiPx(22, { min: 18, max: 24 });

    const qualBtnH = uiPx(40, { min: 36, max: 44 });
    const btnW = Math.min(uiPx(140, { max: 140 }), (panel.cardW - 48) / 4 - 6);
    const qualRowY = y + uiPx(22, { min: 18, max: 22 });
    const qualityLabels = { low: 'LOW', medium: 'MED', high: 'HIGH', ultra: 'ULTRA' };
    this.qualityBtns = [];
    VFX_LEVELS.forEach((q, i) => {
      const x = frame.cx - (VFX_LEVELS.length * (btnW + 8)) / 2 + i * (btnW + 8) + btnW / 2;
      const btn = makeButton(this, x, qualRowY, qualityLabels[q], () => {
        this.settings.vfxQuality = q;
        this.refreshQualityButtons();
        audio.blip(720);
      }, {
        width: btnW,
        height: qualBtnH,
        fontSize: '12px',
        primary: this.settings.vfxQuality === q,
        color: this.settings.vfxQuality === q ? PAL.accent : 0x667788,
      });
      btn.setDepth(1001);
      this.qualityBtns.push({ q, btn });
    });
    y = qualRowY + qualBtnH / 2 + uiPx(16, { min: 12, max: 20 }) + toggleH / 2;

    const row = (key, label, yy) => {
      const labelText = this.add.text(labelX, yy, label, {
        ...orbitronStyle(20, '#cfe9ff'),
      }).setOrigin(0, 0.5).setDepth(1001);
      fitTextWidth(labelText, rowW - uiPx(130, { min: 100, max: 130 }), uiPx(13, { min: 12, max: 16 }));
      makeToggle(this, toggleX, yy, this.settings[key], (on) => {
        this.settings[key] = on;
        audio.init();
        if (key === 'sound') { audio.setSoundEnabled(on); audio.blip(720); }
        if (key === 'music') audio.setMusicEnabled(on);
      }, { width: toggleW, height: toggleH, depth: 1001 });
    };

    row('sound', 'SOUND FX', y);
    y += rowGap;
    row('music', 'MUSIC', y);
    y += rowGap + uiPx(4, { min: 2, max: 6 });

    this.shopStatus = this.add.text(frame.cx, y, '', {
      ...orbitronStyle(14, cssHex(PAL.accent2), { align: 'center', wordWrap: { width: frame.wrap } }),
    }).setOrigin(0.5, 0).setDepth(1001);
    y += uiPx(24, { min: 18, max: 24 });

    const adsRemoved = SaveManager.getRemoveAds() || Monetization.removeAds;
    if (adsRemoved) {
      this.shopStatus.setText('Ads removed — thank you!');
      y += uiPx(28, { min: 22, max: 28 });
    } else if (Monetization.isStoreAvailable() && y < frame.contentBottom - uiPx(120, { min: 100, max: 120 })) {
      const removeAdsPrice = Monetization.formatPrice('remove_ads') || '$2.99';
      makeButton(this, frame.cx, y + uiPx(24, { min: 20, max: 24 }), `REMOVE ADS — ${removeAdsPrice}`, () => {
        this.buyRemoveAds();
      }, { width: shopBtnW, height: uiPx(46, { min: 40, max: 48 }), fontSize: '15px', primary: false });
      y += uiPx(compact ? 58 : 68, { min: 52, max: 68 });

      if (y < frame.contentBottom - uiPx(168, { min: 140, max: 168 })) {
        makeButton(this, frame.cx, y + uiPx(20, { min: 16, max: 22 }), 'RESTORE PURCHASES', () => {
          this.restoreStorePurchases();
        }, { width: shopBtnW, height: uiPx(40, { min: 36, max: 44 }), fontSize: '13px', primary: false });
        y += uiPx(52, { min: 44, max: 56 });
      }
    } else if (!Monetization.isStoreAvailable()) {
      this.shopStatus.setText('Store unavailable in this build');
      y += uiPx(22, { min: 18, max: 24 });
    }

    if (y < frame.contentBottom - uiPx(56, { min: 48, max: 56 })) {
      makeButton(this, frame.cx, y + uiPx(22, { min: 18, max: 22 }), 'GARDEN SHOP', () => {
        this.scene.pause(SCENES.SETTINGS);
        this.scene.launch(SCENES.SHOP, { from: SCENES.SETTINGS });
      }, { width: shopBtnW, height: uiPx(44, { min: 40, max: 48 }), fontSize: '15px', primary: false });
    }

    makeButton(this, frame.cx, frame.footerY, 'SAVE & CLOSE', () => this.close(), {
      width: Math.min(frame.btnW, uiPx(340, { max: 360 })),
      height: uiPx(52, { min: 44, max: 56 }),
      fontSize: '18px',
    });
  }

  refreshQualityButtons() {
    this.qualityBtns?.forEach(({ q, btn }) => {
      const active = this.settings.vfxQuality === q;
      btn.setAlpha(active ? 1 : 0.75);
    });
  }

  async buyRemoveAds() {
    this.shopStatus.setText('Opening checkout…');
    this.shopStatus.setColor(cssHex(PAL.accent2));
    const res = await Monetization.purchase('remove_ads');
    if (res?.success) {
      this.scene.restart({ from: this.from });
      return;
    }
    if (res?.cancelled) {
      this.shopStatus.setText('');
      return;
    }
    this.shopStatus.setText(Monetization.purchaseErrorMessage(res));
    this.shopStatus.setColor('#ff8899');
  }

  async restoreStorePurchases() {
    this.shopStatus.setText('Restoring purchases…');
    this.shopStatus.setColor(cssHex(PAL.accent2));
    const res = await Monetization.restorePurchases();
    if (res?.success && (SaveManager.getRemoveAds() || Monetization.removeAds)) {
      this.scene.restart({ from: this.from });
      return;
    }
    if (res?.success) {
      this.shopStatus.setText('No previous purchases found');
      this.shopStatus.setColor(PAL.textMuted);
      return;
    }
    this.shopStatus.setText(Monetization.purchaseErrorMessage(res));
    this.shopStatus.setColor('#ff8899');
  }

  close() {
    SaveManager.saveSettings(this.settings);
    audio.setSoundEnabled(this.settings.sound);
    audio.setMusicEnabled(this.settings.music);
    const gameScene = this.scene.get(SCENES.GAME);
    if ((this.from === SCENES.GAME || this.from === SCENES.PAUSE) && gameScene?.sys?.isActive?.()) {
      gameScene.settings = resolveSettings(SaveManager.loadSettings());
      try { gameScene.bg?.setFxLevel?.(gameScene.settings.bgReduced); } catch { /* scene tearing down */ }
    }
    if (gameScene?.bus && this.from === SCENES.GAME) {
      gameScene.bus.emit('hud:immersive', { on: true });
    }

    InputRouter.onOverlayClose(this.from === SCENES.GAME || this.from === SCENES.PAUSE);
    this.scene.stop();
    if (this.scene.isSleeping(this.from)) this.scene.wake(this.from);
    else if (this.scene.isPaused(this.from)) this.scene.resume(this.from);
  }
}
