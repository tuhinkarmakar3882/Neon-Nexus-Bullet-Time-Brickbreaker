import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { Background } from '../objects/Background.js';
import { makeButton, makeOverlayPanel, staggerButtons, addCameraFx } from '../utils/UI.js';
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

export class MenuScene extends Phaser.Scene {
  constructor() { super(SCENES.MENU); }

  create() {
    this.game.scale.refresh();
    syncSceneCameras(this.game);
    const W = GAME.WIDTH;
    const H = GAME.HEIGHT;
    const settings = resolveSettings(SaveManager.loadSettings());
    addCameraFx(this, { bloom: settings.bloom, scanlines: settings.scanlines });
    this.bg = new Background(this, PAL.accent);
    const cx = W / 2;
    const panel = makeOverlayPanel(this, { gameW: W, gameH: H, cardW: Math.min(W * 0.88, 720), cardH: H * 0.78 });

    const titleSize = clamp(Math.round(W * 0.074), 48, 110);
    const title = this.add.text(cx, H * 0.16, 'NEON NEXUS', {
      fontFamily: 'Orbitron, monospace', fontSize: titleSize + 'px', fontStyle: '900', color: cssHex(PAL.accent), align: 'center',
    }).setOrigin(0.5).setDepth(1001);
    title.setShadow(0, 0, cssHex(PAL.accent), 22, true, true);

    this.add.text(cx, H * 0.235, 'J A R D I N A I N S !   G A R D E N   S I E G E', {
      fontFamily: 'Syne, Orbitron, monospace', fontSize: clamp(Math.round(W * 0.024), 14, 28) + 'px', fontStyle: '700', color: cssHex(PAL.accent2),
    }).setOrigin(0.5).setDepth(1001).setShadow(0, 0, cssHex(PAL.accent2), 14, true, true);

    const pad = 14 + GAME.SAFE_TOP;
    this.add.text(W - pad - GAME.SAFE_RIGHT, pad, `💎 ${MetaProgress.getGems().toLocaleString()}`, {
      fontFamily: 'Orbitron, monospace',
      fontSize: clamp(Math.round(W * 0.034), 16, 24) + 'px',
      fontStyle: '800',
      color: cssHex(PAL.accent2),
    }).setOrigin(1, 0).setDepth(1001).setShadow(0, 0, cssHex(PAL.accent2), 10, true, true);

    this.add.text(cx, H * 0.285, `HIGH SCORE  ${SaveManager.getHighScore().toLocaleString()}`, {
      fontFamily: 'Orbitron, monospace', fontSize: '18px', color: PAL.text,
    }).setOrigin(0.5).setAlpha(0.8).setDepth(1001);

    this.snapshot = RunPersistence.loadRun();
    this.buttons = [];

    let y = H * 0.36;
    if (this.snapshot) {
      this.add.text(cx, y, `Level ${this.snapshot.level}  ·  ${this.snapshot.score.toLocaleString()} pts  ·  ${this.snapshot.lives} lives`, {
        fontFamily: 'Orbitron, monospace', fontSize: '18px', color: cssHex(PAL.accent3),
      }).setOrigin(0.5).setDepth(1001);
      y += 0.08 * H;
      this.buttons.push(makeButton(this, cx, y, 'RESUME', () => this.resumeGame(), { width: 340, height: 72, fontSize: '32px', color: PAL.accent }));
      y += 0.09 * H;
      this.buttons.push(makeButton(this, cx, y, 'NEW GAME', () => this.startNewGame(), { width: 340, height: 60, primary: false, fontSize: '24px' }));
    } else {
      this.buttons.push(makeButton(this, cx, y + 0.04 * H, 'PLAY', () => this.startNewGame(), { width: 340, height: 80, fontSize: '36px', color: PAL.accent }));
      y += 0.14 * H;
    }

    if (!this.snapshot) y = H * 0.52;
    else y += 0.1 * H;

    this.buttons.push(makeButton(this, cx, y, 'CODEX', () => this.openCodex(), { width: 340, height: 56, primary: false, fontSize: '20px' }));
    y += 0.085 * H;
    this.buttons.push(makeButton(this, cx, y, 'SHOP', () => this.openShop(), { width: 340, height: 56, primary: false, fontSize: '20px', color: PAL.accent3 }));
    y += 0.085 * H;
    this.buttons.push(makeButton(this, cx, y, 'SETTINGS', () => this.openSettings(), { width: 340, height: 56, primary: false, color: PAL.accent, fontSize: '22px' }));
    y += 0.085 * H;
    this.buttons.push(makeButton(this, cx, y, '📸 SHARE PROGRESS', async () => {
      this.shareHint?.setText('Preparing screenshot…');
      const snap = RunPersistence.loadRun();
      const highScore = SaveManager.getHighScore();
      const gems = MetaProgress.getGems();
      const res = await shareProgressScreenshot(this.game, {
        kind: 'progress',
        shareData: {
          gems,
          highScore,
          runLevel: snap?.level,
          runScore: snap?.score,
        },
        badge: snap ? `LEVEL ${snap.level} RUN` : 'GARDEN SIEGE',
        badgeColor: '#9b8cff',
        heroStat: `${gems.toLocaleString()} 💎 GEMS`,
        line2: `${highScore.toLocaleString()} HIGH SCORE`,
        line3: snap ? `Run · ${snap.score.toLocaleString()} pts` : 'Can you beat my garden?',
      });
      this.shareHint?.setText(res.ok
        ? (res.method === 'download+clipboard' ? 'Saved! Message copied to clipboard.' : res.method === 'download' ? 'Screenshot saved!' : 'Shared!')
        : 'Share cancelled');
    }, { width: 340, height: 52, primary: false, fontSize: '18px', color: PAL.accent3 }));
    this.shareHint = this.add.text(cx, y + 36, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '13px', color: PAL.textMuted,
    }).setOrigin(0.5).setDepth(1001);
    staggerButtons(this, this.buttons);

    const hint = this.add.text(cx, H * 0.88, 'Double-tap in-game: spend Nexus meter  ·  Full meter: Nexus Burst', {
      fontFamily: 'Orbitron, monospace', fontSize: '14px', color: PAL.textMuted, align: 'center', wordWrap: { width: W * 0.9 },
    }).setOrigin(0.5).setAlpha(0.75).setDepth(1001);

    this.add.text(cx, H - 36, 'Made with ♥ by Tuhin Karmakar', {
      fontFamily: 'Orbitron, monospace', fontSize: '14px', color: '#5f7088',
    }).setOrigin(0.5).setDepth(1001);

    this.tweens.add({ targets: title, scaleX: 1.025, scaleY: 1.025, yoyo: true, repeat: -1, duration: 2000, ease: 'Sine.easeInOut' });
    Monetization.showBanner();
    this.events.once('shutdown', () => Monetization.hideBanner());
    this.input.once('pointerdown', () => this.unlockAudio());
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
