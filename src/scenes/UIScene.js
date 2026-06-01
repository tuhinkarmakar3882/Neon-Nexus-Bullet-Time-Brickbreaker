import Phaser from 'phaser';
import { GAME, SCENES } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { makeButton } from '../utils/UI.js';
import { MetaProgress } from '../systems/MetaProgress.js';
import { tickBump } from '../utils/MicroFx.js';
import { clamp } from '../utils/Helpers.js';
import { arenaWidth, fitTextWidth, orbitronStyle, uiPx } from '../utils/Typography.js';
import { dismissBootSplash } from '../shell/BootSplash.js';
import { getGameplayUiLayout } from '../ui/gameplayUiLayout.js';

/** Parallel UI overlay — header / edge meters / in-play float HUD (Phaser 4). */
export class UIScene extends Phaser.Scene {
  constructor() { super({ key: SCENES.UI, active: false }); }

  create() {
    const bus = this.game.events;
    const portrait = GAME.IS_PORTRAIT;
    const arenaW = arenaWidth();
    this._useDomHud = !!GAME.USE_DOM_HUD;

    this._layout = getGameplayUiLayout();
    this._chromeH = GAME.UI_HEADER_H;
    this._chromeTop = this._layout.headerTop;
    this._chromeCy = this._layout.headerCy;
    this._pillW = uiPx(portrait ? 48 : 54, { min: 44, max: 60 });
    this._pillH = uiPx(22, { min: 20, max: 26 });
    this._livesCount = 0;
    this._brickProgress = 0;
    this._leftColW = Math.floor(this._layout.colW * 0.95);
    this._centerColW = Math.floor(this._layout.colW * 0.95);

    const pauseSize = this._layout.pauseSize;
    this._pauseSize = pauseSize;

    this.headerC = this.add.container(0, 0).setDepth(1005);
    this.leftEdgeC = this.add.container(0, 0).setDepth(1004);
    this.rightEdgeC = this.add.container(0, 0).setDepth(1004);
    this.floatHudC = this.add.container(0, 0).setDepth(1004);

    this._chromeGfx = this.add.graphics().setDepth(1002);
    this._leftEdgeGfx = this.add.graphics().setDepth(1003);
    this._rightEdgeGfx = this.add.graphics().setDepth(1003);
    this.leftEdgeC.add(this._leftEdgeGfx);
    this.rightEdgeC.add(this._rightEdgeGfx);

    this.livesC = this.add.container(0, 0).setDepth(1006);
    this.statusPillsC = this.add.container(0, 0).setDepth(1007);
    this._slowPill = this._createStatusPill('SLOW', 0x8ec5ff);
    this.statusPillsC.add(this._slowPill);
    this.headerC.add([this.livesC, this.statusPillsC]);

    this.scoreLabel = this.add.text(0, 0, 'SCORE', orbitronStyle(9, PAL.textMuted, {
      fontStyle: '700', letterSpacing: '0.16em',
    })).setOrigin(0.5, 1).setDepth(1006).setAlpha(0.85);
    this.scoreText = this.add.text(0, 0, '0', orbitronStyle(portrait ? 18 : 20, PAL.text, {
      fontStyle: '800',
    })).setOrigin(0.5, 0).setDepth(1006).setShadow(0, 0, cssHex(PAL.accent), 6, true, true);
    this.comboText = this.add.text(0, 0, '', orbitronStyle(12, cssHex(PAL.accent3), {
      fontStyle: '700', letterSpacing: '0.06em',
    })).setOrigin(0.5, 0).setDepth(1006);

    this.levelText = this.add.text(0, 0, '6', orbitronStyle(14, PAL.text, {
      fontStyle: '800', align: 'center',
    })).setOrigin(0.5, 0.5).setDepth(1006);
    this.metricLabel = this.add.text(0, 0, 'LV', orbitronStyle(8, PAL.textMuted, {
      fontStyle: '700', letterSpacing: '0.06em',
    })).setOrigin(1, 0.5).setDepth(1006);
    this.bricksText = this.add.text(0, 0, '0', orbitronStyle(13, cssHex(PAL.accent3), {
      fontStyle: '800', align: 'center',
    })).setOrigin(0, 0.5).setDepth(1006);
    this.bricksLabel = this.add.text(0, 0, 'BRK', orbitronStyle(7, PAL.textMuted, {
      fontStyle: '700', letterSpacing: '0.04em',
    })).setOrigin(1, 0.5).setDepth(1006);
    this.diffText = this.add.text(0, 0, '', orbitronStyle(9, cssHex(PAL.accent2), {
      fontStyle: '700', align: 'center', letterSpacing: '0.06em',
    })).setOrigin(0.5, 0).setDepth(1006).setAlpha(0);

    this._gemPill = this._createStatPill('gem-icon', 0x66ccff, '💎');
    this._leafPill = this._createStatPill('leaf-icon', 0x7eb87a, '🌿');

    const pauseDepth = 1010;
    if (this.textures.exists('pause-icon')) {
      this.pauseBtn = makeButton(this, 0, 0, '', () => this._onPauseTap(), {
        width: pauseSize, height: pauseSize, fontSize: '1px', depth: pauseDepth, compact: true, primary: false,
        activateOnDown: true,
      });
      this.pauseIcon = this.add.image(0, 0, 'pause-icon')
        .setDisplaySize(uiPx(18, { min: 16, max: 20 }), uiPx(18, { min: 16, max: 20 }))
        .setDepth(pauseDepth + 1).setTint(0xffffff);
    } else {
      this.pauseBtn = makeButton(this, 0, 0, 'II', () => this._onPauseTap(), {
        width: pauseSize, height: pauseSize, fontSize: '12px', depth: pauseDepth, compact: true, primary: false,
        activateOnDown: true,
      });
      this.pauseIcon = null;
    }

    this._meterTopY = this._layout.playTop + uiPx(6, { min: 4, max: 8 });
    this._meterBarH = Math.max(64, this._layout.playBottom - this._meterTopY - uiPx(12, { min: 8, max: 16 }));
    this._meterBarW = Math.max(4, GAME.UI_EDGE_W - 6);

    this.toastText = this.add.text(0, 0, '', {
      ...orbitronStyle(22, PAL.text, { fontStyle: 'bold', align: 'center', wordWrap: { width: arenaW } }),
    }).setOrigin(0.5).setAlpha(0).disableInteractive();
    this.floatHudC.add(this.toastText);

    this.flashText = this.add.text(0, 0, '', {
      ...orbitronStyle(64, PAL.text, { fontStyle: '900', align: 'center', wordWrap: { width: arenaW } }),
    }).setOrigin(0.5).setAlpha(0).disableInteractive();
    this.floatHudC.add(this.flashText);

    const hintMsg = portrait ? 'TAP TO LAUNCH' : 'TAP · CLICK · SPACE TO LAUNCH';
    this.hintText = this.add.text(0, 0, hintMsg, {
      ...orbitronStyle(22, PAL.text, { fontStyle: 'bold', align: 'center', wordWrap: { width: arenaW - 8 } }),
    }).setOrigin(0.5, 1).setAlpha(0).setDepth(1005);
    this.floatHudC.add(this.hintText);

    this.gnomeStreakGfx = this.add.graphics();
    this.btMeterGfx = this.add.graphics();
    this.leftEdgeC.add(this.gnomeStreakGfx);
    this.rightEdgeC.add(this.btMeterGfx);

    this._leftEdgeLabel = this.add.text(0, 0, 'GNOME', {
      ...orbitronStyle(8, PAL.textMuted, { fontStyle: '700' }),
    }).setOrigin(0.5).setAlpha(0.55).setAngle(-90);
    this._rightEdgeLabel = this.add.text(0, 0, 'NEXUS', {
      ...orbitronStyle(8, '#8ec5ff', { fontStyle: '700' }),
    }).setOrigin(0.5).setAlpha(0.55).setAngle(90);
    this.leftEdgeC.add(this._leftEdgeLabel);
    this.rightEdgeC.add(this._rightEdgeLabel);

    this.gnomeHit = this.add.rectangle(0, 0, GAME.UI_EDGE_W, this._meterBarH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.gnomeHit.on('pointerdown', () => bus.emit('req:gnome'));
    this.leftEdgeC.add(this.gnomeHit);

    this.nexusHit = this.add.rectangle(0, 0, GAME.UI_EDGE_W, this._meterBarH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.nexusHit.on('pointerdown', () => bus.emit('req:nexus'));
    this.rightEdgeC.add(this.nexusHit);

    this.comboCash = this.add.text(0, 0, '', {
      ...orbitronStyle(11, cssHex(PAL.gold), { fontStyle: 'bold' }),
    }).setOrigin(0, 0.5).setDepth(1006).setAlpha(0);
    this.comboCashHit = this.add.zone(0, this._chromeCy, 1, 1).setDepth(1006).setInteractive({ useHandCursor: true });
    this.comboCashHit.on('pointerdown', () => bus.emit('req:gambit'));
    this._gambitReady = false;

    const drawVertBar = (g, x, y, w, h, ratio, fill, ready) => {
      g.clear();
      g.fillStyle(0x1a2438, 0.55);
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

    this._drawEdgeChrome = () => {
      const L = getGameplayUiLayout();
      for (const g of [this._leftEdgeGfx, this._rightEdgeGfx]) {
        g?.clear();
      }
    };

    this.onBtMeter = (s) => {
      const ratio = clamp((s.value ?? 0) / (s.max || 100), 0, 1);
      const ready = ratio >= 1;
      const bx = -this._meterBarW / 2;
      const by = -this._meterBarH / 2;
      drawVertBar(this.btMeterGfx, bx, by, this._meterBarW, this._meterBarH, ratio, 0x4488ff, ready);
    };

    this.onGnomeStreak = (s) => {
      const ratio = clamp((s.value ?? 0) / (s.max || 100), 0, 1);
      const ready = ratio >= 1;
      const bx = -this._meterBarW / 2;
      const by = -this._meterBarH / 2;
      drawVertBar(
        this.gnomeStreakGfx, bx, by,
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

    const metaY = this._layout.playTop + uiPx(4, { min: 2, max: 6 });
    this.goalText = this.add.text(this._layout.arenaCx, metaY, '', {
      ...orbitronStyle(12, cssHex(PAL.accent3), { fontStyle: 'bold', align: 'center', wordWrap: { width: arenaW } }),
    }).setOrigin(0.5, 0).setDepth(1006);
    this.mutatorText = this.add.text(this._layout.arenaCx, metaY + uiPx(16, { min: 14, max: 18 }), '', {
      ...orbitronStyle(10, PAL.textMuted, { fontStyle: 'bold', align: 'center', wordWrap: { width: arenaW } }),
    }).setOrigin(0.5, 0).setDepth(1006);

    this.onTreasury = (payload) => this.refreshCurrency(payload);
    this.refreshCurrency = (payload) => {
      // DOM HUD is updated by React (useGameplayHudState) via hud:treasury from GameScene.
      // Never re-emit that event here — UIScene also listens and would stack-overflow.
      if (this._useDomHud) return;
      if (this._refreshingCurrency) return;
      this._refreshingCurrency = true;
      try {
        this._setPillValue(this._gemPill, MetaProgress.getGems());
        this._setPillValue(
          this._leafPill,
          payload?.value ?? MetaProgress.getTreasury(),
        );
        this.layoutAll();
      } finally {
        this._refreshingCurrency = false;
      }
    };
    this._fitCurrency = () => this.layoutAll();
    this._layoutComboCash = (scoreCx) => {
      if (!this.comboCash?.active || this.comboCash.alpha <= 0) return;
      const maxW = (this._scoreSlotW ?? 80) * 0.95;
      fitTextWidth(this.comboCash, maxW, 8);
      const y = this.scoreText.y + uiPx(10, { min: 8, max: 12 });
      this.comboCash.setPosition(scoreCx, y);
      this.comboCash.setOrigin(0.5, 0);
      const w = Math.max(48, this.comboCash.width + uiPx(8, { min: 6, max: 10 }));
      this.comboCashHit.setPosition(scoreCx, y + uiPx(10, { min: 8, max: 12 }));
      this.comboCashHit.setSize(w, uiPx(20, { min: 16, max: 22 }));
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
      this.comboCash.setText(ready ? `x${combo} · CASH IN` : `x${combo}`);
      this.comboCash.setAlpha(ready ? 1 : 0.5);
      if (ready) this.comboCashHit.setInteractive({ useHandCursor: true });
      else this.comboCashHit.disableInteractive();
      this._layoutComboCash(this._layout?.scoreCx ?? GAME.WIDTH / 2);
    };
    this.headerC.add([
      this.scoreLabel, this.scoreText, this.comboText,
      this.levelText, this.metricLabel, this.bricksText, this.bricksLabel,
      this._gemPill, this._leafPill, this.pauseBtn, this.pauseIcon,
      this.comboCash, this.comboCashHit,
    ].filter(Boolean));

    this._onResize = () => this.layoutAll();
    this.scale.on('resize', this._onResize, this);

    this.refreshCurrency();
    this._applyDomHudMode();
    this.layoutAll();

    this.time.delayedCall(0, () => {
      dismissBootSplash('Garden ready — launch when you are');
    });

    this.onGambit = () => {
      if (!this._gambitReady || !this.comboCash?.active) return;
      tickBump(this, this.comboCash);
    };
    this.onMutators = (ids) => {
      if (this._useDomHud) return;
      if (!ids?.length) { this.mutatorText.setText(''); return; }
      this.mutatorText.setText(ids.map((id) => id.replace(/([A-Z])/g, ' $1').trim()).join(' · ').toUpperCase());
      fitTextWidth(this.mutatorText, arenaWidth(), uiPx(9, { min: 8, max: 11 }));
    };

    this.onStats = (s) => {
      if (this._useDomHud) {
        this._livesCount = s.lives ?? 0;
        if (typeof s.brickProgress === 'number') this._brickProgress = s.brickProgress;
        return;
      }
      if (s.score > (this._lastScore ?? 0)) tickBump(this, this.scoreText);
      this._lastScore = s.score;
      this.scoreText.setText(s.score.toLocaleString());
      fitTextWidth(this.scoreText, this._scoreSlotW ?? this._layout?.scoreSlotW ?? this._centerColW, uiPx(18, { min: 14, max: 20 }));
      this.levelText.setText(String(s.level ?? 1));
      if (s.level !== this._lastLevel) {
        tickBump(this, this.levelText);
        this._lastLevel = s.level;
      }
      this.bricksText.setText(String(s.bricksLeft ?? 0));
      fitTextWidth(this.bricksText, uiPx(36, { min: 28, max: 44 }), uiPx(12, { min: 10, max: 14 }));
      this.comboText.setText(s.combo > 1 ? `×${s.combo}` : '');
      fitTextWidth(this.comboText, this._scoreSlotW ?? this._layout?.scoreSlotW ?? this._centerColW, uiPx(11, { min: 9, max: 12 }));
      this._updateComboCash(s.combo ?? 0);
      if (s.goalText) {
        this.goalText.setText(s.goalText);
        fitTextWidth(this.goalText, arenaW, uiPx(10, { min: 9, max: 12 }));
      } else {
        this.goalText.setText('');
      }
      if (s.combo >= 2) {
        this.tweens.add({ targets: this.comboText, scaleX: 1.15, scaleY: 1.15, duration: 100, yoyo: true });
      }
      if (typeof s.brickProgress === 'number') {
        this._brickProgress = s.brickProgress;
      }
      this._livesCount = s.lives ?? 0;
      this.drawLives(s.lives);
      this.refreshCurrency();
      this.layoutAll();
    };
    this.onFlash = (f) => this.showFlash(f);
    this.onLife = () => {
      if (this._useDomHud) return;
      this.tweens.add({ targets: this.livesC, scaleX: 1.25, scaleY: 1.25, yoyo: true, duration: 200 });
    };
    this.onHint = (show) => {
      this.tweens.killTweensOf(this.hintText);
      if (!show) {
        this.hintText.setAlpha(0);
        return;
      }
      this.hintText.setAlpha(0.9);
      this.tweens.add({
        targets: this.hintText,
        alpha: { from: 0.55, to: 0.95 },
        duration: 720,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    };
    this.onToast = (t) => {
      this.showToast(t);
    };
    this.onScramble = (on) => {
      if (this._useDomHud) return;
      const scrambleTargets = [this.scoreText, this.scoreLabel, this.levelText, this.bricksText, this.diffText, this.comboText].filter(Boolean);
      if (on) {
        this.scrambleTween?.stop();
        this.scrambleTween?.remove();
        this.scrambleTween = this.tweens.add({
          targets: scrambleTargets,
          alpha: { from: 0.35, to: 1 },
          duration: 140,
          yoyo: true,
          repeat: -1,
        });
      } else {
        this.scrambleTween?.stop();
        this.scrambleTween?.remove();
        this.scrambleTween = null;
        this.tweens.killTweensOf(scrambleTargets);
        scrambleTargets.forEach((t) => t.setAlpha(1).setScale(1));
      }
    };
    this.onBulletTime = (bt) => {
      const active = !!bt?.active;
      this._setStatusPillVisible(this._slowPill, active, bt?.nexus ? 'NEXUS' : 'SLOW');
    };

    this._immersive = true;
    this._immersivePeek = false;
    // Immersive hides secondary chrome — score, gems & lives stay visible during play.
    this._immersiveHide = [
      this.metricLabel, this.levelText, this.bricksLabel, this.bricksText,
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
      this._immersivePeekTimer?.remove(false);
      this._immersivePeekTimer = this.time.delayedCall(2200, () => {
        this._immersivePeekTimer = null;
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
    this._onPauseReq = () => {
      this.dismissOverlays();
      this.hintText?.setAlpha(0);
    };
    bus.on('req:pause', this._onPauseReq);
    this.events.once('shutdown', () => {
      this._clearFlashTimers?.();
      this._clearToastTimers?.();
      this._immersivePeekTimer?.remove(false);
      this._immersivePeekTimer = null;
      bus.off('req:pause', this._onPauseReq);
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
      this.scale.off('resize', this._onResize, this);
    });
  }

  _createStatusPill(label, accent) {
    const c = this.add.container(0, 0).setAlpha(0);
    const bg = this.add.graphics();
    const txt = this.add.text(0, 0, label, orbitronStyle(10, accent, {
      fontStyle: '800', letterSpacing: '0.08em',
    })).setOrigin(0.5);
    c.add([bg, txt]);
    c.bg = bg;
    c.txt = txt;
    c.accent = accent;
    c._label = label;
    return c;
  }

  _setStatusPillVisible(pill, on, label) {
    if (!pill) return;
    pill.txt.setText(label ?? pill._label);
    const w = Math.max(uiPx(44, { min: 40, max: 56 }), pill.txt.width + uiPx(14, { min: 10, max: 16 }));
    const h = uiPx(22, { min: 18, max: 24 });
    pill.bg.clear();
    pill.bg.fillStyle(0x121830, on ? 0.92 : 0);
    pill.bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    if (on) {
      pill.bg.lineStyle(1, pill.accent, 0.7);
      pill.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    }
    this.tweens.killTweensOf(pill);
    pill.setAlpha(on ? 1 : 0);
  }

  _pulseStatusPill(pill, ms = 800) {
    this._setStatusPillVisible(pill, true);
    this.time.delayedCall(ms, () => this._setStatusPillVisible(pill, false));
  }

  /** Hide Phaser chrome when React DOM HUD owns header + edge meters. */
  _applyDomHudMode() {
    if (!this._useDomHud) return;
    const hide = [
      this._chromeGfx,
      this.headerC,
      this.leftEdgeC,
      this.rightEdgeC,
      this.pauseBtn,
      this.pauseIcon,
      this.goalText,
      this.mutatorText,
    ];
    hide.forEach((o) => o?.setVisible?.(false));
  }

  /** Float-only layout when header/rails are in React. */
  _layoutDomHud(L) {
    const arenaCx = L.arenaCx;
    const hintY = GAME.ARENA_FLOOR - GAME.PADDLE_Y_OFFSET * 0.35;
    this.floatHudC.setPosition(arenaCx, L.playCy);
    this.hintText.setPosition(0, hintY - L.playCy);
    this.toastText.setPosition(0, uiPx(8, { min: 4, max: 12 }));
    this.flashText.setPosition(0, -uiPx(24, { min: 16, max: 32 }));
    this._drawEdgeChrome();
  }

  /** Responsive layout — uses GAME.* from scale / LayoutManager. */
  layoutAll() {
    this._layout = getGameplayUiLayout();
    const L = this._layout;
    if (this._useDomHud) {
      this._layoutDomHud(L);
      return;
    }
    const cy = L.headerCy;
    this._chromeTop = L.headerTop;
    this._chromeCy = cy;
    this._chromeH = L.headerH;
    this._scoreSlotW = L.scoreSlotW;
    this._leftColW = Math.floor(L.colW * 0.95);
    this._centerColW = Math.floor(L.colW * 0.95);
    this._meterTopY = L.playTop + uiPx(4, { min: 2, max: 6 });
    this._meterBarH = Math.max(64, L.playBottom - this._meterTopY - uiPx(8, { min: 6, max: 12 }));

    const pauseX = L.pauseCx;
    this.pauseBtn?.setPosition(pauseX, cy);
    this.pauseIcon?.setPosition(pauseX, cy);

    const portrait = GAME.IS_PORTRAIT;
    const maxLives = portrait ? 4 : 7;
    const livesSpacing = uiPx(14, { min: 12, max: 18 });

    const pillY = L.headerTop + uiPx(7, { min: 5, max: 9 });
    this._slowPill.setPosition(L.scoreCx - uiPx(42, { min: 36, max: 48 }), pillY);

    this.scoreLabel.setPosition(L.scoreCx, cy - uiPx(8, { min: 6, max: 10 }));
    this.scoreText.setPosition(L.scoreCx, cy + uiPx(5, { min: 3, max: 7 }));
    this.scoreText.setOrigin(0.5, 0.5);
    this.comboText.setPosition(L.scoreCx, cy + uiPx(12, { min: 10, max: 14 }));

    this._layoutLevelRow(L.levelCx, cy);

    const gemW = this._gemPill._w ?? this._pillW;
    const leafW = this._leafPill._w ?? this._pillW;
    const gemsGap = uiPx(3, { min: 2, max: 4 });
    const pairW = gemW + leafW + gemsGap;
    const pairStart = L.currencyCx - pairW / 2;
    this._positionPill(this._gemPill, pairStart + gemW / 2, cy);
    this._positionPill(this._leafPill, pairStart + gemW + gemsGap + leafW / 2, cy);

    const edgeCy = L.playTop + L.playH / 2;
    this.leftEdgeC.setPosition(L.leftEdgeCx, edgeCy);
    this.rightEdgeC.setPosition(L.rightEdgeCx, edgeCy);
    this.gnomeHit.setSize(GAME.UI_EDGE_W, this._meterBarH);
    this.nexusHit.setSize(GAME.UI_EDGE_W, this._meterBarH);
    this._leftEdgeLabel.setPosition(0, 0);
    this._rightEdgeLabel.setPosition(0, 0);

    const arenaCx = L.arenaCx;
    const hintY = GAME.ARENA_FLOOR - GAME.PADDLE_Y_OFFSET * 0.35;
    this.floatHudC.setPosition(arenaCx, L.playCy);
    this.hintText.setPosition(0, hintY - L.playCy);
    this.toastText.setPosition(0, uiPx(8, { min: 4, max: 12 }));
    this.flashText.setPosition(0, -uiPx(24, { min: 16, max: 32 }));

    const metaY = L.playTop + uiPx(4, { min: 2, max: 6 });
    this.goalText?.setPosition(arenaCx, metaY);
    this.mutatorText?.setPosition(arenaCx, metaY + uiPx(14, { min: 12, max: 16 }));

    this._drawChromePlate();
    this._drawEdgeChrome();
    this.drawLives(this._livesCount);
    const shown = Math.min(this._livesCount, maxLives);
    const livesSpan = shown > 0 ? (shown - 1) * livesSpacing : 0;
    this.livesC.setPosition(L.livesCx - livesSpan / 2, cy);
    this._layoutComboCash(L.scoreCx);
  }

  _createStatPill(iconKey, accent, fallback) {
    const c = this.add.container(0, 0).setDepth(1006);
    const bg = this.add.graphics();
    let icon;
    if (this.textures.exists(iconKey)) {
      icon = this.add.image(0, 0, iconKey).setDisplaySize(uiPx(14, { min: 12, max: 16 }), uiPx(14, { min: 12, max: 16 }));
      icon.setTint(accent);
    } else {
      icon = this.add.text(0, 0, fallback, orbitronStyle(12, accent, { fontStyle: '700' })).setOrigin(0.5);
    }
    const val = this.add.text(0, 0, '0', orbitronStyle(13, PAL.text, { fontStyle: '700' })).setOrigin(0, 0.5);
    c.add([bg, icon, val]);
    c.bg = bg;
    c.icon = icon;
    c.val = val;
    c.accent = accent;
    return c;
  }

  _setPillValue(pill, n) {
    if (!pill?.val) return;
    pill.val.setText(n.toLocaleString());
    const iconOff = uiPx(10, { min: 8, max: 12 });
    const textW = pill.val.width;
    const innerW = iconOff + textW + uiPx(10, { min: 8, max: 12 });
    const w = Math.max(this._pillW * 0.85, innerW);
    const h = this._pillH;
    pill.bg.clear();
    pill.bg.fillStyle(0x0e1428, 0.92);
    pill.bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    pill.bg.lineStyle(1, pill.accent, 0.55);
    pill.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    pill._w = w;
    pill.icon.setPosition(-w / 2 + iconOff, 0);
    pill.val.setPosition(-w / 2 + iconOff + uiPx(14, { min: 12, max: 16 }), 0);
  }

  _positionPill(pill, x, y) {
    pill.setPosition(x, y);
  }

  /** Center LV + bricks cluster in the level column. */
  _layoutLevelRow(cx, cy) {
    const gap = uiPx(3, { min: 2, max: 4 });
    const sep = uiPx(6, { min: 4, max: 8 });
    const wLv = this.metricLabel.width + gap + this.levelText.width;
    const wBr = this.bricksLabel.width + gap + this.bricksText.width;
    let x = cx - (wLv + sep + wBr) / 2;
    this.metricLabel.setPosition(x + this.metricLabel.width, cy);
    x += this.metricLabel.width + gap;
    this.levelText.setPosition(x + this.levelText.width / 2, cy);
    x += this.levelText.width + sep;
    this.bricksLabel.setPosition(x + this.bricksLabel.width, cy);
    x += this.bricksLabel.width + gap;
    this.bricksText.setPosition(x, cy);
  }

  _drawChromePlate() {
    const g = this._chromeGfx;
    if (!g) return;
    const L = this._layout ?? getGameplayUiLayout();
    const padL = L.padX;
    const padR = L.padR;
    const W = GAME.WIDTH;
    const top = this._chromeTop;
    const w = W - padL - padR;
    const h = this._chromeH;
    g.clear();
    g.fillStyle(0x0c101c, 0.92);
    const r = Math.min(10, h / 2);
    g.fillRoundedRect(padL, top, w, h, r);
    for (let i = 1; i < 4; i++) {
      const x = L.rowLeft + L.colW * i;
      g.lineStyle(1, 0x4488ff, 0.07);
      g.lineBetween(x, top + 5, x, top + h - 5);
    }
  }

  drawLives(n) {
    this.livesC.removeAll(true);
    const portrait = GAME.IS_PORTRAIT;
    const x0 = 0;
    const y0 = 0;
    const spacing = uiPx(14, { min: 12, max: 16 });
    const iconSize = uiPx(portrait ? 15 : 16, { min: 13, max: 18 });
    const max = Math.min(n, portrait ? 4 : 7);
    for (let i = 0; i < max; i++) {
      const key = this.textures.exists('heart-icon') ? 'heart-icon' : 'vaus';
      const hx = x0 + i * spacing;
      if (key === 'heart-icon') {
        const glow = this.add.image(hx, y0, key)
          .setDisplaySize(iconSize + 6, iconSize + 6)
          .setTint(0xff6b8a)
          .setAlpha(0.35);
        this.livesC.add(glow);
      }
      const img = this.add.image(hx, y0, key)
        .setDisplaySize(key === 'heart-icon' ? iconSize : iconSize + 4, key === 'heart-icon' ? iconSize : iconSize * 0.5)
        .setTint(key === 'heart-icon' ? 0xff6b8a : PAL.accent);
      this.livesC.add(img);
    }
    if (n > max) {
      this.livesC.add(this.add.text(x0 + max * spacing, y0, `+${n - max}`, {
        ...orbitronStyle(11, PAL.textMuted, { fontStyle: '700' }),
      }).setOrigin(0, 0.5));
    }
    this._livesCount = n;
  }

  _clearFlashTimers() {
    this._flashHideTimer?.remove(false);
    this._flashHideTimer = null;
    this._flashHideAt = 0;
    this.tweens.killTweensOf(this.flashText);
  }

  _clearToastTimers() {
    this._toastHideTimer?.remove(false);
    this._toastHideTimer = null;
    this._toastHideAt = 0;
    this.tweens.killTweensOf(this.toastText);
  }

  /** Immediately hide flash + toast — never blocks pause. */
  dismissOverlays() {
    this._clearFlashTimers();
    this._clearToastTimers();
    if (this.flashText?.active) this.flashText.setAlpha(0).setText('').setScale(1);
    if (this.toastText?.active) this.toastText.setAlpha(0).setText('');
  }

  _onPauseTap() {
    this.dismissOverlays();
    this.game.events.emit('req:pause');
  }

  _hideFlash() {
    this._flashHideTimer = null;
    this._flashHideAt = 0;
    this.tweens.killTweensOf(this.flashText);
    if (!this.flashText?.active) return;
    if (this.flashText.alpha <= 0.01) {
      this.flashText.setAlpha(0).setText('');
      return;
    }
    this.tweens.add({
      targets: this.flashText,
      alpha: { from: this.flashText.alpha, to: 0 },
      duration: 280,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        if (this.flashText?.active) this.flashText.setAlpha(0).setText('').setScale(1);
      },
    });
  }

  _hideToast() {
    this._toastHideTimer = null;
    this._toastHideAt = 0;
    this.tweens.killTweensOf(this.toastText);
    if (!this.toastText?.active) return;
    if (this.toastText.alpha <= 0.01) {
      this.toastText.setAlpha(0).setText('');
      return;
    }
    this.tweens.add({
      targets: this.toastText,
      alpha: { from: this.toastText.alpha, to: 0 },
      duration: 420,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        if (this.toastText?.active) this.toastText.setAlpha(0).setText('');
      },
    });
  }

  showFlash(f) {
    this._clearFlashTimers();
    if (!f?.text) {
      this.dismissOverlays();
      return;
    }
    const holdMs = Math.min(Math.max(0, f.ms ?? 800), 9000);
    this._flashHideAt = Date.now() + holdMs;
    this.flashText.setFontSize(uiPx(64, { min: 28, max: 64 }));
    this.flashText.setText(f.text).setColor(f.color ?? cssHex(PAL.text)).setAlpha(1).setScale(0.8)
      .setShadow(0, 0, f.color ?? cssHex(PAL.text), 22, true, true);
    fitTextWidth(this.flashText, arenaWidth(), uiPx(22, { min: 18, max: 28 }));
    this.tweens.add({ targets: this.flashText, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this._flashHideTimer = this.time.delayedCall(holdMs, () => this._hideFlash());
  }

  showToast(t) {
    this._clearToastTimers();
    if (!t?.text) {
      if (this.toastText?.active) this.toastText.setAlpha(0).setText('');
      return;
    }
    const holdMs = Math.min(Math.max(0, t.ms ?? 900), 12000);
    this._toastHideAt = Date.now() + holdMs;
    this.toastText.setFontSize(uiPx(22, { min: 14, max: 22 }));
    this.toastText.setText(t.text).setAlpha(1);
    fitTextWidth(this.toastText, arenaWidth(), uiPx(12, { min: 11, max: 16 }));
    this._toastHideTimer = this.time.delayedCall(holdMs, () => this._hideToast());
  }

  update() {
    const now = Date.now();
    if (this._flashHideAt && now >= this._flashHideAt && this.flashText?.alpha > 0) {
      this._hideFlash();
    }
    if (this._toastHideAt && now >= this._toastHideAt && this.toastText?.alpha > 0) {
      this._hideToast();
    }
  }
}

export { UIScene as HUDScene };
