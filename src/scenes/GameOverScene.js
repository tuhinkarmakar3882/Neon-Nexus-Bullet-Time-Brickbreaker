import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { makeOverlayPanel, layoutButtonStack, spawnConfetti } from '../utils/UI.js';
import { Monetization } from '../systems/Monetization.js';
import { InputRouter } from '../systems/InputRouter.js';
import { shareProgressScreenshot } from '../systems/ShareProgress.js';
import { MetaProgress } from '../systems/MetaProgress.js';
import { audio } from '../systems/AudioManager.js';

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
    const W = GAME.WIDTH, H = GAME.HEIGHT;
    const d = this.data2;
    const panel = makeOverlayPanel(this, { dimAlpha: 0.88, cardH: H * 0.82 });

    this.add.text(panel.cx, panel.cy - panel.cardH / 2 + 64, 'GAME OVER', {
      fontFamily: 'Orbitron, monospace', fontSize: '72px', fontStyle: '900', color: '#ff3b5c',
    }).setOrigin(0.5).setDepth(1001).setShadow(0, 0, '#ff3b5c', 24, true, true);

    this.add.text(panel.cx, panel.cy - panel.cardH / 2 + 130, d.message || '', {
      fontFamily: 'Orbitron, monospace', fontSize: '24px', color: '#cfe9ff', align: 'center', wordWrap: { width: panel.cardW * 0.9 },
    }).setOrigin(0.5).setDepth(1001);

    this.add.text(panel.cx, panel.cy - panel.cardH / 2 + 190, `SCORE  ${d.score ?? 0}`, {
      fontFamily: 'Orbitron, monospace', fontSize: '36px', fontStyle: 'bold', color: cssHex(PAL.accent),
    }).setOrigin(0.5).setDepth(1001);
    this.add.text(panel.cx, panel.cy - panel.cardH / 2 + 240, `BEST  ${d.highScore ?? 0}`, {
      fontFamily: 'Orbitron, monospace', fontSize: '24px', color: '#9fb4cc',
    }).setOrigin(0.5).setDepth(1001);

    const isNewBest = (d.score ?? 0) >= (d.highScore ?? 0) && (d.score ?? 0) > 0;
    if (isNewBest) {
      this.add.text(panel.cx, panel.cy - panel.cardH / 2 + 280, 'NEW HIGH SCORE!', {
        fontFamily: 'Orbitron, monospace', fontSize: '28px', fontStyle: '900', color: cssHex(PAL.accent3),
      }).setOrigin(0.5).setDepth(1001).setShadow(0, 0, cssHex(PAL.accent3), 16, true, true);
      spawnConfetti(this, panel.cx, panel.cy - panel.cardH / 2 + 200, 48);
    } else {
      spawnConfetti(this, panel.cx, panel.cy - panel.cardH / 2 + 200, 16);
    }

    const game = this.scene.get(SCENES.GAME);
    this.statusText = this.add.text(panel.cx, panel.cy - 40, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '20px', color: '#ffd23d',
    }).setOrigin(0.5).setDepth(1001);

    this.shareStatus = this.add.text(panel.cx, panel.cy, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '14px', color: PAL.textMuted,
    }).setOrigin(0.5).setDepth(1001);

    const continues = d.continues ?? 0;
    const btnItems = [];
    if (continues > 0) {
      btnItems.push({
        label: `♥ CONTINUE (${continues} left)`,
        height: 80, fontSize: '28px', color: PAL.accent2,
        onClick: () => {
          InputRouter.onOverlayClose();
          this.scene.stop();
          game.doContinue();
        },
      });
    }
    btnItems.push({
      label: '🎬 REVIVE + 2 POWERS',
      height: 76, fontSize: '22px', color: PAL.accent2, width: 500,
      onClick: async () => {
        this.statusText.setText('Loading ad…');
        try {
          const granted = await Monetization.offerReviveWithPowers();
          if (granted) {
            InputRouter.onOverlayClose();
            this.scene.stop();
            game.doReviveWithPowers();
          } else {
            this.statusText.setText('Ad unavailable — try again or restart');
            audio.blip(220);
          }
        } catch {
          this.statusText.setText('Ad unavailable — try again or restart');
        }
      },
    });
    btnItems.push({
      label: '🎬 WATCH VIDEO → CONTINUE',
      height: 76, fontSize: '24px', color: PAL.accent3, width: 500,
      onClick: async () => {
        this.statusText.setText('Loading ad…');
        try {
          const granted = await Monetization.offerRewardedContinue();
          if (granted) {
            game.continues = Math.max(game.continues, 1);
            InputRouter.onOverlayClose();
            this.scene.stop();
            game.doContinue();
          } else {
            this.statusText.setText('Ad unavailable — try again or restart');
            audio.blip(220);
          }
        } catch {
          this.statusText.setText('Ad unavailable — try again or restart');
        }
      },
    });
    btnItems.push({
      label: '📸 SHARE SCORE',
      height: 64, fontSize: '20px', color: PAL.accent3, width: 460,
      onClick: async () => {
        this.shareStatus.setText('Preparing screenshot…');
        const res = await shareProgressScreenshot(this.game, {
          kind: 'gameover',
          shareData: {
            score: d.score ?? 0,
            highScore: d.highScore ?? 0,
            isNewBest,
          },
          badge: isNewBest ? 'NEW HIGH SCORE!' : 'GAME OVER',
          badgeColor: isNewBest ? '#e8b86d' : '#ff6b7a',
          heroStat: `${(d.score ?? 0).toLocaleString()} PTS`,
          line2: `Best · ${(d.highScore ?? 0).toLocaleString()}`,
          line3: `💎 ${MetaProgress.getGems()} gems · Think you can beat me?`,
        });
        this.shareStatus.setText(res.ok
          ? (res.method === 'download+clipboard' ? 'Saved! Message copied.' : res.method === 'download' ? 'Screenshot saved!' : 'Shared!')
          : 'Share cancelled');
      },
    });
    btnItems.push({
      label: 'RESTART', height: 68, primary: false, fontSize: '28px',
      onClick: () => {
        InputRouter.onOverlayClose(false);
        this.scene.stop();
        game.doRestart();
      },
    });
    btnItems.push({
      label: 'MENU', height: 64, primary: false, color: 0x8b9bb4, fontSize: '24px',
      onClick: () => {
        InputRouter.onOverlayClose(false);
        this.scene.stop(SCENES.HUD);
        this.scene.stop(SCENES.GAME);
        this.scene.stop();
        this.scene.start(SCENES.MENU);
      },
    });

    layoutButtonStack(this, panel, btnItems, {
      width: 460,
      gap: 12,
      offsetY: continues > 0 ? 120 : 100,
    });
  }
}
