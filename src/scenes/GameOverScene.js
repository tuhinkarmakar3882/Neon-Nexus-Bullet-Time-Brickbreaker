import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { anchorButtonStack, makeResponsiveOverlayPanel } from '../utils/UI.js';
import { Monetization } from '../systems/Monetization.js';
import { isAdSurfaceEnabled } from '../config/AdsConfig.js';
import { InputRouter } from '../systems/InputRouter.js';
import { buildGameOverSharePayload } from '../config/ShareConfig.js';
import { shareProgressScreenshot } from '../systems/ShareProgress.js';
import { MetaProgress } from '../systems/MetaProgress.js';
import { audio } from '../systems/AudioManager.js';
import { fitTextWidth, orbitronStyle, uiPx } from '../utils/Typography.js';
import { exitToHome } from '../shell/routes.js';
import { getGameScene } from '../utils/SceneRefs.js';
import {
  dispatchGameOverOverlayClose,
  dispatchGameOverOverlayOpen,
} from '../shell/gameOverOverlayDom.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SCENES.GAMEOVER);
  }

  init(data) {
    this.data2 = data || {};
  }

  create() {
    InputRouter.onOverlayOpen(SCENES.GAMEOVER);
    this.input.setTopOnly(true);

    const d = this.data2;
    this.gameScene = getGameScene(this);
    this.score = Number(d.score ?? 0) || 0;
    this.highScore = Number(d.highScore ?? this.score) || 0;
    this.isNewBest = d.isNewBest ?? (this.score >= this.highScore && this.score > 0);
    this.message = d.message ?? '';
    this.adsReady = isAdSurfaceEnabled('rewarded') && Monetization.getProviderName() !== 'noop';

    if (GAME.USE_DOM_HUD) {
      this._domGameOver = true;
      dispatchGameOverOverlayOpen({
        score: this.score,
        highScore: this.highScore,
        message: this.message,
        isNewBest: this.isNewBest,
        adsReady: this.adsReady,
        level: this.gameScene?.level ?? 1,
        lives: this.gameScene?.lives ?? 0,
      });
      this.events.once('shutdown', () => dispatchGameOverOverlayClose());
      this.input.keyboard.on('keydown-ESC', () => this.handleBack());
      return;
    }

    this.buildPhaserUI();
    this.input.keyboard.on('keydown-ESC', () => this.handleBack());
  }

  closeOverlay(andThen) {
    InputRouter.onOverlayClose(SCENES.GAMEOVER, false);
    this.scene.stop();
    andThen?.();
  }

  async videoContinue() {
    if (this._continuing) return '';
    this._continuing = true;
    try {
      const { granted, bypassed } = await Monetization.offerRewardedContinueWithBypass();
      if (granted) {
        const msg = bypassed && this.adsReady
          ? 'Video unavailable — continuing your run…'
          : '';
        this.closeOverlay(() => this.gameScene?.doVideoContinue?.());
        return msg;
      }
    } catch {
      /* fall through */
    } finally {
      this._continuing = false;
    }
    audio.blip(220);
    return 'Could not continue — tap again or restart';
  }

  restart() {
    this.closeOverlay(() => this.gameScene?.doRestart?.());
  }

  mainMenu() {
    this.handleBack();
  }

  async shareProgress(override = {}) {
    const game = this.gameScene;
    const d = this.data2 ?? {};
    const score = Number(override.score ?? this.score ?? d.score ?? game?.score ?? 0) || 0;
    const highScore = Number(override.highScore ?? this.highScore ?? d.highScore ?? score) || 0;
    const isNewBest = override.isNewBest ?? this.isNewBest ?? (score >= highScore && score > 0);
    const level = override.level ?? game?.level ?? 1;
    const lives = override.lives ?? game?.lives ?? 0;
    const res = await shareProgressScreenshot(this.game, buildGameOverSharePayload({
      score,
      highScore,
      isNewBest,
      level,
      lives,
      gems: MetaProgress.getGems(),
      treasury: MetaProgress.getTreasury(),
    }));
    if (res.ok) {
      if (res.method === 'download+clipboard') return 'Saved — share text copied.';
      if (res.method === 'download') return 'Share card saved.';
      return 'Shared successfully.';
    }
    return 'Share cancelled';
  }

  buildPhaserUI() {
    const d = this.data2;
    const panel = makeResponsiveOverlayPanel(this, { dimAlpha: 0.88, maxCardW: 640 });
    const score = this.score;
    const highScore = this.highScore;
    const isNewBest = this.isNewBest;
    const adsReady = this.adsReady;

    const { frame, stackTop } = anchorButtonStack(this, panel, [
      {
        label: adsReady ? 'WATCH VIDEO & CONTINUE' : 'CONTINUE',
        fontSize: '14px',
        color: PAL.accent2,
        onClick: async () => {
          this.statusText.setText(adsReady ? 'Loading video…' : '');
          const msg = await this.videoContinue();
          if (msg && !this._domGameOver) this.statusText.setText(msg);
        },
      },
      {
        label: 'RESTART', primary: false, fontSize: '14px',
        onClick: () => this.restart(),
      },
      {
        label: 'MAIN MENU', primary: false, fontSize: '14px', color: 0x8b9bb4,
        onClick: () => this.mainMenu(),
      },
      {
        label: 'SHARE PROGRESS', primary: false, fontSize: '13px', color: PAL.accent3,
        onClick: async () => {
          this.statusText.setText('Preparing share card…');
          const msg = await this.shareProgress();
          this.statusText.setText(msg);
        },
      },
    ]);

    let y = frame.titleY;
    const title = this.add.text(frame.cx, y, 'GAME OVER', {
      ...orbitronStyle(40, '#ff3b5c', { fontStyle: '900', align: 'center' }),
    }).setOrigin(0.5, 0).setDepth(1001).setShadow(0, 0, '#ff3b5c', 18, true, true);
    fitTextWidth(title, frame.wrap, uiPx(26, { min: 22, max: 32 }));
    y += uiPx(48, { min: 40, max: 52 });

    if (d.message) {
      const msg = this.add.text(frame.cx, y, d.message, {
        ...orbitronStyle(14, PAL.textMuted, { align: 'center', wordWrap: { width: frame.wrap } }),
      }).setOrigin(0.5, 0).setDepth(1001);
      fitTextWidth(msg, frame.wrap, uiPx(12, { min: 11, max: 14 }));
      y += msg.height + uiPx(8, { min: 6, max: 10 });
    }

    const scoreText = this.add.text(frame.cx, y, `SCORE  ${score.toLocaleString()}`, {
      ...orbitronStyle(26, cssHex(PAL.accent), { fontStyle: 'bold', align: 'center' }),
    }).setOrigin(0.5, 0).setDepth(1001);
    fitTextWidth(scoreText, frame.wrap, uiPx(18, { min: 16, max: 22 }));
    y += uiPx(28, { min: 24, max: 32 });

    this.add.text(frame.cx, y, `PERSONAL BEST  ${highScore.toLocaleString()}`, {
      ...orbitronStyle(16, PAL.textMuted, { align: 'center' }),
    }).setOrigin(0.5, 0).setDepth(1001);
    y += uiPx(22, { min: 18, max: 26 });

    if (isNewBest) {
      this.add.text(frame.cx, y, 'NEW PERSONAL BEST', {
        ...orbitronStyle(14, cssHex(PAL.accent3), { fontStyle: '900', align: 'center' }),
      }).setOrigin(0.5, 0).setDepth(1001);
      y += uiPx(20, { min: 16, max: 24 });
    }

    const statusY = Math.min(y + uiPx(8, { min: 4, max: 10 }), stackTop - uiPx(28, { min: 22, max: 32 }));
    this.statusText = this.add.text(frame.cx, statusY, '', {
      ...orbitronStyle(12, cssHex(PAL.accent3), { align: 'center', wordWrap: { width: frame.wrap } }),
    }).setOrigin(0.5, 0).setDepth(1001);
  }

  handleBack() {
    InputRouter.onOverlayClose(SCENES.GAMEOVER, false);
    this.scene.stop(SCENES.UI);
    this.scene.stop(SCENES.GAME);
    this.scene.stop();
    exitToHome();
    return true;
  }
}
