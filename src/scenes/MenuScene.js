import Phaser from 'phaser';
import { GAME, SCENES, DEFAULT_MUSIC_VOLUME, DEFAULT_SFX_VOLUME } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { Background } from '../objects/Background.js';
import { makeButton, makeResponsiveOverlayPanel, layoutButtonStack, staggerButtons, addCameraFx } from '../utils/UI.js';
import { audio } from '../systems/AudioManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { RunPersistence } from '../systems/RunPersistence.js';
import { MetaProgress } from '../systems/MetaProgress.js';
import { Monetization } from '../systems/Monetization.js';
import { clamp } from '../utils/Helpers.js';
import { syncSceneCameras } from '../systems/LayoutManager.js';
import { requestGameFullscreen } from '../systems/Fullscreen.js';
import { resolveSettings } from '../config/VfxQuality.js';
import { shareProgressScreenshot } from '../systems/ShareProgress.js';
import { displayStyle, bodyStyle, orbitronStyle, uiPx, wrapWidth } from '../utils/Typography.js';
import { canOfferInstall, onInstallPromptReady, triggerInstallPrompt } from '../systems/InstallPrompt.js';
import { APP_VERSION, BUILD_STAMP } from '../config/Version.js';

const AD_BANNER_H = 50;

export class MenuScene extends Phaser.Scene {
  constructor() { super(SCENES.MENU); }

  create() {
    this.game.scale.refresh();
    syncSceneCameras(this.game);
    const W = GAME.WIDTH;
    const H = GAME.HEIGHT;
    const portrait = GAME.IS_PORTRAIT;
    const settings = resolveSettings(SaveManager.loadSettings());
    addCameraFx(this, settings);
    this.bg = new Background(this, PAL.accent, { preset: settings });

    const cx = W / 2;
    const bottomPad = GAME.SAFE_BOTTOM + AD_BANNER_H + 12;
    const topPad = GAME.SAFE_TOP + 8;
    const usableH = H - topPad - bottomPad;
    const panel = makeResponsiveOverlayPanel(this, {
      maxCardW: 720,
      cardH: usableH,
      heightRatio: 1,
      y: topPad + usableH / 2,
    });

    const cardTop = panel.cy - panel.cardH / 2;
    const btnW = Math.min(W * 0.84, 340);
    const gap = portrait ? 10 : 14;
    let y = cardTop + (portrait ? 28 : 36);

    const titleSize = clamp(Math.round(W * (portrait ? 0.056 : 0.074)), 34, 110);
    const title = this.add.text(cx, y, 'NEON NEXUS', {
      ...displayStyle(titleSize, cssHex(PAL.accent), { fontStyle: '700', align: 'center' }),
    }).setOrigin(0.5, 0).setDepth(1001);
    title.setShadow(0, 0, cssHex(PAL.accent), 22, true, true);
    y += titleSize + (portrait ? 6 : 10);

    const subSize = clamp(Math.round(W * 0.022), 11, 22);
    this.add.text(cx, y, 'JARDINAINS!  GARDEN SIEGE', {
      ...bodyStyle(subSize, cssHex(PAL.accent2), {
        fontStyle: '600',
        letterSpacing: '0.14em',
        align: 'center',
        wordWrap: { width: panel.cardW - 32 },
      }),
    }).setOrigin(0.5, 0).setDepth(1001).setShadow(0, 0, cssHex(PAL.accent2), 14, true, true);
    y += subSize * (portrait ? 2.4 : 2) + 8;

    const gems = MetaProgress.getGems();
    const highScore = SaveManager.getHighScore();
    this.add.text(cx, y, `HIGH SCORE  ${highScore.toLocaleString()}  ·  💎 ${gems.toLocaleString()}`, {
      ...orbitronStyle(16, PAL.text, { align: 'center', wordWrap: { width: panel.cardW - 24 } }),
    }).setOrigin(0.5, 0).setAlpha(0.85).setDepth(1001);
    y += uiPx(portrait ? 28 : 32, { min: 24, max: 32 });

    this.snapshot = RunPersistence.loadRun();
    if (this.snapshot) {
      this.add.text(cx, y, `Level ${this.snapshot.level}  ·  ${this.snapshot.score.toLocaleString()} pts  ·  ${this.snapshot.lives} lives`, {
        ...orbitronStyle(17, cssHex(PAL.accent3), { align: 'center', wordWrap: { width: panel.cardW - 24 } }),
      }).setOrigin(0.5, 0).setDepth(1001);
      y += uiPx(portrait ? 26 : 30, { min: 22, max: 30 });
    }

    const btnPrimary = uiPx(portrait ? 58 : 72, { min: 48, max: 72 });
    const btnSecondary = uiPx(portrait ? 46 : 56, { min: 40, max: 56 });
    const btnShare = uiPx(portrait ? 44 : 50, { min: 40, max: 50 });

    const items = [];
    if (this.snapshot) {
      items.push({
        label: 'RESUME',
        onClick: () => this.resumeGame(),
        height: btnPrimary,
        fontSize: portrait ? '26px' : '32px',
        color: PAL.accent,
        activateOnDown: true,
      });
      items.push({
        label: 'NEW GAME',
        onClick: () => this.startNewGame(),
        height: btnSecondary,
        fontSize: portrait ? '20px' : '24px',
        primary: false,
        activateOnDown: true,
      });
    } else {
      items.push({
        label: 'PLAY',
        onClick: () => this.startNewGame(),
        height: btnPrimary + 6,
        fontSize: portrait ? '30px' : '36px',
        color: PAL.accent,
        activateOnDown: true,
      });
    }

    items.push(
      { label: 'CODEX', onClick: () => this.openCodex(), height: btnSecondary, fontSize: portrait ? '17px' : '20px', primary: false },
      { label: 'SHOP', onClick: () => this.openShop(), height: btnSecondary, fontSize: portrait ? '17px' : '20px', primary: false, color: PAL.accent3 },
      { label: 'SETTINGS', onClick: () => this.openSettings(), height: btnSecondary, fontSize: portrait ? '18px' : '22px', primary: false, color: PAL.accent },
      {
        label: '📸 SHARE PROGRESS',
        onClick: () => this.shareProgress(),
        height: btnShare,
        fontSize: portrait ? '15px' : '17px',
        primary: false,
        color: PAL.accent3,
      },
      {
        label: 'CONNECT WITH ME',
        onClick: () => {
          if (typeof window !== 'undefined') {
            window.open('https://www.linkedin.com/in/tuhinkarmakar3882/', '_blank', 'noopener,noreferrer');
          }
        },
        height: btnShare,
        fontSize: portrait ? '15px' : '17px',
        primary: false,
        color: PAL.accent2,
      },
    );

    if (canOfferInstall()) {
      items.splice(items.length - 1, 0, {
        label: '⬇ INSTALL APP',
        onClick: () => this.runInstallPrompt(),
        height: btnShare,
        fontSize: portrait ? '14px' : '15px',
        primary: false,
        color: PAL.accent3,
      });
    }

    const stackStart = y + 6;
    const footerLineH = uiPx(15, { min: 13, max: 16 });
    const footerPad = uiPx(10, { min: 8, max: 12 });
    const showGameplayTip = !portrait;
    const footerStackH = footerPad + footerLineH * (showGameplayTip ? 3 : 2) + uiPx(6, { min: 4, max: 8 });
    const maxBottom = H - bottomPad - footerStackH;
    this.buttons = layoutButtonStack(this, panel, items, {
      gap,
      width: btnW,
      startY: stackStart,
      maxBottom,
    });

    const lastBtn = this.buttons[this.buttons.length - 1];
    const shareHintY = Math.min(
      lastBtn.y + btnShare / 2 + uiPx(10, { min: 8, max: 12 }),
      maxBottom - uiPx(18, { min: 14, max: 18 }),
    );
    this.shareHint = this.add.text(cx, shareHintY, '', {
      ...orbitronStyle(11, PAL.textMuted, { align: 'center', wordWrap: { width: btnW } }),
    }).setOrigin(0.5, 0).setDepth(1001);

    let footY = H - bottomPad - footerPad;
    this.add.text(cx, footY, `v${APP_VERSION} · ${BUILD_STAMP}`, {
      ...orbitronStyle(10, '#4a5a70', { align: 'center' }),
    }).setOrigin(0.5, 1).setDepth(1001);
    footY -= footerLineH;

    this.add.text(cx, footY, 'Made with ♥ by Tuhin Karmakar', {
      ...orbitronStyle(11, '#5f7088', { align: 'center' }),
    }).setOrigin(0.5, 1).setDepth(1001);
    footY -= footerLineH;

    if (showGameplayTip && footY - footerLineH > lastBtn.y + btnShare / 2 + uiPx(8)) {
      this.add.text(cx, footY, 'Tip: Nexus meter · Full meter = Burst', {
        ...orbitronStyle(11, PAL.textMuted, { align: 'center', wordWrap: { width: wrapWidth(0.9) } }),
      }).setOrigin(0.5, 1).setAlpha(0.65).setDepth(1001);
    }

    this._setupInstallPromptListener();

    staggerButtons(this, this.buttons);
    this.tweens.add({ targets: title, scaleX: 1.025, scaleY: 1.025, yoyo: true, repeat: -1, duration: 2000, ease: 'Sine.easeInOut' });
    Monetization.showBanner();
    this.events.once('shutdown', () => {
      this._launchingGame = false;
      Monetization.hideBanner();
    });
    this.input.once('pointerdown', () => this.unlockAudio());
  }

  _setupInstallPromptListener() {
    if (typeof window === 'undefined') return;
    this._offInstallReady = onInstallPromptReady((ev) => {
      if (ev && canOfferInstall() && this.scene.isActive()) this.scene.restart();
    });
    this.events.once('shutdown', () => {
      this._offInstallReady?.();
    });
  }

  async runInstallPrompt() {
    const { outcome } = await triggerInstallPrompt();
    if (outcome === 'accepted') {
      this.shareHint?.setText('App installed — enjoy!');
    } else if (outcome === 'unavailable') {
      this.shareHint?.setText('Install unavailable — use browser menu → Add to Home Screen');
    }
  }

  async shareProgress() {
    this.shareHint?.setText('Preparing screenshot…');
    const snap = RunPersistence.loadRun();
    const highScore = SaveManager.getHighScore();
    const gems = MetaProgress.getGems();
    const res = await shareProgressScreenshot(this.game, {
      kind: 'progress',
      shareData: { gems, highScore, runLevel: snap?.level, runScore: snap?.score },
      badge: snap ? `LEVEL ${snap.level} RUN` : 'GARDEN SIEGE',
      badgeColor: '#9b8cff',
      heroStat: `${gems.toLocaleString()} 💎 GEMS`,
      line2: `${highScore.toLocaleString()} HIGH SCORE`,
      line3: snap ? `Run · ${snap.score.toLocaleString()} pts` : 'Can you beat my garden?',
    });
    this.shareHint?.setText(res.ok
      ? (res.method === 'download+clipboard' ? 'Saved! Message copied to clipboard.' : res.method === 'download' ? 'Screenshot saved!' : 'Shared!')
      : 'Share cancelled');
  }

  unlockAudio() {
    audio.init(); audio.resume();
    const s = SaveManager.loadSettings();
    audio.setSoundEnabled(s.sound); audio.setMusicEnabled(s.music);
    audio.setSfxVolume(s.sfxVolume ?? DEFAULT_SFX_VOLUME);
    audio.setMusicVolume(s.musicVolume ?? DEFAULT_MUSIC_VOLUME);
    audio.applyMusicSettings({ musicVolume: s.musicVolume });
    audio.setMenuMusic();
  }

  startNewGame() {
    RunPersistence.clearRun();
    this.startGame(null, { newGame: true });
  }

  startGame(resume = null, extra = {}) {
    if (this._launchingGame) return;
    this._launchingGame = true;
    this.unlockAudio();
    requestGameFullscreen();
    this.cameras.main.fadeOut(280, 255, 255, 255);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this._launchingGame = false;
      if (resume) this.scene.start(SCENES.GAME, { resume });
      else this.scene.start(SCENES.GAME, { newGame: true, ...extra });
    });
  }

  resumeGame() { this.startGame(this.snapshot); }

  openCodex() {
    this.scene.launch(SCENES.CODEX, { from: SCENES.MENU });
    this.scene.pause();
  }

  openShop() {
    this.scene.launch(SCENES.SHOP, { from: SCENES.MENU });
    this.scene.pause();
  }

  relayout() { this.bg?.relayout?.(); }

  openSettings() {
    this.scene.launch(SCENES.SETTINGS, { from: SCENES.MENU });
    this.scene.pause();
  }

  update(time, delta) { this.bg.update(delta / 1000); }
}
