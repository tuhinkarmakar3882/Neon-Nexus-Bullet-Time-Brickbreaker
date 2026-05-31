import Phaser from 'phaser';
import { SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { anchorButtonStack, makeResponsiveOverlayPanel } from '../utils/UI.js';
import { Monetization } from '../systems/Monetization.js';
import { isAdSurfaceEnabled } from '../config/AdsConfig.js';
import { InputRouter } from '../systems/InputRouter.js';
import { shareProgressScreenshot } from '../systems/ShareProgress.js';
import { MetaProgress } from '../systems/MetaProgress.js';
import { audio } from '../systems/AudioManager.js';
import { fitTextWidth, orbitronStyle, uiPx } from '../utils/Typography.js';

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
    const panel = makeResponsiveOverlayPanel(this, { dimAlpha: 0.88, maxCardW: 640 });
    const game = this.scene.get(SCENES.GAME);
    const score = d.score ?? 0;
    const highScore = d.highScore ?? 0;
    const isNewBest = score >= highScore && score > 0;
    const adsReady = isAdSurfaceEnabled('rewarded') && Monetization.getProviderName() !== 'noop';

    const resume = () => {
      InputRouter.onOverlayClose();
      this.scene.stop();
      game.doVideoContinue();
    };

    const { frame, stackTop } = anchorButtonStack(this, panel, [
      {
        label: adsReady ? 'WATCH VIDEO & CONTINUE' : 'CONTINUE',
        fontSize: '14px',
        color: PAL.accent2,
        onClick: async () => {
          this.statusText.setText(adsReady ? 'Loading ad…' : '');
          const { granted, bypassed } = await Monetization.offerRewardedContinueWithBypass();
          if (granted) {
            if (bypassed && adsReady) this.statusText.setText('Ad unavailable — continuing…');
            resume();
          } else {
            this.statusText.setText('Could not continue — try again');
            audio.blip(220);
          }
        },
      },
      {
        label: 'RESTART', primary: false, fontSize: '14px',
        onClick: () => {
          InputRouter.onOverlayClose(false);
          this.scene.stop();
          game.doRestart();
        },
      },
      {
        label: 'MAIN MENU', primary: false, fontSize: '14px', color: 0x8b9bb4,
        onClick: () => {
          InputRouter.onOverlayClose(false);
          this.scene.stop(SCENES.HUD);
          this.scene.stop(SCENES.GAME);
          this.scene.stop();
          this.scene.start(SCENES.MENU);
        },
      },
      {
        label: 'SHARE PROGRESS', primary: false, fontSize: '13px', color: PAL.accent3,
        onClick: async () => {
          this.statusText.setText('Preparing screenshot…');
          const res = await shareProgressScreenshot(this.game, {
            kind: 'gameover',
            shareData: { score, highScore, isNewBest },
            badge: isNewBest ? 'NEW HIGH SCORE!' : 'GAME OVER',
            badgeColor: isNewBest ? cssHex(PAL.gold) : '#ff6b7a',
            heroStat: `${score.toLocaleString()} PTS`,
            line2: `Best · ${highScore.toLocaleString()}`,
            line3: `💎 ${MetaProgress.getGems()} gems · Think you can beat me?`,
          });
          this.statusText.setText(res.ok
            ? (res.method === 'download+clipboard' ? 'Saved! Message copied.' : res.method === 'download' ? 'Screenshot saved!' : 'Shared!')
            : 'Share cancelled');
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

    const scoreText = this.add.text(frame.cx, y, `Score  ${score.toLocaleString()}`, {
      ...orbitronStyle(26, cssHex(PAL.accent), { fontStyle: 'bold', align: 'center' }),
    }).setOrigin(0.5, 0).setDepth(1001);
    fitTextWidth(scoreText, frame.wrap, uiPx(18, { min: 16, max: 22 }));
    y += uiPx(28, { min: 24, max: 32 });

    this.add.text(frame.cx, y, `Best  ${highScore.toLocaleString()}`, {
      ...orbitronStyle(16, PAL.textMuted, { align: 'center' }),
    }).setOrigin(0.5, 0).setDepth(1001);
    y += uiPx(22, { min: 18, max: 26 });

    if (isNewBest) {
      this.add.text(frame.cx, y, 'NEW HIGH SCORE', {
        ...orbitronStyle(14, cssHex(PAL.accent3), { fontStyle: '900', align: 'center' }),
      }).setOrigin(0.5, 0).setDepth(1001);
      y += uiPx(20, { min: 16, max: 24 });
    }

    const statusY = Math.min(y + uiPx(8, { min: 4, max: 10 }), stackTop - uiPx(28, { min: 22, max: 32 }));
    this.statusText = this.add.text(frame.cx, statusY, '', {
      ...orbitronStyle(12, cssHex(PAL.accent3), { align: 'center', wordWrap: { width: frame.wrap } }),
    }).setOrigin(0.5, 0).setDepth(1001);
  }
}
