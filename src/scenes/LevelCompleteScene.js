import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { makeResponsiveOverlayPanel, spawnConfetti, makeButton, overlayFrame } from '../utils/UI.js';
import { InputRouter } from '../systems/InputRouter.js';
import { Monetization } from '../systems/Monetization.js';
import { MetaProgress } from '../systems/MetaProgress.js';
import { isAdSurfaceEnabled } from '../config/AdsConfig.js';
import { shareProgressScreenshot } from '../systems/ShareProgress.js';
import { audio } from '../systems/AudioManager.js';
import { fitTextWidth, orbitronStyle, uiPx, displayStyle } from '../utils/Typography.js';
import { AdBreakPolicy } from '../systems/AdBreakPolicy.js';
import { getGameScene } from '../utils/SceneRefs.js';
import { resumeGameScene, safeStartNextLevel } from '../systems/GameGuard.js';
import {
  dispatchLevelCompleteOverlayClose,
  dispatchLevelCompleteOverlayOpen,
} from '../shell/levelCompleteOverlayDom.js';

export class LevelCompleteScene extends Phaser.Scene {
  constructor() { super(SCENES.LEVEL_COMPLETE); }
  init(data) { this.d = data || {}; }

  create() {
    InputRouter.onOverlayOpen(SCENES.LEVEL_COMPLETE);
    this.input.setTopOnly(true);
    const d = this.d;
    this.gs = getGameScene(this);
    this.showAdBtn = !Monetization.removeAds && isAdSurfaceEnabled('rewarded');
    this.doubled = false;

    if (GAME.USE_DOM_HUD) {
      this._domLevelComplete = true;
      dispatchLevelCompleteOverlayOpen(this.buildOverlayPayload());
      this.events.once('shutdown', () => dispatchLevelCompleteOverlayClose());
      this.setupAdvanceFlow({ domHud: true });
      return;
    }

    this.buildPhaserUI();
    this.setupAdvanceFlow({ domHud: false });
  }

  buildOverlayPayload() {
    const d = this.d;
    const gs = this.gs;
    return {
      level: d.level ?? 1,
      message: d.message || '',
      bonus: d.bonus ?? 0,
      score: d.score ?? gs?.score ?? 0,
      stars: d.stars ?? 1,
      lives: d.lives ?? gs?.lives ?? 0,
      goal: d.goal,
      gemsEarned: d.gemsEarned,
      gems: d.gems ?? MetaProgress.getGems(),
      showDoubleBonus: this.showAdBtn,
    };
  }

  async doubleBonus() {
    const gs = this.gs;
    const d = this.d;
    if (this.doubled || !this.showAdBtn || !gs?.applyLevelBonusDouble) {
      return { ok: false, message: 'Bonus already doubled' };
    }
    try {
      const res = await Monetization.offerRewarded('double_bonus');
      if (res.granted && gs.applyLevelBonusDouble()) {
        this.doubled = true;
        audio.blip(880);
        return {
          ok: true,
          message: 'Bonus doubled!',
          bonus: (d.bonus ?? 0) * 2,
          score: gs.score,
        };
      }
      if (res.unavailable) {
        audio.blip(220);
        return { ok: false, message: 'Video unavailable — bonus unchanged' };
      }
      if (res.cancelled) {
        audio.blip(220);
        return { ok: false, message: 'Watch the full video for 2× bonus' };
      }
      audio.blip(220);
      return { ok: false, message: 'Could not apply bonus — try again' };
    } catch {
      audio.blip(220);
      return { ok: false, message: 'Video unavailable — bonus unchanged' };
    }
  }

  async shareProgress() {
    const d = this.d;
    const gs = this.gs;
    const displayScore = d.score ?? gs?.score ?? 0;
    const stars = d.stars ?? 1;
    const lives = d.lives ?? gs?.lives ?? 0;
    const res = await shareProgressScreenshot(this.game, {
      kind: 'levelComplete',
      shareData: {
        level: d.level ?? 1,
        score: displayScore,
        lives,
        stars,
        gemsEarned: d.gemsEarned,
      },
      uiScore: displayScore,
      level: d.level ?? 1,
      lives,
      gems: MetaProgress.getGems(),
      treasury: d.treasury ?? MetaProgress.getTreasury(),
      badge: `🌿 LEVEL ${d.level ?? 1} CLEARED`,
      badgeColor: '#7eb87a',
      heroStat: displayScore.toLocaleString(),
      heroLabel: 'SCORE',
      line2: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`,
      line2Label: `BONUS +${d.bonus ?? 0}`,
      line3: d.gemsEarned != null ? `+${d.gemsEarned}` : 'NEXT',
      line3Label: d.gemsEarned != null ? 'GEMS EARNED' : 'LEVEL',
      hook: 'Garden secured — the siege rolls on',
    });
    if (res.ok) {
      if (res.method === 'download+clipboard') return 'Saved! Message copied.';
      if (res.method === 'download') return 'Screenshot saved!';
      return 'Shared!';
    }
    return 'Share cancelled';
  }

  setupAdvanceFlow({ domHud }) {
    let advanced = false;
    const advance = async () => {
      if (advanced) return;
      advanced = true;
      InputRouter.onOverlayClose(SCENES.LEVEL_COMPLETE);
      this.scene.stop();
      const gs = this.gs;
      if (!gs?.startNextLevel) {
        console.warn('[LevelComplete] Game scene unavailable — resuming');
        resumeGameScene(this.game);
        return;
      }
      try {
        await AdBreakPolicy.onContinueAfterLevelClear(this.game);
      } catch (e) {
        console.warn('[LevelComplete] ad break skipped', e);
      }
      if (!safeStartNextLevel(gs)) {
        resumeGameScene(this.game);
      }
    };
    this.advance = advance;

    this.time.delayedCall(4200, advance);

    if (!domHud) {
      this.time.delayedCall(1400, () => {
        this.input.once('pointerdown', advance);
        this.input.keyboard.once('keydown-SPACE', advance);
        this.input.keyboard.once('keydown-ESC', () => this.handleBack());
      });
    }
  }

  buildPhaserUI() {
    const d = this.d;
    const gs = this.gs;
    const panel = makeResponsiveOverlayPanel(this, { maxCardW: 680 });
    const frame = overlayFrame(panel, { footerReserve: uiPx(130, { min: 110, max: 140 }) });
    const showAdBtn = this.showAdBtn;
    const btnW = showAdBtn
      ? Math.min(frame.btnW / 2 - uiPx(6, { min: 4, max: 8 }), uiPx(160, { max: 180 }))
      : Math.min(frame.btnW, uiPx(200, { max: 220 }));
    const btnH = uiPx(44, { min: 40, max: 48 });
    const btnGap = uiPx(12, { min: 8, max: 14 });
    const actionsY = frame.cardBot - uiPx(72, { min: 64, max: 80 });

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

    const displayScore = d.score ?? gs?.score ?? 0;
    this.scoreText = this.add.text(frame.cx, y, `SCORE  ${displayScore.toLocaleString()}`, {
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
    const lives = d.lives ?? gs?.lives ?? 0;

    if (showAdBtn) {
      makeButton(this, leftX, actionsY, '2× BONUS', async () => {
        const res = await this.doubleBonus();
        this.doubleStatus.setText(res.message);
        if (res.ok) {
          this.bonusText.setText(`CLEAR BONUS  +${res.bonus}  (DOUBLED!)`);
          this.scoreText.setText(`SCORE  ${res.score.toLocaleString()}`);
        }
      }, { width: btnW, height: btnH, fontSize: '13px', primary: false });
    }

    makeButton(this, showAdBtn ? rightX : frame.cx, actionsY, 'SHARE', async () => {
      this.shareStatus.setText('Preparing screenshot…');
      const msg = await this.shareProgress();
      this.shareStatus.setText(msg);
    }, { width: btnW, height: btnH, fontSize: '13px', primary: false, color: PAL.accent3 });

    const hint = this.add.text(frame.cx, frame.cardBot - uiPx(14, { min: 10, max: 16 }), 'Tap to continue', {
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
  }

  handleBack() {
    if (this.advance) {
      this.advance();
      return true;
    }
    return false;
  }
}
