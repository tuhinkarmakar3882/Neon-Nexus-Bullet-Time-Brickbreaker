import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { makeButton } from '../utils/UI.js';
import { MetaProgress } from '../systems/MetaProgress.js';
import { tickBump } from '../utils/MicroFx.js';
import { clamp } from '../utils/Helpers.js';
import { arenaWidth, fitTextWidth, orbitronStyle, uiFont, uiPx } from '../utils/Typography.js';

export class HUDScene extends Phaser.Scene {
  constructor() { super({ key: SCENES.HUD, active: false }); }

  create() {
    const W = GAME.WIDTH;
    const H = GAME.HEIGHT;
    const bus = this.game.events;
    const portrait = GAME.IS_PORTRAIT;
    const arenaW = arenaWidth();
    const arenaCx = GAME.WALL_X + GAME.SAFE_LEFT + arenaW / 2;
    const topPad = 10 + GAME.SAFE_TOP * 0.3;
    this._chromeCy = topPad + uiPx(12, { min: 8, max: 14 });
    this._arenaTop = GAME.WALL_TOP;

    const paddleY = H - GAME.PADDLE_Y_OFFSET;
    this._meterTopY = GAME.WALL_TOP + uiPx(8, { min: 6, max: 10 });
    const barH = Math.min(uiPx(150, { max: 150 }), GAME.WALL_TOP - 16);
    const pauseSize = uiPx(32, { min: 28, max: 36 });
    this._pauseX = W - GAME.SAFE_RIGHT - pauseSize / 2 - uiPx(6, { min: 4, max: 8 });
    this._pauseSize = pauseSize;
    this._livesCount = 0;

    const bar = this.add.graphics();
    bar.fillStyle(0x080b16, 0.55); bar.fillRoundedRect(10, 10 + GAME.SAFE_TOP * 0.3, W - 20, barH, 16);
    bar.lineStyle(1, PAL.accent, 0.22); bar.strokeRoundedRect(10, 10 + GAME.SAFE_TOP * 0.3, W - 20, barH, 16);
    this._barGfx = bar;

    const leftColW = Math.floor(arenaW * 0.34);
    const centerColW = Math.floor(arenaW * 0.38);

    this.scoreText = this.add.text(GAME.SAFE_LEFT + 16, topPad + 16, '0', orbitronStyle(36, PAL.text, { fontStyle: 'bold' }));
    this.scoreLabel = this.add.text(GAME.SAFE_LEFT + 16, topPad + 8, 'SCORE', orbitronStyle(14, PAL.textMuted, { fontStyle: 'bold' }));
    this.comboText = this.add.text(GAME.SAFE_LEFT + 16, topPad + 58, '', orbitronStyle(20, cssHex(PAL.accent3), { fontStyle: 'bold' }));

    this.levelText = this.add.text(W / 2, topPad + 20, 'LV 1', orbitronStyle(28, PAL.text, { fontStyle: 'bold' })).setOrigin(0.5, 0);
    this.diffText = this.add.text(W / 2, topPad + 48, '', orbitronStyle(12, cssHex(PAL.accent3), { fontStyle: 'bold' })).setOrigin(0.5, 0);
    this.bricksText = this.add.text(W / 2, topPad + 64, 'BRICKS 0', orbitronStyle(16, PAL.textMuted, { fontStyle: 'bold' })).setOrigin(0.5, 0);

    this.livesC = this.add.container(0, 0).setDepth(1006);

    const pauseX = this._pauseX;
    const pauseY = this._chromeCy;
    if (this.textures.exists('pause-icon')) {
      this.pauseBtn = makeButton(this, pauseX, pauseY, '', () => bus.emit('req:pause'), {
        width: pauseSize, height: pauseSize, fontSize: '1px', depth: 1006, compact: true, primary: false,
      });
      this.pauseIcon = this.add.image(pauseX, pauseY, 'pause-icon')
        .setDisplaySize(uiPx(16, { min: 14, max: 18 }), uiPx(16, { min: 14, max: 18 })).setDepth(1007);
    } else {
      this.pauseBtn = makeButton(this, pauseX, pauseY, 'II', () => bus.emit('req:pause'), {
        width: pauseSize, height: pauseSize, fontSize: '12px', depth: 1006, compact: true, primary: false,
      });
      this.pauseIcon = null;
    }

    this.toastText = this.add.text(arenaCx, H * 0.55, '', {
      ...orbitronStyle(22, PAL.text, { fontStyle: 'bold', align: 'center', wordWrap: { width: arenaW } }),
    }).setOrigin(0.5).setAlpha(0).setDepth(1005);

    this.flashText = this.add.text(arenaCx, H * 0.4, '', {
      ...orbitronStyle(64, PAL.text, { fontStyle: '900', align: 'center', wordWrap: { width: arenaW } }),
    }).setOrigin(0.5).setAlpha(0).setDepth(1008);

    const hintMsg = portrait ? 'TAP TO LAUNCH' : 'TAP / CLICK / SPACE TO LAUNCH';
    this.hintText = this.add.text(arenaCx, paddleY - uiPx(10, { min: 8, max: 12 }), hintMsg, {
      ...orbitronStyle(22, PAL.text, { fontStyle: 'bold', align: 'center', wordWrap: { width: arenaW - 8 } }),
    }).setOrigin(0.5, 1).setAlpha(0);

    // Vertical side meters — full arena height, clear of paddle zone
    const meterTop = this._meterTopY;
    const meterBottom = H - GAME.PADDLE_Y_OFFSET - uiPx(36, { min: 32, max: 44 });
    this._meterBarH = Math.max(64, meterBottom - meterTop);
    this._meterBarW = portrait ? 8 : 10;
    this._leftMeterX = Math.max(4, GAME.SAFE_LEFT + 2);
    this._rightMeterX = W - Math.max(4, GAME.SAFE_RIGHT + 2) - this._meterBarW;
    this._meterBarY = meterTop;

    this.gnomeStreakGfx = this.add.graphics().setDepth(1003);

    this.btMeterGfx = this.add.graphics().setDepth(1003);

    this.gnomeHit = this.add.rectangle(
      this._leftMeterX + this._meterBarW / 2, meterTop + this._meterBarH / 2,
      this._meterBarW + 24, this._meterBarH + 12, 0x000000, 0,
    ).setDepth(1005).setInteractive({ useHandCursor: true });
    this.gnomeHit.on('pointerdown', () => bus.emit('req:gnome'));

    this.nexusHit = this.add.rectangle(
      this._rightMeterX + this._meterBarW / 2, meterTop + this._meterBarH / 2,
      this._meterBarW + 24, this._meterBarH + 12, 0x000000, 0,
    ).setDepth(1005).setInteractive({ useHandCursor: true });
    this.nexusHit.on('pointerdown', () => bus.emit('req:nexus'));

    const currencyX = pauseX - pauseSize / 2 - uiPx(6, { min: 4, max: 8 });
    this.currencyText = this.add.text(currencyX, this._chromeCy, '', {
      ...orbitronStyle(11, PAL.text, { fontStyle: 'bold', align: 'right' }),
    }).setOrigin(1, 0.5).setDepth(1006);

    this.comboCash = this.add.text(0, this._chromeCy, '', {
      ...orbitronStyle(11, cssHex(PAL.gold), { fontStyle: 'bold' }),
    }).setOrigin(0, 0.5).setDepth(1006).setAlpha(0);
    this.comboCashHit = this.add.zone(0, this._chromeCy, 1, 1).setDepth(1006).setInteractive({ useHandCursor: true });
    this.comboCashHit.on('pointerdown', () => bus.emit('req:gambit'));
    this._gambitReady = false;

    this.btText = this.add.text(this._rightMeterX + this._meterBarW / 2, meterTop + this._meterBarH * 0.5, 'SLOW-MO', {
      ...orbitronStyle(10, '#8ec5ff', { fontStyle: '900' }),
    }).setOrigin(0.5).setAlpha(0).setDepth(1006);
    this.btText.setShadow(0, 0, '#4488ff', 10, true, true);

    const drawVertBar = (g, x, y, w, h, ratio, fill, ready) => {
      g.clear();
      g.fillStyle(0x121830, 0.78);
      g.fillRoundedRect(x, y, w, h, 5);
      if (ratio > 0) {
        const fillH = Math.max(6, h * ratio);
        g.fillStyle(fill, ready ? 1 : 0.88);
        g.fillRoundedRect(x, y + h - fillH, w, fillH, 5);
      }
      if (ready) {
        g.lineStyle(2, fill, 0.75);
        g.strokeRoundedRect(x - 2, y - 2, w + 4, h + 4, 6);
      }
    };

    this.onBtMeter = (s) => {
      const ratio = clamp((s.value ?? 0) / (s.max || 100), 0, 1);
      const ready = ratio >= 1;
      drawVertBar(
        this.btMeterGfx, this._rightMeterX, this._meterBarY,
        this._meterBarW, this._meterBarH, ratio, 0x4488ff, ready,
      );
      this.btText.setAlpha(ratio >= 0.25 && ratio < 1 ? 0.75 : 0);
    };

    this.onGnomeStreak = (s) => {
      const ratio = clamp((s.value ?? 0) / (s.max || 100), 0, 1);
      const ready = ratio >= 1;
      drawVertBar(
        this.gnomeStreakGfx, this._leftMeterX, this._meterBarY,
        this._meterBarW, this._meterBarH, ratio, ready ? PAL.accent2 : PAL.accent3, ready,
      );
    };

    this.onAchieve = ({ meter }) => {
      const gfx = meter === 'gnome' ? this.gnomeStreakGfx : this.btMeterGfx;
      this.tweens.add({
        targets: gfx,
        scaleX: { from: 1, to: 1.12 },
        scaleY: { from: 1, to: 1.12 },
        duration: 180,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeOut',
      });
    };

    const metaY = topPad + barH + 6;
    this.goalText = this.add.text(arenaCx, metaY, '', {
      ...orbitronStyle(13, cssHex(PAL.accent3), { fontStyle: 'bold', align: 'center', wordWrap: { width: arenaW } }),
    }).setOrigin(0.5, 0);
    this.mutatorText = this.add.text(arenaCx, metaY + uiPx(18, { min: 14, max: 20 }), '', {
      ...orbitronStyle(11, PAL.textMuted, { fontStyle: 'bold', align: 'center', wordWrap: { width: arenaW } }),
    }).setOrigin(0.5, 0);

    this._leftColW = leftColW;
    this._centerColW = centerColW;

    this.onTreasury = (t) => this.refreshCurrency(t.value);
    this.refreshCurrency = (treasury) => {
      const gems = MetaProgress.getGems();
      const leaf = treasury ?? MetaProgress.getTreasury();
      this.currencyText.setFontSize(uiPx(11, { min: 8, max: 13 }));
      this.currencyText.setText(`💎${gems.toLocaleString()}  🌿${leaf.toLocaleString()}`);
      this._fitCurrency();
    };
    this._fitCurrency = () => {
      const spacing = portrait ? uiPx(22, { min: 18, max: 24 }) : uiPx(28, { min: 24, max: 32 });
      const livesEnd = GAME.SAFE_LEFT + uiPx(12, { min: 8, max: 14 })
        + Math.min(this._livesCount, portrait ? 4 : 8) * spacing
        + uiPx(8, { min: 6, max: 10 });
      const maxW = Math.max(48, this._pauseX - this._pauseSize / 2 - uiPx(10, { min: 8, max: 12 }) - livesEnd);
      fitTextWidth(this.currencyText, maxW, 8);
      this._layoutComboCash(livesEnd);
    };
    this._layoutComboCash = (livesEnd) => {
      if (!this.comboCash?.active || this.comboCash.alpha <= 0) return;
      const x = livesEnd + uiPx(4, { min: 2, max: 6 });
      const maxW = Math.max(40, this._pauseX - this._pauseSize / 2 - uiPx(12, { min: 10, max: 14 }) - x);
      fitTextWidth(this.comboCash, maxW, 8);
      this.comboCash.setPosition(x, this._chromeCy);
      const w = Math.max(48, this.comboCash.width + uiPx(8, { min: 6, max: 10 }));
      this.comboCashHit.setPosition(x + w / 2, this._chromeCy);
      this.comboCashHit.setSize(w, uiPx(22, { min: 18, max: 24 }));
    };
    this._updateComboCash = (combo) => {
      const ready = combo >= GAME.COMBO_GAMBIT_MIN;
      this._gambitReady = ready;
      if (combo < 2) {
        this.comboCash.setAlpha(0);
        this.comboCashHit.disableInteractive();
        return;
      }
      this.comboCash.setFontSize(uiPx(11, { min: 9, max: 12 }));
      this.comboCash.setText(ready ? `x${combo} · CASH` : `x${combo}`);
      this.comboCash.setAlpha(ready ? 1 : 0.5);
      if (ready) this.comboCashHit.setInteractive({ useHandCursor: true });
      else this.comboCashHit.disableInteractive();
      const spacing = GAME.IS_PORTRAIT ? uiPx(22, { min: 18, max: 24 }) : uiPx(28, { min: 24, max: 32 });
      const livesEnd = GAME.SAFE_LEFT + uiPx(12, { min: 8, max: 14 })
        + Math.min(this._livesCount, GAME.IS_PORTRAIT ? 4 : 8) * spacing
        + uiPx(8, { min: 6, max: 10 });
      this._layoutComboCash(livesEnd);
    };
    this.refreshCurrency();
    this.onGambit = () => {
      if (!this._gambitReady || !this.comboCash?.active) return;
      tickBump(this, this.comboCash);
    };
    this.onMutators = (ids) => {
      if (!ids?.length) { this.mutatorText.setText(''); return; }
      this.mutatorText.setText(ids.map((id) => id.replace(/([A-Z])/g, ' $1').trim()).join(' · ').toUpperCase());
      fitTextWidth(this.mutatorText, arenaWidth(), uiPx(9, { min: 8, max: 11 }));
    };

    this.onStats = (s) => {
      if (s.score > (this._lastScore ?? 0)) tickBump(this, this.scoreText);
      this._lastScore = s.score;
      this.scoreText.setText(String(s.score));
      fitTextWidth(this.scoreText, this._leftColW, uiPx(18, { min: 14, max: 22 }));
      this.levelText.setText('LV ' + s.level);
      if (s.level !== this._lastLevel) {
        tickBump(this, this.levelText);
        this._lastLevel = s.level;
      }
      const diff = s.difficulty ?? 1;
      const band = s.band ? ` · ${s.band}` : '';
      this.diffText.setText('▮'.repeat(Math.min(diff, 10)) + band);
      fitTextWidth(this.diffText, this._centerColW, uiPx(9, { min: 8, max: 11 }));
      this.bricksText.setText('BRICKS ' + s.bricksLeft);
      fitTextWidth(this.bricksText, this._centerColW, uiPx(11, { min: 9, max: 14 }));
      this.comboText.setText(s.combo > 1 ? `COMBO x${s.combo}` : '');
      fitTextWidth(this.comboText, this._leftColW, uiPx(12, { min: 10, max: 16 }));
      this._updateComboCash(s.combo ?? 0);
      if (s.goalText) {
        this.goalText.setText(s.goalText);
        fitTextWidth(this.goalText, arenaW, uiPx(10, { min: 9, max: 12 }));
      }
      if (s.combo >= 2) {
        this.tweens.add({ targets: this.comboText, scaleX: 1.2, scaleY: 1.2, duration: 100, yoyo: true });
      }
      this._livesCount = s.lives ?? 0;
      this.drawLives(s.lives);
      this._fitCurrency();
    };
    this.onFlash = (f) => this.showFlash(f);
    this.onLife = () => this.tweens.add({ targets: this.livesC, scaleX: 1.25, scaleY: 1.25, yoyo: true, duration: 200 });
    this.onHint = (show) => this.hintText.setAlpha(show ? 0.85 : 0);
    this.onToast = (t) => this.showToast(t);
    this.onScramble = (on) => {
      if (on) {
        this.scrambleTween = this.tweens.add({
          targets: [this.scoreText, this.scoreLabel, this.levelText, this.bricksText],
          alpha: { from: 0.25, to: 1 },
          duration: 120,
          yoyo: true,
          repeat: -1,
        });
      } else {
        this.scrambleTween?.stop();
        this.scoreText.setAlpha(1);
        this.scoreLabel?.setAlpha(1);
        this.levelText.setAlpha(1);
        this.bricksText.setAlpha(1);
      }
    };
    this.onBulletTime = (bt) => {
      if (!this.btText) return;
      this.tweens.killTweensOf(this.btText);
      if (!bt?.active) {
        this.btText.setText('SLOW-MO');
        this.tweens.add({ targets: this.btText, alpha: 0, duration: 120 });
        return;
      }
      if (bt.nexus) this.btText.setText('NEXUS');
      this.btText.setAlpha(0.65 + 0.35 * (bt.ratio ?? 1));
      this.tweens.add({
        targets: this.btText,
        alpha: { from: 0.6, to: 1 },
        scaleX: { from: bt.nexus ? 0.94 : 0.96, to: bt.nexus ? 1.08 : 1.04 },
        scaleY: { from: bt.nexus ? 0.94 : 0.96, to: bt.nexus ? 1.08 : 1.04 },
        duration: bt.nexus ? 140 : 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    };

    this._immersive = true;
    this._immersivePeek = false;
    // Top bar chrome hidden in immersive — lives, currency & side meters stay visible.
    this._immersiveHide = [
      bar, this.scoreText, this.scoreLabel, this.comboText, this.levelText, this.diffText, this.bricksText,
      this.goalText, this.mutatorText,
    ];
    this.onImmersive = ({ on }) => {
      this._immersive = on !== false;
      this.applyImmersive();
    };
    this.applyImmersive = () => {
      const show = !this._immersive || this._immersivePeek;
      this._immersiveHide.forEach((o) => o?.setAlpha?.(show ? 1 : 0));
    };
    this.applyImmersive();
    this.input.on('pointerdown', (p) => {
      if (!this._immersive || p.y > GAME.WALL_TOP) return;
      this._immersivePeek = true;
      this.applyImmersive();
      this.time.delayedCall(2200, () => {
        this._immersivePeek = false;
        this.applyImmersive();
      });
    });

    bus.on('hud:stats', this.onStats);
    bus.on('hud:flash', this.onFlash);
    bus.on('hud:life', this.onLife);
    bus.on('hud:hint', this.onHint);
    bus.on('hud:toast', this.onToast);
    bus.on('hud:scramble', this.onScramble);
    bus.on('hud:bulletTime', this.onBulletTime);
    bus.on('hud:gnomeStreak', this.onGnomeStreak);
    bus.on('hud:btMeter', this.onBtMeter);
    bus.on('hud:achieve', this.onAchieve);
    bus.on('hud:treasury', this.onTreasury);
    bus.on('hud:gambit', this.onGambit);
    bus.on('hud:mutators', this.onMutators);
    bus.on('hud:immersive', this.onImmersive);
    this.events.once('shutdown', () => {
      this._clearFlashTimers?.();
      this._clearToastTimers?.();
      bus.off('hud:stats', this.onStats);
      bus.off('hud:flash', this.onFlash); bus.off('hud:life', this.onLife);
      bus.off('hud:hint', this.onHint); bus.off('hud:toast', this.onToast);
      bus.off('hud:scramble', this.onScramble); bus.off('hud:bulletTime', this.onBulletTime);
      bus.off('hud:gnomeStreak', this.onGnomeStreak);
      bus.off('hud:btMeter', this.onBtMeter);
      bus.off('hud:achieve', this.onAchieve);
      bus.off('hud:treasury', this.onTreasury);
      bus.off('hud:gambit', this.onGambit);
      bus.off('hud:mutators', this.onMutators);
      bus.off('hud:immersive', this.onImmersive);
    });
  }

  drawLives(n) {
    this.livesC.removeAll(true);
    const portrait = GAME.IS_PORTRAIT;
    const x0 = GAME.SAFE_LEFT + uiPx(12, { min: 8, max: 14 });
    const y0 = this._chromeCy;
    const spacing = uiPx(portrait ? 22 : 28, { min: 18, max: 30 });
    const iconSize = uiPx(portrait ? 16 : 20, { min: 14, max: 22 });
    const max = Math.min(n, portrait ? 4 : 8);
    for (let i = 0; i < max; i++) {
      const key = this.textures.exists('heart-icon') ? 'heart-icon' : 'vaus';
      const img = this.add.image(x0 + i * spacing, y0, key)
        .setDisplaySize(key === 'heart-icon' ? iconSize : iconSize + 4, key === 'heart-icon' ? iconSize : iconSize * 0.5)
        .setTint(key === 'heart-icon' ? 0xffffff : PAL.accent);
      this.livesC.add(img);
    }
    if (n > max) {
      this.livesC.add(this.add.text(x0 + max * spacing, y0 - 5, '+' + (n - max), {
        ...orbitronStyle(12, PAL.textMuted),
      }).setOrigin(0, 0));
    }
  }

  _clearFlashTimers() {
    this._flashHideTimer?.remove(false);
    this._flashHideTimer = null;
    this.tweens.killTweensOf(this.flashText);
  }

  _clearToastTimers() {
    this._toastHideTimer?.remove(false);
    this._toastHideTimer = null;
    this.tweens.killTweensOf(this.toastText);
  }

  showFlash(f) {
    this._clearFlashTimers();
    if (!f?.text) {
      this.flashText.setAlpha(0).setText('');
      return;
    }
    const holdMs = Math.max(0, f.ms ?? 800);
    this.flashText.setFontSize(uiPx(64, { min: 28, max: 64 }));
    this.flashText.setText(f.text).setColor(f.color ?? cssHex(PAL.text)).setAlpha(1).setScale(0.8)
      .setShadow(0, 0, f.color ?? cssHex(PAL.text), 22, true, true);
    fitTextWidth(this.flashText, arenaWidth(), uiPx(22, { min: 18, max: 28 }));
    this.tweens.add({ targets: this.flashText, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this._flashHideTimer = this.time.delayedCall(holdMs, () => {
      this._flashHideTimer = null;
      this.tweens.killTweensOf(this.flashText);
      this.tweens.add({
        targets: this.flashText,
        alpha: { from: 1, to: 0 },
        duration: 300,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          if (this.flashText?.active) this.flashText.setAlpha(0).setText('');
        },
      });
    });
  }

  showToast(t) {
    this._clearToastTimers();
    if (!t?.text) {
      this.toastText.setAlpha(0).setText('');
      return;
    }
    const holdMs = Math.max(0, t.ms ?? 2000);
    this.toastText.setFontSize(uiPx(22, { min: 14, max: 22 }));
    this.toastText.setText(t.text).setAlpha(1);
    fitTextWidth(this.toastText, arenaWidth(), uiPx(12, { min: 11, max: 16 }));
    this._toastHideTimer = this.time.delayedCall(holdMs, () => {
      this._toastHideTimer = null;
      this.tweens.killTweensOf(this.toastText);
      this.tweens.add({
        targets: this.toastText,
        alpha: { from: 1, to: 0 },
        duration: 400,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          if (this.toastText?.active) this.toastText.setAlpha(0).setText('');
        },
      });
    });
  }
}
