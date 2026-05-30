import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { makeButton } from '../utils/UI.js';
import { categoryColor, powerDisplayName } from '../config/PowerUps.js';
import { tickBump, popScale } from '../utils/MicroFx.js';
import { clamp } from '../utils/Helpers.js';

export class HUDScene extends Phaser.Scene {
  constructor() { super({ key: SCENES.HUD, active: false }); }

  create() {
    const W = GAME.WIDTH;
    const bus = this.game.events;
    const barH = Math.min(150, GAME.WALL_TOP - 16);

    const bar = this.add.graphics();
    bar.fillStyle(0x080b16, 0.55); bar.fillRoundedRect(10, 10 + GAME.SAFE_TOP * 0.3, W - 20, barH, 16);
    bar.lineStyle(1, PAL.accent, 0.22); bar.strokeRoundedRect(10, 10 + GAME.SAFE_TOP * 0.3, W - 20, barH, 16);
    this._barGfx = bar;

    const ls = (size, color) => ({ fontFamily: 'Orbitron, monospace', fontSize: size, color, fontStyle: 'bold' });
    const topPad = 10 + GAME.SAFE_TOP * 0.3;

    this.scoreText = this.add.text(34, topPad + 16, '0', ls('36px', PAL.text));
    this.add.text(34, topPad + 8, 'SCORE', ls('14px', PAL.textMuted));
    this.comboText = this.add.text(34, topPad + 58, '', ls('20px', cssHex(PAL.accent3)));

    this.levelText = this.add.text(W / 2, topPad + 20, 'LV 1', ls('28px', PAL.text)).setOrigin(0.5, 0);
    this.diffText = this.add.text(W / 2, topPad + 48, '', ls('12px', cssHex(PAL.accent3))).setOrigin(0.5, 0);
    this.bricksText = this.add.text(W / 2, topPad + 64, 'BRICKS 0', ls('16px', PAL.textMuted)).setOrigin(0.5, 0);

    this.add.text(W - 150, topPad + 8, 'SHIPS', ls('14px', PAL.textMuted)).setOrigin(0, 0).setAlpha(0);
    this.livesC = this.add.container(0, 0).setDepth(1006);

    if (this.textures.exists('pause-icon')) {
      this.pauseBtn = makeButton(this, W - 44, topPad + 22, '', () => bus.emit('req:pause'), {
        width: 48, height: 40, fontSize: '1px', depth: 1002,
      });
      this.add.image(W - 44, topPad + 22, 'pause-icon').setDisplaySize(28, 28).setDepth(1003);
    } else {
      this.pauseBtn = makeButton(this, W - 44, topPad + 22, 'II', () => bus.emit('req:pause'), {
        width: 48, height: 40, fontSize: '18px', depth: 1002,
      });
    }

    this.chips = this.add.container(0, GAME.WALL_TOP + 8).setDepth(1006);
    this.toastText = this.add.text(W / 2, GAME.HEIGHT * 0.55, '', ls('22px', PAL.text)).setOrigin(0.5).setAlpha(0).setDepth(1005);

    this.flashText = this.add.text(W / 2, GAME.HEIGHT * 0.4, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '64px', fontStyle: '900', color: PAL.text, align: 'center', wordWrap: { width: W * 0.9 },
    }).setOrigin(0.5).setAlpha(0);

    this.hintText = this.add.text(W / 2, GAME.HEIGHT - GAME.PADDLE_Y_OFFSET - 80, 'TAP / CLICK / SPACE TO LAUNCH', ls('22px', PAL.text)).setOrigin(0.5).setAlpha(0);

    // Vertical side meters — left/right margins, outside the play field
    const meterTop = GAME.WALL_TOP + 12;
    const meterBottom = GAME.HEIGHT - GAME.PADDLE_Y_OFFSET - 64;
    this._meterBarH = Math.max(88, meterBottom - meterTop);
    this._meterBarW = 10;
    this._leftMeterX = 6 + GAME.SAFE_LEFT;
    this._rightMeterX = W - 6 - GAME.SAFE_RIGHT - this._meterBarW;
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

    this.treasuryText = this.add.text(this._leftMeterX + this._meterBarW / 2, meterBottom + 22, '', {
      ...ls('9px', cssHex(PAL.gold)), align: 'center',
    }).setOrigin(0.5, 0).setDepth(1004);

    this.gambitBtn = makeButton(this, this._leftMeterX + this._meterBarW / 2, meterBottom + 38, 'CASH', () => bus.emit('req:gambit'), {
      width: 64, height: 28, fontSize: '10px', primary: false, depth: 1004,
    }).setAlpha(0);

    this.btText = this.add.text(this._rightMeterX + this._meterBarW / 2, meterTop + this._meterBarH * 0.5, 'SLOW-MO', {
      fontFamily: 'Orbitron, monospace', fontSize: '10px', fontStyle: '900', color: '#8ec5ff',
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
    this.goalText = this.add.text(W / 2, metaY, '', ls('13px', cssHex(PAL.accent3))).setOrigin(0.5, 0);
    this.mutatorText = this.add.text(W / 2, metaY + 18, '', ls('11px', PAL.textMuted)).setOrigin(0.5, 0);

    this.onTreasury = (t) => this.treasuryText.setText(`🌿 ${t.value ?? 0}`);
    this.onGambit = (g) => {
      this.gambitBtn.setAlpha(g?.combo >= 8 ? 0.95 : 0);
    };
    this.onMutators = (ids) => {
      if (!ids?.length) { this.mutatorText.setText(''); return; }
      this.mutatorText.setText(ids.map((id) => id.replace(/([A-Z])/g, ' $1').trim()).join(' · ').toUpperCase());
    };

    this.onStats = (s) => {
      if (s.score > (this._lastScore ?? 0)) tickBump(this, this.scoreText);
      this._lastScore = s.score;
      this.scoreText.setText(String(s.score));
      this.levelText.setText('LV ' + s.level);
      if (s.level !== this._lastLevel) {
        tickBump(this, this.levelText);
        this._lastLevel = s.level;
      }
      const diff = s.difficulty ?? 1;
      const band = s.band ? ` · ${s.band}` : '';
      this.diffText.setText('▮'.repeat(Math.min(diff, 10)) + band);
      this.bricksText.setText('BRICKS ' + s.bricksLeft);
      this.comboText.setText(s.combo > 1 ? `COMBO x${s.combo}` : '');
      if (s.goalText) this.goalText.setText(s.goalText);
      if (s.combo >= 2) {
        this.tweens.add({ targets: this.comboText, scaleX: 1.2, scaleY: 1.2, duration: 100, yoyo: true });
      }
      this.drawLives(s.lives);
    };
    this.onPowers = (list) => this.drawChips(list);
    this.onFlash = (f) => this.showFlash(f);
    this.onLife = () => this.tweens.add({ targets: this.livesC, scaleX: 1.25, scaleY: 1.25, yoyo: true, duration: 200 });
    this.onHint = (show) => this.hintText.setAlpha(show ? 0.85 : 0);
    this.onToast = (t) => {
      if (!t?.text) return;
      this.toastText.setText(t.text).setAlpha(1);
      this.tweens.add({ targets: this.toastText, alpha: 0, delay: t.ms ?? 2000, duration: 400 });
    };
    this.onScramble = (on) => {
      if (on) {
        this.scrambleTween = this.tweens.add({
          targets: [this.scoreText, this.levelText, this.bricksText],
          alpha: { from: 0.25, to: 1 },
          duration: 120,
          yoyo: true,
          repeat: -1,
        });
      } else {
        this.scrambleTween?.stop();
        this.scoreText.setAlpha(1);
        this.levelText.setAlpha(1);
        this.bricksText.setAlpha(1);
      }
    };
    this.onBulletTime = (bt) => {
      if (!this.btText) return;
      this.tweens.killTweensOf(this.btText);
      if (!bt?.active) {
        this.tweens.add({ targets: this.btText, alpha: 0, duration: 120 });
        return;
      }
      this.btText.setAlpha(0.55 + 0.35 * (bt.ratio ?? 1));
      this.tweens.add({
        targets: this.btText,
        alpha: { from: 0.5, to: 1 },
        scaleX: { from: 0.96, to: 1.04 },
        scaleY: { from: 0.96, to: 1.04 },
        duration: 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    };

    this._immersive = true;
    this._immersivePeek = false;
    // Top bar chrome hidden in immersive — lives, power chips & side meters stay visible.
    this._immersiveHide = [
      bar, this.scoreText, this.comboText, this.levelText, this.diffText, this.bricksText,
      this.goalText, this.mutatorText,
    ];
    this.onImmersive = ({ on }) => {
      this._immersive = on !== false;
      this.applyImmersive();
    };
    this.applyImmersive = () => {
      const show = !this._immersive || this._immersivePeek;
      this._immersiveHide.forEach((o) => o?.setAlpha?.(show ? 1 : 0));
      if (this.pauseBtn) this.pauseBtn.setAlpha(this._immersive && !this._immersivePeek ? 0.35 : 1);
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
    bus.on('hud:powers', this.onPowers);
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
      bus.off('hud:stats', this.onStats); bus.off('hud:powers', this.onPowers);
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
    const x0 = GAME.WALL_X + 36;
    const y0 = GAME.WALL_TOP + 22;
    const max = Math.min(n, 8);
    for (let i = 0; i < max; i++) {
      const key = this.textures.exists('heart-icon') ? 'heart-icon' : 'vaus';
      const img = this.add.image(x0 + i * 30, y0, key)
        .setDisplaySize(key === 'heart-icon' ? 22 : 26, key === 'heart-icon' ? 22 : 12)
        .setTint(key === 'heart-icon' ? 0xffffff : PAL.accent);
      this.livesC.add(img);
    }
    if (n > 8) {
      this.livesC.add(this.add.text(x0 + 8 * 30, y0 - 8, '+' + (n - 8), {
        fontFamily: 'Orbitron', fontSize: '14px', color: PAL.textMuted,
      }).setOrigin(0, 0));
    }
  }

  drawChips(list) {
    this.chips.removeAll(true);
    const chipW = 132;
    const chipH = 30;
    const gap = 7;
    const iconR = 12;
    const perRow = Math.max(1, Math.floor((GAME.WIDTH - GAME.WALL_X * 2 - 20) / (chipW + gap)));
    list.forEach((p, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const rowCount = Math.min(perRow, list.length - row * perRow);
      const rowW = rowCount * (chipW + gap) - gap;
      const x = (GAME.WIDTH - rowW) / 2 + col * (chipW + gap);
      const y = row * (chipH + gap);
      const c = this.add.container(x, y);
      const fill = p.color ?? 0x2fe6c7;
      const cat = p.categoryColor ?? categoryColor(p.category ?? 'paddle');
      const neg = p.polarity === 'neg';
      const label = powerDisplayName(p.key);

      const g = this.add.graphics();
      g.fillStyle(0x120818, 0.88);
      g.fillRoundedRect(0, 0, chipW, chipH, 7);
      g.lineStyle(1.5, neg ? PAL.powerNeg : fill, 0.92);
      g.strokeRoundedRect(0, 0, chipW, chipH, 7);
      g.fillStyle(cat, 1);
      g.fillRoundedRect(0, 3, 3, chipH - 6, 2);
      g.fillStyle(fill, 0.65);
      g.fillRoundedRect(4, chipH - 4, Math.max(4, (chipW - 8) * p.ratio), 2, 1);
      c.add(g);

      const iconBg = this.add.graphics();
      iconBg.fillStyle(fill, 1);
      iconBg.fillCircle(iconR + 5, chipH / 2, iconR);
      iconBg.lineStyle(1, 0xffffff, 0.35);
      iconBg.strokeCircle(iconR + 5, chipH / 2, iconR);
      c.add(iconBg);

      if (p.icon && this.textures.exists(p.icon)) {
        c.add(this.add.image(iconR + 5, chipH / 2, p.icon).setDisplaySize(14, 14).setTint(0xffffff));
      } else {
        c.add(this.add.text(iconR + 5, chipH / 2 - 1, p.short ?? '?', {
          fontFamily: 'Orbitron, monospace',
          fontSize: '10px',
          fontStyle: '900',
          color: '#120818',
        }).setOrigin(0.5));
      }

      c.add(this.add.text(iconR * 2 + 10, chipH / 2 - 1, label, {
        fontFamily: 'Orbitron, monospace',
        fontSize: '11px',
        fontStyle: '800',
        color: neg ? cssHex(PAL.powerNeg) : cssHex(fill),
      }).setOrigin(0, 0.5));

      this.chips.add(c);
      popScale(this, c, { peak: 1.05, dur: 100, from: 0.9 });
    });
  }

  showFlash(f) {
    if (!f || !f.text) { this.flashText.setAlpha(0); return; }
    this.tweens.killTweensOf(this.flashText);
    this.flashText.setText(f.text).setColor(f.color).setAlpha(1).setScale(0.8).setShadow(0, 0, f.color, 22, true, true);
    this.tweens.add({ targets: this.flashText, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.flashText, alpha: 0, delay: f.ms, duration: 300 });
  }
}
