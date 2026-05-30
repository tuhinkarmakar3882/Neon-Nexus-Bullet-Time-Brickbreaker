import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { makeOverlayPanel, spawnConfetti, makeButton } from '../utils/UI.js';
import { InputRouter } from '../systems/InputRouter.js';
import { Monetization } from '../systems/Monetization.js';
import { shareProgressScreenshot } from '../systems/ShareProgress.js';
import { audio } from '../systems/AudioManager.js';

export class LevelCompleteScene extends Phaser.Scene {
  constructor() { super(SCENES.LEVEL_COMPLETE); }
  init(data) { this.d = data || {}; }

  create() {
    InputRouter.onOverlayOpen(SCENES.LEVEL_COMPLETE);
    this.input.setTopOnly(true);
    const W = GAME.WIDTH, H = GAME.HEIGHT;
    const d = this.d;
    const panel = makeOverlayPanel(this);

    const title = this.add.text(panel.cx, panel.cy - panel.cardH / 2 + 120, `LEVEL ${d.level ?? 1}\nCLEARED`, {
      fontFamily: 'Orbitron, monospace', fontSize: '64px', fontStyle: '900', color: cssHex(PAL.accent), align: 'center',
    }).setOrigin(0.5).setDepth(1001).setShadow(0, 0, cssHex(PAL.accent), 24, true, true).setScale(0.5).setAlpha(0);

    spawnConfetti(this, panel.cx, panel.cy - panel.cardH / 2 + 120, 48);

    this.add.text(panel.cx, panel.cy - 20, d.message || '', {
      fontFamily: 'Orbitron, monospace', fontSize: '24px', color: PAL.text, align: 'center', wordWrap: { width: panel.cardW * 0.9 },
    }).setOrigin(0.5).setDepth(1001);

    this.bonusText = this.add.text(panel.cx, panel.cy + 40, `CLEAR BONUS  +${d.bonus ?? 0}`, {
      fontFamily: 'Orbitron, monospace', fontSize: '28px', fontStyle: 'bold', color: cssHex(PAL.accent3),
    }).setOrigin(0.5).setDepth(1001);
    this.scoreText = this.add.text(panel.cx, panel.cy + 90, `SCORE  ${d.score ?? 0}`, {
      fontFamily: 'Orbitron, monospace', fontSize: '24px', color: PAL.textMuted,
    }).setOrigin(0.5).setDepth(1001);

    const stars = d.stars ?? 1;
    this.add.text(panel.cx, panel.cy + 130, '★'.repeat(stars) + '☆'.repeat(3 - stars), {
      fontFamily: 'Orbitron, monospace', fontSize: '36px', color: cssHex(PAL.gold),
    }).setOrigin(0.5).setDepth(1001);

    if (d.gemsEarned != null) {
      this.add.text(panel.cx, panel.cy + 172, `+${d.gemsEarned} 💎 GEMS`, {
        fontFamily: 'Orbitron, monospace', fontSize: '22px', fontStyle: 'bold', color: cssHex(PAL.info),
      }).setOrigin(0.5).setDepth(1001);
      this.add.text(panel.cx, panel.cy + 202, `TOTAL  ${d.gems ?? 0} 💎`, {
        fontFamily: 'Orbitron, monospace', fontSize: '16px', color: cssHex(PAL.accent2),
      }).setOrigin(0.5).setDepth(1001);
    }

    if (d.goal) {
      this.add.text(panel.cx, panel.cy + 232, d.goal, {
        fontFamily: 'Orbitron, monospace', fontSize: '16px', color: cssHex(PAL.accent3),
      }).setOrigin(0.5).setDepth(1001);
    }

    this.doubleStatus = this.add.text(panel.cx, panel.cy + 260, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '16px', color: cssHex(PAL.accent3),
    }).setOrigin(0.5).setDepth(1001);

    const game = this.scene.get(SCENES.GAME);
    let doubled = false;
    if (!Monetization.removeAds) {
      makeButton(this, panel.cx - 100, panel.cy + 300, '🎬 2× BONUS', async () => {
        if (doubled) return;
        this.doubleStatus.setText('Loading ad…');
        const granted = await Monetization.offerRewardedDoubleBonus();
        if (granted && game.applyLevelBonusDouble()) {
          doubled = true;
          this.bonusText.setText(`CLEAR BONUS  +${(d.bonus ?? 0) * 2}  (DOUBLED!)`);
          this.scoreText.setText(`SCORE  ${game.score}`);
          this.doubleStatus.setText('Bonus doubled — thank you!');
          audio.blip(880);
        } else {
          this.doubleStatus.setText('Ad unavailable — try again');
          audio.blip(220);
        }
      }, { width: 200, height: 44, fontSize: '14px', primary: false });
    }

    this.shareStatus = this.add.text(panel.cx, panel.cy + 348, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '14px', color: PAL.textMuted,
    }).setOrigin(0.5).setDepth(1001);

    makeButton(this, panel.cx + (Monetization.removeAds ? 0 : 100), panel.cy + 300, '📸 SHARE', async () => {
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
    }, { width: 200, height: 44, fontSize: '14px', primary: false, color: PAL.accent3 });

    const hint = this.add.text(panel.cx, panel.cy + panel.cardH / 2 - 48, 'tap to continue', { fontFamily: 'Orbitron, monospace', fontSize: '20px', color: PAL.textMuted }).setOrigin(0.5).setAlpha(0).setDepth(1001);
    this.time.delayedCall(1200, () => {
      hint.setAlpha(0.7);
      this.tweens.add({ targets: hint, alpha: 0.2, yoyo: true, repeat: -1, duration: 700 });
    });

    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 420, ease: 'Back.easeOut' });

    let advanced = false;
    const advance = () => {
      if (advanced) return;
      advanced = true;
      InputRouter.onOverlayClose();
      this.scene.stop();
      game.startNextLevel();
    };
    this.time.delayedCall(4200, advance);
    this.time.delayedCall(1400, () => {
      this.input.once('pointerdown', advance);
      this.input.keyboard.once('keydown-SPACE', advance);
    });
  }
}
