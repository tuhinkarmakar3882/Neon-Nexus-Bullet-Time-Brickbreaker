import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { VFX_LEVELS, resolveSettings } from '../config/VfxQuality.js';
import { makeButton, makeOverlayPanel, makeToggle } from '../utils/UI.js';
import { SaveManager } from '../systems/SaveManager.js';
import { Monetization } from '../systems/Monetization.js';
import { audio } from '../systems/AudioManager.js';
import { InputRouter } from '../systems/InputRouter.js';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super(SCENES.SETTINGS);
  }

  init(data) {
    this.from = data?.from ?? SCENES.MENU;
  }

  create() {
    InputRouter.onOverlayOpen(SCENES.SETTINGS);
    this.input.setTopOnly(true);
    this.game.scale.refresh();
    const W = GAME.WIDTH;
    const H = GAME.HEIGHT;
    const panel = makeOverlayPanel(this, { gameW: W, gameH: H, cardH: H * 0.82 });

    this.add.text(panel.cx, panel.cy - panel.cardH / 2 + 52, 'SETTINGS', {
      fontFamily: 'Orbitron, monospace', fontSize: '52px', fontStyle: '900', color: cssHex(PAL.accent),
    }).setOrigin(0.5).setDepth(1001).setShadow(0, 0, cssHex(PAL.accent), 16, true, true);

    this.settings = SaveManager.loadSettings();
    let y = panel.cy - panel.cardH / 2 + 118;

    this.add.text(panel.cx, y, 'VFX QUALITY', {
      fontFamily: 'Orbitron, monospace', fontSize: '14px', color: PAL.textMuted, letterSpacing: '0.18em',
    }).setOrigin(0.5).setDepth(1001);
    y += 28;

    const btnW = Math.min(150, (panel.cardW - 48) / 4 - 6);
    const qualityLabels = { low: 'LOW', medium: 'MED', high: 'HIGH', ultra: 'ULTRA' };
    this.qualityBtns = [];
    VFX_LEVELS.forEach((q, i) => {
      const x = panel.cx - (VFX_LEVELS.length * (btnW + 8)) / 2 + i * (btnW + 8) + btnW / 2;
      const btn = makeButton(this, x, y + 24, qualityLabels[q], () => {
        this.settings.vfxQuality = q;
        this.refreshQualityButtons();
        audio.blip(720);
      }, {
        width: btnW,
        height: 44,
        fontSize: '13px',
        primary: this.settings.vfxQuality === q,
        color: this.settings.vfxQuality === q ? PAL.accent : 0x667788,
      });
      btn.setDepth(1001);
      this.qualityBtns.push({ q, btn });
    });
    y += 72;

    const row = (key, label, yy) => {
      this.add.text(W / 2 - 220, yy, label, {
        fontFamily: 'Orbitron, monospace', fontSize: '24px', color: '#cfe9ff',
      }).setOrigin(0, 0.5).setDepth(1001);
      makeToggle(this, W / 2 + 210, yy, this.settings[key], (on) => {
        this.settings[key] = on;
        audio.init();
        if (key === 'sound') { audio.setSoundEnabled(on); audio.blip(720); }
        if (key === 'music') audio.setMusicEnabled(on);
      });
    };

    row('sound', 'SOUND FX', y);
    y += 56;
    row('music', 'MUSIC', y);
    y += 64;

    this.shopStatus = this.add.text(W / 2, y, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '16px', color: cssHex(PAL.accent2), align: 'center', wordWrap: { width: W * 0.8 },
    }).setOrigin(0.5).setDepth(1001);

    const adsRemoved = SaveManager.getRemoveAds() || Monetization.removeAds;
    if (adsRemoved) {
      this.shopStatus.setText('Ads removed — thank you!');
      y += 36;
    } else {
      makeButton(this, W / 2, y + 28, 'REMOVE ADS — $2.99', async () => {
        this.shopStatus.setText('Processing…');
        const res = await Monetization.purchase('remove_ads');
        if (res?.success) {
          SaveManager.setRemoveAds(true);
          Monetization.removeAds = true;
          this.shopStatus.setText('Ads removed — thank you!');
        } else {
          this.shopStatus.setText('Store unavailable in demo build');
        }
      }, { width: 420, height: 52, fontSize: '18px', primary: false });
      y += 72;
    }

    makeButton(this, W / 2, y, 'GARDEN SHOP', () => {
      this.scene.pause(SCENES.SETTINGS);
      this.scene.launch(SCENES.SHOP, { from: SCENES.SETTINGS });
    }, { width: 420, height: 48, fontSize: '18px', primary: false });

    makeButton(this, panel.cx, panel.cy + panel.cardH / 2 - 48, 'SAVE & CLOSE', () => this.close(), {
      width: 360, height: 64, fontSize: '26px',
    });
  }

  refreshQualityButtons() {
    this.qualityBtns?.forEach(({ q, btn }) => {
      const active = this.settings.vfxQuality === q;
      btn.setAlpha(active ? 1 : 0.75);
    });
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