import Phaser from 'phaser';
import { SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { makeResponsiveOverlayPanel, spawnConfetti, makeButton, overlayFrame } from '../utils/UI.js';
import { InputRouter } from '../systems/InputRouter.js';
import { Monetization } from '../systems/Monetization.js';
import { isAdSurfaceEnabled } from '../config/AdsConfig.js';
import { shareProgressScreenshot } from '../systems/ShareProgress.js';
import { audio } from '../systems/AudioManager.js';
import { fitTextWidth, orbitronStyle, uiPx, displayStyle } from '../utils/Typography.js';
import { GAME } from '../config/Constants.js';

export class LevelCompleteScene extends Phaser.Scene {
  constructor() { super(SCENES.LEVEL_COMPLETE); }
  init(data) { this.d = data || {}; }

  create() {
    InputRouter.onOverlayOpen(SCENES.LEVEL_COMPLETE);
    this.input.setTopOnly(true);
    const d = this.d;
    const panel = makeResponsiveOverlayPanel(this, { maxCardW: 680 });
    const frame = overlayFrame(panel, { footerReserve: uiPx(130, { min: 110, max: 140 }) });
    const showAdBtn = !Monetization.removeAds && isAdSurfaceEnabled('rewarded');
    const btnW = showAdBtn
      ? Math.min(frame.btnW / 2 - uiPx(6, { min: 4, max: 8 }), uiPx(160, { max: 180 }))
      : Math.min(frame.btnW, uiPx(200, { max: 220 }));
    const btnH = uiPx(44, { min: 40, max: 48 });
    const btnGap = uiPx(12, { min: 8, max: 14 });
    const actionsY = frame.cardBot - uiPx(72, { min: 64, max: 80 });
    const game = this.scene.get(SCENES.GAME);
    let doubled = false;

    const compact = GAME.IS_PORTRAIT || GAME.HEIGHT < 760;
    const lineGap = uiPx(compact ? 16 : 22, { min: 12, max: 26 });

    let y = frame.titleY;

    const levelLabel = this.add.text(frame.cx, y, `LEVEL ${d.level ?? 1}`, {
      ...displayStyle(uiPx(26, { min: 20, max: 30 }), cssHex(PAL.accent), {
        fontStyle: '600',
        align: 'center',
        letterSpacing: '0.12em',
      }),
    }).setOrigin(0.5, 0).setDepth(1001).setAlpha(0).setScale(0.5);
    fitTextWidth(levelLabel, frame.wrap, uiPx(16, { min: 14, max: 18 }));
    y += levelLabel.height + uiPx(8, { min: 6, max: 10 });

    const clearedLabel = this.add.text(frame.cx, y, 'CLEARED', {
      ...displayStyle(uiPx(44, { min: 32, max: 50 }), cssHex(PAL.accent), {
        fontStyle: '900',
        align: 'center',
        letterSpacing: '0.06em',
      }),
    }).setOrigin(0.5, 0).setDepth(1001)
      .setShadow(0, 0, cssHex(PAL.accent), 20, true, true)
      .setAlpha(0).setScale(0.5);
    fitTextWidth(clearedLabel, frame.wrap, uiPx(28, { min: 24, max: 36 }));
    y += clearedLabel.height + lineGap;

    spawnConfetti(this, frame.cx, frame.cardTop + uiPx(44, { min: 32, max: 48 }), 40);

    const addLine = (text, style, minPx) => {
      if (!text || y > frame.contentBottom - uiPx(88, { min: 76, max: 96 })) return null;
      const t = this.add.text(frame.cx, y, text, {
        ...style, align: 'center', wordWrap: { width: frame.wrap },
      }).setOrigin(0.5, 0).setDepth(1001);
      fitTextWidth(t, frame.wrap, minPx);
      y += t.height + lineGap * 0.55;
      return t;
    };

    addLine(d.message || '', orbitronStyle(15, PAL.text), uiPx(12, { min: 11, max: 14 }));

    this.bonusText = this.add.text(frame.cx, y, `CLEAR BONUS  +${d.bonus ?? 0}`, {
      ...orbitronStyle(20, cssHex(PAL.accent3), { fontStyle: 'bold', align: 'center' }),
    }).setOrigin(0.5, 0).setDepth(1001);
    fitTextWidth(this.bonusText, frame.wrap, uiPx(15, { min: 13, max: 18 }));
    y += this.bonusText.height + lineGap * 0.45;

    this.scoreText = this.add.text(frame.cx, y, `SCORE  ${(d.score ?? 0).toLocaleString()}`, {
      ...orbitronStyle(17, PAL.textMuted, { align: 'center' }),
    }).setOrigin(0.5, 0).setDepth(1001);
    y += this.scoreText.height + lineGap * 0.5;

    const stars = d.stars ?? 1;
    const starText = this.add.text(frame.cx, y, '★'.repeat(stars) + '☆'.repeat(3 - stars), {
      ...orbitronStyle(26, cssHex(PAL.gold), { align: 'center' }),
    }).setOrigin(0.5, 0).setDepth(1001);
    y += starText.height + lineGap * 0.5;

    if (d.gemsEarned != null) {
      addLine(`+${d.gemsEarned} 💎 GEMS`, orbitronStyle(18, cssHex(PAL.info), { fontStyle: 'bold' }), uiPx(14, { min: 12, max: 16 }));
      addLine(`TOTAL  ${(d.gems ?? 0).toLocaleString()} 💎`, orbitronStyle(14, cssHex(PAL.accent2)), uiPx(11, { min: 10, max: 13 }));
    }

    if (d.goal) {
      addLine(d.goal, orbitronStyle(13, cssHex(PAL.accent3)), uiPx(10, { min: 9, max: 12 }));
    }

    this.doubleStatus = this.add.text(frame.cx, Math.min(y, actionsY - btnH - uiPx(36, { min: 28, max: 40 })), '', {
      ...orbitronStyle(12, cssHex(PAL.accent3), { align: 'center', wordWrap: { width: frame.wrap } }),
    }).setOrigin(0.5, 0).setDepth(1001);

    this.shareStatus = this.add.text(frame.cx, actionsY + btnH / 2 + uiPx(8, { min: 6, max: 10 }), '', {
      ...orbitronStyle(11, PAL.textMuted, { align: 'center', wordWrap: { width: frame.wrap } }),
    }).setOrigin(0.5, 0).setDepth(1001);

    const rowW = showAdBtn ? btnW * 2 + btnGap : btnW;
    const leftX = frame.cx - rowW / 2 + btnW / 2;
    const rightX = frame.cx + rowW / 2 - btnW / 2;

    if (showAdBtn) {
      makeButton(this, leftX, actionsY, '2× BONUS', async () => {
        if (doubled) return;
        this.doubleStatus.setText('Loading ad…');
        const granted = await Monetization.offerRewardedDoubleBonus();
        if (granted && game.applyLevelBonusDouble()) {
          doubled = true;
          this.bonusText.setText(`CLEAR BONUS  +${(d.bonus ?? 0) * 2}  (DOUBLED!)`);
          this.scoreText.setText(`SCORE  ${game.score.toLocaleString()}`);
          this.doubleStatus.setText('Bonus doubled!');
          audio.blip(880);
        } else {
          this.doubleStatus.setText('Ad unavailable');
          audio.blip(220);
        }
      }, { width: btnW, height: btnH, fontSize: '13px', primary: false });
    }

    makeButton(this, showAdBtn ? rightX : frame.cx, actionsY, 'SHARE', async () => {
      this.shareStatus.setText('Preparing screenshot…');
      const res = await shareProgressScreenshot(this.game, {
        kind: 'levelComplete',
        shareData: {
          level: d.level ?? 1,
          score: d.score ?? 0,
          stars,
          gemsEarned: d.gemsEarned,
        },
        badge: `LEVEL ${d.level ?? 1} CLEARED`,
        badgeColor: '#7eb87a',
        heroStat: `${(d.score ?? 0).toLocaleString()} PTS`,
        line2: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  CLEAR BONUS +${d.bonus ?? 0}`,
        line3: d.gemsEarned != null ? `+${d.gemsEarned} 💎 gems · ${d.gems ?? 0} total` : 'On to the next garden!',
      });
      this.shareStatus.setText(res.ok
        ? (res.method === 'download+clipboard' ? 'Saved! Message copied.' : res.method === 'download' ? 'Screenshot saved!' : 'Shared!')
        : 'Share cancelled');
    }, { width: btnW, height: btnH, fontSize: '13px', primary: false, color: PAL.accent3 });

    const hint = this.add.text(frame.cx, frame.cardBot - uiPx(14, { min: 10, max: 16 }), 'tap to continue', {
      ...orbitronStyle(14, PAL.textMuted, { align: 'center' }),
    }).setOrigin(0.5, 1).setAlpha(0).setDepth(1002);

    this.tweens.add({
      targets: [levelLabel, clearedLabel],
      scale: 1,
      alpha: 1,
      duration: 420,
      ease: 'Back.easeOut',
    });
    this.time.delayedCall(1200, () => {
      hint.setAlpha(0.7);
      this.tweens.add({ targets: hint, alpha: 0.25, yoyo: true, repeat: -1, duration: 700 });
    });

    let advanced = false;
    const advance = () => {
      if (advanced) return;
      advanced = true;
      InputRouter.onOverlayClose(SCENES.LEVEL_COMPLETE);
      this.scene.stop();
      game.startNextLevel();
    };
    this._advance = advance;
    this.time.delayedCall(4200, advance);
    this.time.delayedCall(1400, () => {
      this.input.once('pointerdown', advance);
      this.input.keyboard.once('keydown-SPACE', advance);
      this.input.keyboard.once('keydown-ESC', () => this.handleBack());
    });
  }

  handleBack() {
    if (this._advance) {
      this._advance();
      return true;
    }
    return false;
  }
}
