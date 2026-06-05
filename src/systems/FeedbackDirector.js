/** Orchestrates VFX + SFX + haptics per gameplay moment — one timeline per event. */

import { GAME } from '../config/Constants.js';
import {
  fxAtLeast,
  fxConfettiCount,
  fxReduced,
  fxShake,
  fxBurstMax,
  fxSpatialPan,
  fxComboFx,
  fxCameraShake,
} from '../utils/FxBudget.js';
import { PAL, cssHex } from '../config/Palette.js';
import { powerFillColor } from '../config/PowerUps.js';
import { audio } from './AudioManager.js';
import { hapticPulse, hapticPattern } from './Haptics.js';
import {
  brickBreakFx, surgeText, hitSpark, rippleRing,
  powerAcquireBurst, powerPickupFx, squashStretch, popScale, wobble,
  launchBurst, shardBurst, risePop, microShake, tileChipBurst,
} from '../utils/MicroFx.js';
import { bumpBloom, pulseChroma } from '../utils/SceneVfx.js';
import {
  impactFlash, radialBlast, screenPunch, setArenaDim,
} from '../utils/BulletTimeFx.js';
import { spawnConfetti } from '../utils/UI.js';

const COMBO_MILESTONES = [8, 16, 24, 32];
const COALESCE_DIST = 40;

export class FeedbackDirector {
  constructor(scene) {
    this.scene = scene;
    this._burstUsed = 0;
    this._burstFrame = -1;
    this._pendingBursts = [];
    this._lastComboPos = { x: GAME.WIDTH / 2, y: GAME.HEIGHT * 0.4 };
  }

  get settings() {
    return this.scene?.settings ?? {};
  }

  resetBurstBudget(frame) {
    if (frame !== this._burstFrame) {
      this._burstFrame = frame;
      this._burstUsed = 0;
      this._flushCoalescedBursts();
    }
  }

  panX(x) {
    if (!fxSpatialPan(this.scene)) return undefined;
    return x ?? GAME.WIDTH / 2;
  }

  schedule(ms, fn) {
    this.scene?.time?.delayedCall?.(ms, fn);
  }

  /** Staged callback — frame 0 / ~2 / ~8 ms slots at 60fps-ish. */
  stage({ at0, at2, at8, at16 }) {
    at0?.();
    if (at2) this.schedule(2, at2);
    if (at8) this.schedule(8, at8);
    if (at16) this.schedule(16, at16);
  }

  requestBurst(x, y, color, count = 8, heavy = false) {
    const scene = this.scene;
    if (!scene || !this.settings.particles) return;
    const frame = scene.frame ?? 0;
    if (frame !== this._burstFrame) this.resetBurstBudget(frame);

    const existing = this._pendingBursts.find(
      (b) => Math.hypot(b.x - x, b.y - y) < COALESCE_DIST,
    );
    if (existing) {
      existing.count = Math.max(existing.count, count);
      existing.heavy = existing.heavy || heavy;
      existing.n += 1;
      return;
    }

    if (this._burstUsed >= fxBurstMax(scene)) return;
    this._pendingBursts.push({ x, y, color, count, heavy, n: 1 });
  }

  _flushCoalescedBursts() {
    const scene = this.scene;
    if (!scene) return;
    for (const b of this._pendingBursts) {
      if (this._burstUsed >= fxBurstMax(scene)) break;
      this._burstUsed += 1;
      scene._burstRaw?.(b.x, b.y, b.color, b.count, b.heavy);
    }
    this._pendingBursts = [];
  }

  playMoment(id, opts = {}) {
    const handlers = {
      'brickBreak.normal': () => this._brickBreakNormal(opts),
      'brickBreak.explosive': () => this._brickBreakStyled(opts, 'explosive'),
      'brickBreak.nuke': () => this._brickBreakStyled(opts, 'nuke'),
      'brickBreak.frost': () => this._brickBreakStyled(opts, 'frost'),
      'brickBreak.electric': () => this._brickBreakStyled(opts, 'electric'),
      'brickBreak.fire': () => this._brickBreakStyled(opts, 'fire'),
      'brickBreak.combo8': () => this._comboMilestone(opts, 8),
      'brickBreak.combo16': () => this._comboMilestone(opts, 16),
      'brickBreak.combo24': () => this._comboMilestone(opts, 24),
      'brickBreak.combo32': () => this._comboMilestone(opts, 32),
      'power.pickup': () => this._powerPickup(opts),
      'power.cursed': () => this._powerCursed(opts),
      'nexus.unleashed': () => this._nexusUnleashed(opts),
      'shield.save': () => this._shieldSave(opts),
      'portal.teleport': () => this._portalTeleport(opts),
      'pot.incoming': () => this._potIncoming(opts),
      'paddle.catch': () => this._paddleCatch(opts),
      'knockout.levelClear': () => this._knockout(opts),
      'gnome.juggle': () => this._gnomeJuggle(opts),
      'gnome.electricPop': () => this._gnomeElectricPop(opts),
      'gnome.dislodged': () => this._gnomeDislodged(opts),
      'boss.perch': () => this._bossPerch(opts),
    };
    const fn = handlers[id];
    if (fn) fn();
    else if (id?.startsWith('brickBreak.')) this._brickBreakNormal(opts);
  }

  _brickBreakNormal(opts) {
    const { x, y, tint, brickType, fromBall, ball, panX, combo = 0 } = opts;
    const scene = this.scene;
    const reduced = fxReduced(scene) || this.settings.reducedFx;
    const chipOpts = ball?.vx != null
      ? { angle: Math.atan2(ball.vy, ball.vx), spread: 0.55 }
      : {};

    this.stage({
      at0: () => {
        if (fromBall) hapticPulse(4);
        audio.brickBreak?.(brickType ?? 'normal', combo, 0, { pan: this.panX(panX ?? x) });
      },
      at2: () => {
        brickBreakFx(scene, x, y, tint, {
          reduced,
          particles: this.settings.particles,
          style: 'normal',
          chipOpts,
        });
      },
    });
  }

  _brickBreakStyled(opts, style) {
    const { x, y, tint, brickType, fromBall, panX, combo = 0 } = opts;
    const scene = this.scene;
    const reduced = fxReduced(scene) || this.settings.reducedFx;

    this.stage({
      at0: () => {
        if (fromBall) hapticPulse(4);
        audio.elementBrickBreak?.(style, { pan: this.panX(panX ?? x) });
        audio.brickBreak?.(brickType ?? 'normal', combo, 0, { pan: this.panX(panX ?? x) });
        if (style === 'nuke') {
          audio.sidechainImpulse?.();
          if (this.settings.reactiveBloom !== false) bumpBloom(scene, { delta: 0.06 });
        }
      },
      at2: () => {
        brickBreakFx(scene, x, y, tint, {
          reduced,
          particles: this.settings.particles,
          style,
        });
      },
    });
  }

  _comboMilestone(opts, tier) {
    const { x, y, combo, mult } = opts;
    const scene = this.scene;
    const W = GAME.WIDTH;
    const H = GAME.HEIGHT;
    const srcY = y ?? this._lastComboPos.y;
    this._lastComboPos = { x: x ?? this._lastComboPos.x, y: srcY };
    const side = (x ?? W / 2) < W / 2 ? 'left' : 'right';
    const px = side === 'left' ? W * 0.07 : W * 0.93;
    const py = Math.max(H * 0.14, Math.min(H * 0.72, srcY));

    this.stage({
      at0: () => {
        hapticPulse(12);
        audio.comboMilestone?.(tier, { pan: this.panX(px) });
      },
      at2: () => {
        if (!fxAtLeast(scene, 'medium')) return;
        const edge = Math.max(8, Math.round(Math.min(W, H) * 0.045));
        const g = scene.add.graphics().setDepth(36).setScrollFactor(0).setBlendMode('ADD');
        const tint = 0xffd23d;
        const ex = side === 'left' ? 0 : W - edge;
        g.fillStyle(tint, 0.1 + tier * 0.004);
        g.fillRect(ex, py - edge * 2, edge, edge * 4);
        g.lineStyle(2, tint, 0.5);
        g.lineBetween(
          side === 'left' ? edge : W - edge,
          py,
          side === 'left' ? edge + edge * 0.6 : W - edge - edge * 0.6,
          py,
        );
        scene.tweens.add({
          targets: g,
          alpha: 0,
          duration: 420,
          ease: 'Cubic.easeOut',
          onComplete: () => g.destroy(),
        });
        hitSpark(scene, px, py, { tint, count: tier >= 24 ? 5 : 4, spread: 12 });
      },
      at8: () => {
        const mode = fxComboFx(scene);
        if (mode === false) return;
        surgeText(scene, px, py - 18, `COMBO x${mult ?? 2}`, cssHex(PAL.accent3), 34);
      },
    });
  }

  comboMilestoneFromCombo(combo, opts = {}) {
    if (!COMBO_MILESTONES.includes(combo)) return;
    const id = `brickBreak.combo${combo}`;
    this.playMoment(id, { ...opts, combo });
  }

  _powerPickup(opts) {
    const { key, def, skipPunch = false } = opts;
    const scene = this.scene;
    const px = scene.paddle.x;
    const py = scene.paddle.top;
    const tint = powerFillColor(key);
    const big = def?.kind === 'instant' || def?.bulletTime || key === 'BallSplitter';
    const reduced = fxReduced(scene) || this.settings.reducedFx;

    this.stage({
      at0: () => {
        hapticPulse(8);
        audio.powerCategory?.(def?.category ?? 'env', { pan: this.panX(px) });
        audio.powerPickup?.(key, { pan: this.panX(px) });
      },
      at2: () => {
        powerAcquireBurst(scene, px, py, { tint, neg: false, big: big && !reduced });
        popScale(scene, scene.paddle.body, { peak: 1.1, dur: 120, from: 0.94 });
        squashStretch(scene, scene.paddle.body);
        if (!skipPunch) screenPunch(scene, big ? 0.04 : 0.022, big ? 75 : 60);
        if (big && !reduced) {
          radialBlast(scene, px, py, { tint, scale: 2.4, dur: 460 });
          const confettiN = fxConfettiCount(scene, 16);
          if (confettiN > 0) spawnConfetti(scene, px, py - 20, confettiN);
        }
      },
      at8: () => {
        powerPickupFx(scene, key, px, py, def);
      },
    });
  }

  _powerCursed(opts) {
    const { key, def, skipPunch = false } = opts;
    const scene = this.scene;
    const px = scene.paddle.x;
    const py = scene.paddle.top;

    this.stage({
      at0: () => {
        hapticPattern([8, 40, 8]);
        audio.powerNegative?.({ pan: this.panX(px) });
      },
      at2: () => {
        powerAcquireBurst(scene, px, py, { tint: PAL.powerNeg, neg: true, big: false });
        popScale(scene, scene.paddle.body, { peak: 0.92, dur: 140, from: 1.05 });
        impactFlash(scene, PAL.powerNeg, 0.12);
        microShake(scene, 0.008, 140);
        if (!skipPunch) screenPunch(scene, 0.028, 90);
        if (this.settings.chroma) pulseChroma(scene);
        surgeText(scene, px, py - 52, 'CURSED!', cssHex(PAL.powerNeg), 34);
        wobble(scene, scene.paddle.body, { angle: 14, dur: 300, repeat: 2 });
        scene.balls.forEach((b) => {
          if (!b.stuck) wobble(scene, b.core, { angle: 8, dur: 260, repeat: 1 });
        });
      },
    });
  }

  _nexusUnleashed(opts) {
    const { x, y, hazardCount = 0 } = opts;
    const scene = this.scene;
    const cx = x ?? scene.paddle?.x ?? GAME.WIDTH / 2;
    const cy = y ?? GAME.HEIGHT * 0.38;

    this.stage({
      at0: () => {
        hapticPulse(20);
        audio.nexusUnleashed?.({ pan: this.panX(cx) });
        audio.sidechainImpulse?.();
        setArenaDim(scene, true);
      },
      at2: () => {
        radialBlast(scene, cx, cy, { tint: 0x8ec5ff, scale: 2.6, dur: 460 });
        if (hazardCount > 0) {
          hitSpark(scene, cx, cy, { tint: 0x8ec5ff, count: 4, spread: 24 });
        }
        if (this.settings.reactiveBloom !== false) bumpBloom(scene, { delta: 0.07 });
      },
      at8: () => {
        if (hazardCount > 0) {
          surgeText(scene, cx, cy - 32, 'NEXUS UNLEASHED', '#8ec5ff', 36);
        }
      },
      at16: () => {
        scene.time.delayedCall(400, () => setArenaDim(scene, false));
      },
    });
  }

  _shieldSave(opts) {
    const { x, y, tint } = opts;
    const scene = this.scene;

    this.stage({
      at0: () => {
        hapticPulse(8);
        audio.shieldRebound?.({ pan: this.panX(x) });
      },
      at2: () => {
        rippleRing(scene, x, y, { tint: tint ?? powerFillColor('Shield'), scale: 1.6, dur: 260, depth: 22 });
        hitSpark(scene, x, y, { tint: tint ?? 0x8ec5ff, count: 4, spread: 16 });
      },
    });
  }

  _portalTeleport(opts) {
    const { entryX, entryY, exitX, exitY } = opts;
    const scene = this.scene;

    this.stage({
      at0: () => {
        hapticPulse(6);
        audio.portalWarp?.({ pan: this.panX(entryX) });
        if (entryX != null) {
          radialBlast(scene, entryX, entryY, { tint: 0x72f2eb, scale: 2.2, dur: 360 });
          hitSpark(scene, entryX, entryY, { tint: 0x72f2eb, count: 8, spread: 24 });
        }
      },
      at2: () => {
        const ring = (x, y) => rippleRing(scene, x, y, { tint: 0x72f2eb, scale: 2.1, dur: 380, depth: 33, pulse: true });
        if (entryX != null) ring(entryX, entryY);
        if (exitX != null) {
          ring(exitX, exitY);
          hitSpark(scene, exitX, exitY, { tint: 0xa8fff8, count: 6, spread: 20 });
        }
        if (entryX != null && exitX != null && scene.add?.graphics) {
          const g = scene.add.graphics().setDepth(34).setBlendMode('ADD');
          g.lineStyle(3, 0x72f2eb, 0.55);
          g.beginPath();
          g.moveTo(entryX, entryY);
          g.lineTo(exitX, exitY);
          g.strokePath();
          scene.tweens.add({
            targets: g,
            alpha: 0,
            duration: 280,
            ease: 'Cubic.easeOut',
            onComplete: () => g.destroy(),
          });
        }
      },
    });
  }

  _potIncoming(opts) {
    const { x, y } = opts;
    const scene = this.scene;
    const side = (x ?? GAME.WIDTH / 2) < GAME.WIDTH / 2 ? 'left' : 'right';

    this.stage({
      at0: () => {
        audio.potIncomingTick?.({ pan: this.panX(x) });
      },
      at2: () => {
        if (!fxAtLeast(scene, 'medium')) return;
        const W = GAME.WIDTH;
        const H = GAME.HEIGHT;
        const edge = Math.max(10, Math.round(Math.min(W, H) * 0.05));
        const g = scene.add.graphics().setDepth(35).setScrollFactor(0).setBlendMode('ADD');
        const tint = 0xff8899;
        const ex = side === 'left' ? 0 : W - edge;
        g.fillStyle(tint, 0.14);
        g.fillRect(ex, 0, edge, H);
        g.lineStyle(2, tint, 0.55);
        g.lineBetween(
          side === 'left' ? edge : W - edge,
          y ?? H * 0.72,
          side === 'left' ? edge : W - edge,
          (y ?? H * 0.72) + H * 0.08,
        );
        scene.tweens.add({
          targets: g,
          alpha: 0,
          duration: 420,
          ease: 'Cubic.easeOut',
          onComplete: () => g.destroy(),
        });
        if (y != null) {
          hitSpark(scene, side === 'left' ? edge + 8 : W - edge - 8, y, {
            tint,
            count: 3,
            spread: 10,
          });
        }
      },
    });
  }

  _paddleCatch(opts) {
    const { x, y, tint, velocity = 1, clutch = false } = opts;
    const scene = this.scene;
    const sparkTint = tint ?? scene.paddle.glowColor();

    this.stage({
      at0: () => {
        hapticPulse(clutch ? 6 : 8);
        if (clutch) audio.clutch?.({ pan: this.panX(x) });
        else audio.paddle?.({ pan: this.panX(x), volScale: 0.7 + Math.min(0.5, velocity * 0.15) });
      },
      at2: () => {
        squashStretch(scene, scene.paddle.body);
        if (clutch) {
          surgeText(scene, x, y - 20, 'CLUTCH!', '#8ec5ff', 28);
          rippleRing(scene, x, y, { tint: 0x8ec5ff, scale: 2, dur: 320, depth: 32 });
        }
        hitSpark(scene, x, y, { tint: sparkTint, count: clutch ? 5 : 4, spread: clutch ? 18 : 14 });
        if (this.settings.particles) this.requestBurst(x, y, sparkTint, 4);
      },
    });
  }

  _gnomeJuggle(opts) {
    const { x, y, n = 1 } = opts;
    const scene = this.scene;
    this.stage({
      at0: () => {
        audio.juggle?.(n);
      },
      at2: () => {
        hitSpark(scene, x, y, { tint: 0xffd23d, count: n >= 3 ? 5 : 4, spread: 16 });
        if (n >= 3) rippleRing(scene, x, y, { tint: 0xffd23d, scale: 2.4, dur: 380 });
      },
    });
  }

  _gnomeElectricPop(opts) {
    const { x, y } = opts;
    const scene = this.scene;
    this.stage({
      at0: () => {
        hapticPulse(10);
      },
      at2: () => {
        hitSpark(scene, x, y, { tint: 0xa78bfa, count: 6, spread: 20 });
        radialBlast(scene, x, y, { tint: 0xa78bfa, scale: 2.2 });
      },
    });
  }

  _gnomeDislodged(opts) {
    const { x, y, dropped = false } = opts;
    const scene = this.scene;
    this.stage({
      at2: () => {
        hitSpark(scene, x, y, {
          tint: dropped ? 0xffd23d : 0xc84040,
          count: dropped ? 5 : 3,
          spread: 14,
        });
      },
    });
  }

  _bossPerch(opts) {
    const { x, y, tint = 0xffd23d } = opts;
    const scene = this.scene;
    this.stage({
      at0: () => {
        audio.gnomePop?.({ pan: this.panX(x) });
        hapticPulse(12);
      },
      at2: () => {
        rippleRing(scene, x, y, { tint, scale: 1.9, dur: 380 });
        hitSpark(scene, x, y, { tint, count: 5, spread: 18 });
      },
    });
  }

  _knockout(opts) {
    const { x, y, tint, reduced } = opts;
    const scene = this.scene;
    const isReduced = reduced ?? fxReduced(scene) ?? this.settings.reducedFx;

    this.stage({
      at0: () => {
        hapticPulse(20);
        audio.wowHit?.({ pan: this.panX(x) });
        audio.explode?.({ pan: this.panX(x) });
        audio.sidechainImpulse?.();
        scene.hitStopRemaining = GAME.HIT_STOP_MS;
      },
      at2: () => {
        if (!isReduced) {
          this.requestBurst(x, y, tint ?? PAL.accent2, 10);
          shardBurst(scene, x, y, tint ?? PAL.accent2, isReduced ? 5 : 7);
          radialBlast(scene, x, y, { tint: tint ?? PAL.accent2, scale: 2.8, dur: 520 });
          const confettiN = fxConfettiCount(scene, 20);
          if (confettiN > 0) spawnConfetti(scene, x, y, confettiN);
        } else {
          rippleRing(scene, x, y, { tint: tint ?? PAL.accent2, scale: 1.9, dur: 380 });
        }
        if (this.settings.reactiveBloom !== false) {
          bumpBloom(scene, { delta: 0.08 });
          if (this.settings.chroma) pulseChroma(scene);
        }
        const shakeI = fxShake(scene, 0.006);
        if (shakeI > 0) fxCameraShake(scene, 160, shakeI);
      },
      at8: () => {
        surgeText(scene, x, y - 28, 'KNOCKOUT!', cssHex(PAL.accent2), 44);
      },
    });
  }
}
