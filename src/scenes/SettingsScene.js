import Phaser from 'phaser';
import { DEFAULT_MUSIC_VOLUME, DEFAULT_SFX_VOLUME, GAME, SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { VFX_LEVELS, resolveSettings } from '../config/VfxQuality.js';
import { makeButton, makeResponsiveOverlayPanel, makeToggle, overlayFrame, attachOverlayScroll } from '../utils/UI.js';
import { applySceneVfx } from '../utils/SceneVfx.js';
import { SaveManager } from '../systems/SaveManager.js';
import { Monetization } from '../systems/Monetization.js';
import { MetaProgress } from '../systems/MetaProgress.js';
import { audio } from '../systems/AudioManager.js';
import { InputRouter } from '../systems/InputRouter.js';
import { fitTextWidth, orbitronStyle, uiPx } from '../utils/Typography.js';
import { MUSIC_CREDITS } from '../config/MusicCatalog.js';
import { isIapEnabled } from '../config/AdsConfig.js';
import { isWebStripeEnabled, promptUnlockCode } from '../systems/WebUnlock.js';
import { openLegalPage } from '../utils/LegalLinks.js';

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
    const toggleW = uiPx(72, { min: 48, max: 88 });
    const toggleH = uiPx(36, { min: 28, max: 40 });
    const shopBtnW = Math.min(rowW, uiPx(400, { max: 420 }));
    const rowGap = toggleH + uiPx(18, { min: 14, max: 22 });

    const title = this.add.text(frame.cx, frame.titleY, 'SETTINGS', {
      ...orbitronStyle(40, cssHex(PAL.accent), { fontStyle: '900', align: 'center' }),
    }).setOrigin(0.5, 0).setDepth(1001).setShadow(0, 0, cssHex(PAL.accent), 16, true, true);
    fitTextWidth(title, frame.wrap, uiPx(26, { min: 22, max: 32 }));

    this.scrollY = 0;
    this.contentTop = frame.contentTop;
    this.contentH = Math.max(80, frame.contentBottom - frame.contentTop);
    this.contentWidth = panel.cardW - frame.pad * 2;
    this.contentLeft = frame.cx - this.contentWidth / 2;
    this.scrollLayer = this.add.container(frame.cx, frame.contentTop).setDepth(1001);

    const addScroll = (obj) => {
      this.scrollLayer.add(obj);
      return obj;
    };

    let y = 0;
    const lx = -rowW / 2;
    const tx = rowW / 2 - toggleW / 2;

    addScroll(this.add.text(0, y, 'VFX QUALITY', {
      ...orbitronStyle(12, PAL.textMuted, { letterSpacing: '0.18em', align: 'center' }),
    }).setOrigin(0.5, 0));
    y += uiPx(22, { min: 18, max: 24 });

    const qualBtnH = uiPx(40, { min: 36, max: 44 });
    const btnW = Math.min(uiPx(140, { max: 140 }), (panel.cardW - 48) / 4 - 6);
    const qualRowY = y + uiPx(22, { min: 18, max: 22 });
    const qualityLabels = { low: 'LOW', medium: 'MED', high: 'HIGH', ultra: 'ULTRA' };
    this.qualityBtns = [];
    VFX_LEVELS.forEach((q, i) => {
      const x = -(VFX_LEVELS.length * (btnW + 8)) / 2 + i * (btnW + 8) + btnW / 2;
      const btn = makeButton(this, frame.cx + x, frame.contentTop + qualRowY, qualityLabels[q], () => {
        this.settings.vfxQuality = q;
        this.refreshQualityButtons();
        this.applyVfxQuality();
        audio.blip(720);
      }, {
        width: btnW,
        height: qualBtnH,
        fontSize: '12px',
        primary: false,
        color: PAL.accent,
        compact: true,
      });
      btn.setDepth(1001);
      this.scrollLayer.add(btn);
      btn.setPosition(x, qualRowY);
      this.qualityBtns.push({ q, btn });
    });
    this.refreshQualityButtons();
    y = qualRowY + qualBtnH / 2 + uiPx(16, { min: 12, max: 20 }) + toggleH / 2;

    const row = (key, label, yy) => {
      const labelText = addScroll(this.add.text(lx, yy, label, {
        ...orbitronStyle(20, '#cfe9ff'),
      }).setOrigin(0, 0.5));
      fitTextWidth(labelText, rowW - uiPx(130, { min: 100, max: 130 }), uiPx(13, { min: 12, max: 16 }));
      const toggle = makeToggle(this, frame.cx + tx, frame.contentTop + yy, this.settings[key], (on) => {
        this.settings[key] = on;
        audio.init();
        if (key === 'sound') { audio.setSoundEnabled(on); audio.blip(720); }
        if (key === 'music') audio.setMusicEnabled(on);
      }, { width: toggleW, height: toggleH, depth: 1001 });
      this.scrollLayer.add(toggle.container);
      toggle.container.setPosition(tx, yy);
    };

    row('sound', 'SOUND FX', y);
    y += rowGap;
    row('music', 'MUSIC', y);
    y += rowGap;

    const volRow = (label, key, yy) => {
      addScroll(this.add.text(lx, yy, label, {
        ...orbitronStyle(18, '#cfe9ff'),
      }).setOrigin(0, 0.5));
      const defaultVol = key === 'musicVolume' ? DEFAULT_MUSIC_VOLUME : DEFAULT_SFX_VOLUME;
      const val = this.settings[key] ?? defaultVol;
      const valText = addScroll(this.add.text(tx, yy, `${val}%`, {
        ...orbitronStyle(18, cssHex(PAL.accent)),
      }).setOrigin(0.5));
      const bump = (delta) => {
        const base = key === 'musicVolume' ? DEFAULT_MUSIC_VOLUME : DEFAULT_SFX_VOLUME;
        this.settings[key] = Math.max(0, Math.min(100, (this.settings[key] ?? base) + delta));
        valText.setText(`${this.settings[key]}%`);
        if (key === 'sfxVolume') audio.setSfxVolume(this.settings[key]);
        if (key === 'musicVolume') {
          audio.setMusicVolume(this.settings[key]);
          this.previewMusicVolume();
        }
        audio.init();
        audio.blip(720);
      };
      const minus = makeButton(this, frame.cx + tx - uiPx(52, { max: 52 }), frame.contentTop + yy, '−', () => bump(-10), {
        width: uiPx(44, { min: 40, max: 44 }), height: uiPx(36, { min: 32, max: 36 }), fontSize: '18px', primary: false, compact: true, depth: 1001,
      });
      this.scrollLayer.add(minus);
      minus.setPosition(tx - uiPx(52, { max: 52 }), yy);
      const plus = makeButton(this, frame.cx + tx + uiPx(52, { max: 52 }), frame.contentTop + yy, '+', () => bump(10), {
        width: uiPx(44, { min: 40, max: 44 }), height: uiPx(36, { min: 32, max: 36 }), fontSize: '18px', primary: false, compact: true, depth: 1001,
      });
      this.scrollLayer.add(plus);
      plus.setPosition(tx + uiPx(52, { max: 52 }), yy);
    };

    volRow('SFX VOLUME', 'sfxVolume', y);
    y += rowGap;
    volRow('MUSIC VOLUME', 'musicVolume', y);
    y += rowGap + uiPx(4, { min: 2, max: 6 });

    this.shopStatus = addScroll(this.add.text(0, y, '', {
      ...orbitronStyle(14, cssHex(PAL.accent2), { align: 'center', wordWrap: { width: frame.wrap } }),
    }).setOrigin(0.5, 0));
    y += uiPx(24, { min: 18, max: 24 });

    const adsRemoved = SaveManager.getRemoveAds() || Monetization.removeAds;
    if (adsRemoved) {
      this.shopStatus.setText('Ads removed — thank you!');
      y += uiPx(28, { min: 22, max: 28 });
    } else if (isIapEnabled() && Monetization.isStoreAvailable()) {
      const removeAdsPrice = Monetization.formatPrice('remove_ads') || '$2.99';
      const removeBtn = makeButton(this, frame.cx, frame.contentTop + y + uiPx(24, { min: 20, max: 24 }), `REMOVE ADS — ${removeAdsPrice}`, () => {
        this.buyRemoveAds();
      }, { width: shopBtnW, height: uiPx(46, { min: 40, max: 48 }), fontSize: '15px', primary: false });
      this.scrollLayer.add(removeBtn);
      removeBtn.setPosition(0, y + uiPx(24, { min: 20, max: 24 }));
      y += uiPx(compact ? 58 : 68, { min: 52, max: 68 });

      const restoreBtn = makeButton(this, frame.cx, frame.contentTop + y + uiPx(20, { min: 16, max: 22 }), 'RESTORE PURCHASES', () => {
        this.restoreStorePurchases();
      }, { width: shopBtnW, height: uiPx(40, { min: 36, max: 44 }), fontSize: '13px', primary: false });
      this.scrollLayer.add(restoreBtn);
      restoreBtn.setPosition(0, y + uiPx(20, { min: 16, max: 22 }));
      y += uiPx(52, { min: 44, max: 56 });

      if (isWebStripeEnabled()) {
        const redeemBtn = makeButton(this, frame.cx, frame.contentTop + y + uiPx(12, { min: 8, max: 14 }), 'REDEEM UNLOCK CODE', () => {
          this.redeemWebUnlockCode();
        }, { width: shopBtnW, height: uiPx(40, { min: 36, max: 44 }), fontSize: '13px', primary: false });
        this.scrollLayer.add(redeemBtn);
        redeemBtn.setPosition(0, y + uiPx(12, { min: 8, max: 14 }));
        y += uiPx(52, { min: 44, max: 56 });
      }
    } else if (isIapEnabled()) {
      this.shopStatus.setText('Store unavailable in this build');
      y += uiPx(22, { min: 18, max: 24 });
    }

    const shopBtn = makeButton(this, frame.cx, frame.contentTop + y + uiPx(22, { min: 18, max: 22 }), 'GARDEN SHOP', () => {
      this.scene.pause(SCENES.SETTINGS);
      this.scene.launch(SCENES.SHOP, { from: SCENES.SETTINGS });
    }, { width: shopBtnW, height: uiPx(44, { min: 40, max: 48 }), fontSize: '15px', primary: false });
    this.scrollLayer.add(shopBtn);
    shopBtn.setPosition(0, y + uiPx(22, { min: 18, max: 22 }));
    y += uiPx(52, { min: 44, max: 56 });

    addScroll(this.add.text(0, y + uiPx(8, { min: 4, max: 8 }), MUSIC_CREDITS, {
      ...orbitronStyle(10, PAL.textMuted, { align: 'center', wordWrap: { width: frame.wrap } }),
    }).setOrigin(0.5, 0).setAlpha(0.7));
    y += uiPx(40, { min: 34, max: 44 });

    const legalY = y + uiPx(6, { min: 4, max: 8 });
    const legalStyle = orbitronStyle(10, PAL.textMuted, { align: 'center' });
    const legalGap = uiPx(12, { min: 10, max: 14 });
    const termsBtn = addScroll(this.add.text(-legalGap, legalY, 'TERMS', legalStyle).setOrigin(1, 0)
      .setInteractive({ useHandCursor: true }));
    const privacyBtn = addScroll(this.add.text(legalGap, legalY, 'PRIVACY', legalStyle).setOrigin(0, 0)
      .setInteractive({ useHandCursor: true }));
    termsBtn.on('pointerup', () => openLegalPage('terms.html'));
    privacyBtn.on('pointerup', () => openLegalPage('privacy.html'));
    y += uiPx(36, { min: 30, max: 40 });

    this.contentHeight = y + 8;
    this.maxScroll = Math.max(0, this.contentHeight - this.contentH);

    const maskGfx = this.make.graphics().setDepth(1000);
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(this.contentLeft, frame.contentTop, this.contentWidth, this.contentH);
    this.scrollLayer.setMask(maskGfx.createGeometryMask());

    this._scroll = attachOverlayScroll(this, {
      left: () => this.contentLeft,
      top: () => this.contentTop,
      width: () => this.contentWidth,
      height: () => this.contentH,
      getScroll: () => this.scrollY,
      setScroll: (v) => {
        this.scrollY = v;
        this.scrollLayer.y = this.contentTop - this.scrollY;
      },
      getMaxScroll: () => this.maxScroll,
    });

    makeButton(this, frame.cx, frame.footerY, 'SAVE & CLOSE', () => this.close(), {
      width: Math.min(frame.btnW, uiPx(340, { max: 360 })),
      height: uiPx(52, { min: 44, max: 56 }),
      fontSize: '18px',
    });

    this.events.once('shutdown', () => this._scroll?.destroy());
  }

  previewMusicVolume() {
    if (!this.settings.music) return;
    audio.applyMusicSettings({ musicVolume: this.settings.musicVolume });
  }

  refreshQualityButtons() {
    this.qualityBtns?.forEach(({ q, btn }) => {
      const active = this.settings.vfxQuality === q;
      btn.setSelected?.(active, active ? PAL.accent : 0x8899aa);
    });
  }

  applyVfxQuality() {
    const resolved = resolveSettings(this.settings);
    this.settings.vfxQuality = resolved.vfxQuality;
    SaveManager.saveSettings(this.settings);

    const sm = this.scene;
    const gameRunning = sm.isActive(SCENES.GAME) || sm.isPaused(SCENES.GAME);
    if (gameRunning) {
      const gameScene = sm.get(SCENES.GAME);
      gameScene.settings = resolved;
      gameScene.syncVfxSettings?.(resolved);
    }

    const menuRunning = sm.isActive(SCENES.MENU) || sm.isPaused(SCENES.MENU);
    if (menuRunning) {
      const menuScene = sm.get(SCENES.MENU);
      menuScene.settings = resolved;
      applySceneVfx(menuScene, resolved);
      menuScene.bg?.applyVfxPreset?.(resolved);
    }
  }

  async buyRemoveAds() {
    this.shopStatus.setText('Opening checkout…');
    this.shopStatus.setColor(cssHex(PAL.accent2));
    const res = await Monetization.purchase('remove_ads');
    if (res?.success) {
      this.shopStatus.setText('Ads removed — thank you!');
      this.shopStatus.setColor(cssHex(PAL.accent2));
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
    if (res?.success && (SaveManager.getRemoveAds() || Monetization.removeAds || MetaProgress.isPremium())) {
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

  async redeemWebUnlockCode() {
    this.shopStatus.setText('Enter your unlock code…');
    this.shopStatus.setColor(cssHex(PAL.accent2));
    const res = await promptUnlockCode();
    if (!res?.success) {
      this.shopStatus.setText(res ? '' : '');
      return;
    }
    if (res.alreadyRedeemed) {
      this.shopStatus.setText('Code already redeemed on this device');
      this.shopStatus.setColor(PAL.textMuted);
      return;
    }
    this.scene.restart({ from: this.from });
  }

  handleBack() {
    this.close();
    return true;
  }

  close() {
    SaveManager.saveSettings(this.settings);
    audio.setSoundEnabled(this.settings.sound);
    audio.setMusicEnabled(this.settings.music);
    audio.setSfxVolume(this.settings.sfxVolume ?? DEFAULT_SFX_VOLUME);
    audio.setMusicVolume(this.settings.musicVolume ?? DEFAULT_MUSIC_VOLUME);
    this.applyVfxQuality();
    const gameScene = this.scene.get(SCENES.GAME);
    if ((this.from === SCENES.GAME || this.from === SCENES.PAUSE) && gameScene?.sys?.isActive?.()) {
      try { gameScene.bg?.applyVfxPreset?.(gameScene.settings); } catch { /* scene tearing down */ }
    }
    if (gameScene?.bus && this.from === SCENES.GAME) {
      gameScene.bus.emit('hud:immersive', { on: true });
    }

    InputRouter.onOverlayClose(SCENES.SETTINGS, this.from === SCENES.GAME || this.from === SCENES.PAUSE);
    this.scene.stop();
    if (this.scene.isSleeping(this.from)) this.scene.wake(this.from);
    else if (this.scene.isPaused(this.from)) this.scene.resume(this.from);
  }
}
