import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { Background } from '../objects/Background.js';
import { makeButton, makeOverlayPanel, layoutButtonStack, staggerButtons, addCameraFx } from '../utils/UI.js';
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
    addCameraFx(this, { bloom: settings.bloom, scanlines: settings.scanlines });
    this.bg = new Background(this, PAL.accent);

    const cx = W / 2;
    const bottomPad = GAME.SAFE_BOTTOM + AD_BANNER_H + 12;
    const topPad = GAME.SAFE_TOP + 8;
    const panel = makeOverlayPanel(this, {
      gameW: W,
      gameH: H,
      cardW: Math.min(W * 0.92, 720),
      cardH: H - topPad - bottomPad,
      y: topPad + (H - topPad - bottomPad) / 2,
    });

    const cardTop = panel.cy - panel.cardH / 2;
    const btnW = Math.min(W * 0.84, 340);
    const gap = portrait ? 10 : 14;
    let y = cardTop + (portrait ? 28 : 36);

    const titleSize = clamp(Math.round(W * (portrait ? 0.056 : 0.074)), 34, 110);
    const title = this.add.text(cx, y, 'NEON NEXUS', {
      fontFamily: 'Orbitron, monospace', fontSize: titleSize + 'px', fontStyle: '900', color: cssHex(PAL.accent), align: 'center',
    }).setOrigin(0.5, 0).setDepth(1001);
    title.setShadow(0, 0, cssHex(PAL.accent), 22, true, true);
    y += titleSize + (portrait ? 6 : 10);

    const subSize = clamp(Math.round(W * 0.022), 11, 22);
    this.add.text(cx, y, 'JARDINAINS!  GARDEN SIEGE', {
      fontFamily: 'Syne, Orbitron, monospace',
      fontSize: subSize + 'px',
      fontStyle: '700',
      color: cssHex(PAL.accent2),
      align: 'center',
      wordWrap: { width: panel.cardW - 32 },
    }).setOrigin(0.5, 0).setDepth(1001).setShadow(0, 0, cssHex(PAL.accent2), 14, true, true);
    y += subSize * (portrait ? 2.4 : 2) + 8;

    const gems = MetaProgress.getGems();
    const highScore = SaveManager.getHighScore();
    this.add.text(cx, y, `HIGH SCORE  ${highScore.toLocaleString()}  ·  💎 ${gems.toLocaleString()}`, {
      fontFamily: 'Orbitron, monospace',
      fontSize: portrait ? '13px' : '16px',
      color: PAL.text,
      align: 'center',
      wordWrap: { width: panel.cardW - 24 },
    }).setOrigin(0.5, 0).setAlpha(0.85).setDepth(1001);
    y += portrait ? 28 : 32;

    this.snapshot = RunPersistence.loadRun();
    if (this.snapshot) {
      this.add.text(cx, y, `Level ${this.snapshot.level}  ·  ${this.snapshot.score.toLocaleString()} pts  ·  ${this.snapshot.lives} lives`, {
        fontFamily: 'Orbitron, monospace',
        fontSize: portrait ? '14px' : '17px',
        color: cssHex(PAL.accent3),
        align: 'center',
        wordWrap: { width: panel.cardW - 24 },
      }).setOrigin(0.5, 0).setDepth(1001);
      y += portrait ? 26 : 30;
    }

    const btnPrimary = portrait ? 58 : 72;
    const btnSecondary = portrait ? 46 : 56;
    const btnShare = portrait ? 44 : 50;

    const items = [];
    if (this.snapshot) {
      items.push({
        label: 'RESUME',
        onClick: () => this.resumeGame(),
        height: btnPrimary,
        fontSize: portrait ? '26px' : '32px',
        color: PAL.accent,
      });
      items.push({
        label: 'NEW GAME',
        onClick: () => this.startNewGame(),
        height: btnSecondary,
        fontSize: portrait ? '20px' : '24px',
        primary: false,
      });
    } else {
      items.push({
        label: 'PLAY',
        onClick: () => this.startNewGame(),
        height: btnPrimary + 6,
        fontSize: portrait ? '30px' : '36px',
        color: PAL.accent,
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
    );

    const stackStart = y + 6;
    const maxBottom = H - bottomPad - 52;
    this.buttons = layoutButtonStack(this, panel, items, {
      gap,
      width: btnW,
      startY: stackStart,
      maxBottom,
    });

    const lastBtn = this.buttons[this.buttons.length - 1];
    this.shareHint = this.add.text(cx, lastBtn.y + btnShare / 2 + 10, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '11px', color: PAL.textMuted, align: 'center',
      wordWrap: { width: btnW },
    }).setOrigin(0.5, 0).setDepth(1001);

    const hintY = H - bottomPad - 38;
    const hintMinY = lastBtn.y + btnShare / 2 + 28;
    if (hintY > hintMinY) {
      this.add.text(cx, hintY, 'Double-tap in-game: spend Nexus  ·  Full meter: Nexus Burst', {
        fontFamily: 'Orbitron, monospace',
        fontSize: portrait ? '10px' : '12px',
        color: PAL.textMuted,
        align: 'center',
        wordWrap: { width: W * 0.88 },
      }).setOrigin(0.5).setAlpha(0.65).setDepth(1001);
    }

    this.add.text(cx, H - bottomPad - 14, 'Made with ♥ by Tuhin Karmakar', {
      fontFamily: 'Orbitron, monospace', fontSize: portrait ? '10px' : '12px', color: '#5f7088',
    }).setOrigin(0.5, 1).setDepth(1001);

    staggerButtons(this, this.buttons);
    this.tweens.add({ targets: title, scaleX: 1.025, scaleY: 1.025, yoyo: true, repeat: -1, duration: 2000, ease: 'Sine.easeInOut' });
    Monetization.showBanner();
    this.events.once('shutdown', () => Monetization.hideBanner());
    this.input.once('pointerdown', () => this.unlockAudio());
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
    audio.setSfxVolume(s.sfxVolume ?? 100); audio.setMusicVolume(s.musicVolume ?? 100);
    audio.setMenuMusic();
  }

  startNewGame() {
    RunPersistence.clearRun();
    this.startGame(null, { newGame: true });
  }

  startGame(resume = null, extra = {}) {
    this.unlockAudio();
    requestGameFullscreen();
    this.cameras.main.fadeOut(280, 255, 255, 255);
    this.cameras.main.once('camerafadeoutcomplete', () => {
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
