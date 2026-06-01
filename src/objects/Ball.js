import { GAME } from '../config/Constants.js';
import { PAL } from '../config/Palette.js';
import { fxTrailMult, fxGlowScale } from '../utils/FxBudget.js';
import { clamp } from '../utils/Helpers.js';

const TRAIL_PROFILES = {
  comet: { tex: 'trail-plasma', frequency: 14, lifespan: 320, scale: 0.38, speedMin: 4, speedMax: 18 },
  gold: { tex: 'ember', frequency: 10, lifespan: 400, scale: 0.36, speedMin: 6, speedMax: 22 },
  rose: { tex: 'spark-shard', frequency: 16, lifespan: 300, scale: 0.18, speedMin: 4, speedMax: 16 },
  ember: { tex: 'ember', frequency: 9, lifespan: 380, scale: 0.4, speedMin: 8, speedMax: 24 },
  frost: { tex: 'spark-shard', frequency: 12, lifespan: 340, scale: 0.22, speedMin: 3, speedMax: 14 },
  nexus: { tex: 'trail-plasma', frequency: 8, lifespan: 420, scale: 0.44, speedMin: 8, speedMax: 28 },
  void: { tex: 'trail-plasma', frequency: 7, lifespan: 450, scale: 0.42, speedMin: 6, speedMax: 20 },
};

/** Per-ball hue when several balls are on screen — ring/trail only until a mod is active. */
const IDENTITY_TINTS = [0xffffff, 0x7ec8ff, 0xffd080, 0xc8a0ff, 0x88ffb8, 0xff98b0, 0xfff0a0, 0xa0e8ff];

export class Ball {
  constructor(scene, paddle, identityIndex = 0) {
    this.scene = scene;
    this.paddle = paddle;
    this.baseR = GAME.BALL_RADIUS;
    this.r = this.baseR;
    this.baseSpeed = GAME.BALL_MIN_SPEED * GAME.BALL_LEVEL_BASE_MULT;
    this.speed = this.baseSpeed;
    this.vx = 0; this.vy = 0;
    this.stuck = true;
    this.stuckOffset = 0;
    this._identityIndex = identityIndex;
    this._identityTint = IDENTITY_TINTS[identityIndex % IDENTITY_TINTS.length];
    this._portalGraceUntil = 0;

    this.through = false;
    this.bomb = false;
    this.mega = false;
    this.element = null;
    this.missileMode = false;
    this.gravityMode = false;
    this.echoMode = false;
    this.echoAngle = 0;
    this.chargeShot = false;
    this.wrap = false;
    this.heavyMode = false;
    this._steerPhase = 0;
    this._chaosSparkCd = 0;

    this._trailTint = 0xffffff;
    this._trailId = 'comet';
    this._trailTex = 'spark-streak';
    this.x = paddle.x;
    this.y = paddle.top - this.r;

    this.shadow = scene.add.image(this.x, this.y, 'shadow').setDepth(18).setAlpha(0.55);
    this.halo = scene.add.image(this.x, this.y, 'orb').setDepth(20).setAlpha(0.88).setBlendMode('ADD');
    this.ring = scene.add.image(this.x, this.y, 'ring').setDepth(21).setAlpha(0.35).setBlendMode('ADD');
    this.rim = scene.add.image(this.x, this.y, 'ball-rim').setDepth(21.5);
    this.core = scene.add.image(this.x, this.y, 'ball-core').setDepth(22);
    this.trailTarget = { x: this.x, y: this.y };
    this.trail = this.buildTrail();
  }

  buildTrail() {
    const p = TRAIL_PROFILES[this._trailId] ?? TRAIL_PROFILES.comet;
    const tm = fxTrailMult(this.scene);
    this._trailTex = p.tex;
    return this.scene.add.particles(0, 0, p.tex, {
      follow: this.trailTarget,
      speed: { min: p.speedMin * tm, max: p.speedMax * tm },
      scale: { start: p.scale * tm, end: 0 },
      alpha: { start: 0.72 * Math.min(1.2, tm), end: 0 },
      lifespan: p.lifespan,
      frequency: tm > 0 ? Math.max(4, Math.round(p.frequency / tm)) : 9999,
      tint: 0xffffff,
      blendMode: 'ADD',
      angle: { min: 0, max: 360 },
    }).setDepth(19);
  }

  /** True when any ball modifier is active (default = clean white comet). */
  isModified() {
    return this.mega || this.chargeShot || this.through || this.missileMode
      || this.gravityMode || this.echoMode || this.wrap || this.heavyMode
      || this.bomb || !!this.element;
  }

  tint() {
    if (this.heavyMode) return 0xaaaaaa;
    if (this.mega) return 0xffcc44;
    if (this.chargeShot) return 0xffac33;
    if (this.through) return 0x72f2eb;
    if (this.missileMode) return 0x5ecf8a;
    if (this.gravityMode) return 0xc084fc;
    if (this.echoMode) return 0xe8e0d8;
    if (this.wrap) return 0xffe156;
    if (this.element === 'nuke') return 0xff2244;
    if (this.element === 'explosive') return PAL.explosive;
    if (this.element === 'frost') return PAL.powerFrost;
    if (this.element === 'electric') return 0xb8a8ff;
    if (this.bomb) return PAL.explosive;
    return 0xffffff;
  }

  setElement(el) {
    this.element = el;
    if (el) { this.through = false; this.bomb = false; this.setMega(false); }
  }

  clearElement() { this.element = null; }

  release() {
    if (!this.stuck) return;
    this.stuck = false;
    const rel = clamp(this.stuckOffset / (this.paddle.w / 2), -1, 1);
    const angle = rel * GAME.MAX_BOUNCE_ANGLE;
    this.vx = this.speed * Math.sin(angle);
    this.vy = -this.speed * Math.cos(angle);
    this.enforceMinVertical();
  }

  enforceMinVertical() {
    const sp = Math.hypot(this.vx, this.vy) || this.speed;
    const minVy = sp * GAME.BALL_MIN_VERTICAL_RATIO;
    if (Math.abs(this.vy) < minVy) {
      const sign = this.vy < 0 ? -1 : 1;
      this.vy = sign * minVy;
      const vxMag = Math.sqrt(Math.max(0, sp * sp - this.vy * this.vy));
      this.vx = (this.vx < 0 ? -1 : 1) * vxMag;
    }
  }

  setSpeed(sp) {
    this.speed = clamp(sp, GAME.BALL_MIN_SPEED, GAME.BALL_MAX_SPEED);
    if (!this.stuck) {
      const ang = Math.atan2(this.vy, this.vx);
      this.vx = Math.cos(ang) * this.speed;
      this.vy = Math.sin(ang) * this.speed;
      this.enforceMinVertical();
    }
  }

  accelerateOnBounce() {
    const mult = this.scene?.bounceAccelMult ?? 1;
    const sp = Math.hypot(this.vx, this.vy) || this.speed;
    this.setSpeed(sp * (1 + GAME.BOUNCE_SPEED_DELTA * mult));
  }

  /** Keep steering mods from runaway velocity growth — chaos modes use wider band. */
  clampToSpeed(opts = {}) {
    const base = this.speed || this.baseSpeed;
    const minMult = opts.minMult ?? 1;
    const maxMult = opts.maxMult ?? 1;
    const min = base * minMult;
    const max = base * maxMult;
    const cur = Math.hypot(this.vx, this.vy);
    if (cur < 1) return;
    const clamped = clamp(cur, min, max);
    this.vx = (this.vx / cur) * clamped;
    this.vy = (this.vy / cur) * clamped;
  }

  /** @deprecated use clampToSpeed — kept for callers expecting fixed speed cap. */
  clampToFixedSpeed() {
    this.clampToSpeed();
  }

  resetToLevelBase() {
    this.baseSpeed = GAME.BALL_MIN_SPEED * GAME.BALL_LEVEL_BASE_MULT;
    this.setSpeed(this.baseSpeed);
  }

  setMega(on) {
    this.mega = on;
    this.r = on ? this.baseR * 1.9 : this.baseR;
  }

  reset() {
    this.through = false; this.bomb = false;
    this.setMega(false);
    this.element = null;
    this.missileMode = false;
    this.gravityMode = false;
    this.echoMode = false;
    this.echoAngle = 0;
    this.chargeShot = false;
    this.wrap = false;
    this.heavyMode = false;
    this._steerPhase = 0;
    this._chaosSparkCd = 0;
    this._portalGraceUntil = 0;
    this.resetToLevelBase();
  }

  applyCosmetic(tint = 0xffffff, id = 'comet') {
    if (!this.scene?.sys) return;
    const trailId = TRAIL_PROFILES[id] ? id : 'comet';
    this._trailTint = tint;
    if (this._trailId !== trailId) {
      this._trailId = trailId;
      try {
        this.trail?.destroy?.();
      } catch { /* tearing down */ }
      this.trail = this.buildTrail();
    }
  }

  sync() {
    const c = this.tint();
    const mod = this.isModified();
    const chaos = this.missileMode || this.gravityMode || this.echoMode;
    const missile = this.missileMode;
    const speed = Math.hypot(this.vx, this.vy);
    const d = this.r * 2.35;
    const idTint = this._identityTint ?? 0xffffff;

    this.shadow.setPosition(this.x, this.y + this.r * 0.35)
      .setDisplaySize(this.r * 2.8, this.r * 1.35)
      .setAlpha(mod ? 0.4 : 0.5);

    this.core.setPosition(this.x, this.y).setDisplaySize(d, d).setTint(c).setAlpha(1)
      .setRotation(missile ? Math.atan2(this.vy, this.vx) + Math.PI / 2 : (chaos ? this._steerPhase * 0.35 : 0));

    const haloScale = (mod ? 4.8 : 4.2) + Math.min(0.6, speed / 900) + (chaos ? 0.35 : 0);
    const glow = fxGlowScale(this.scene, 1);
    this.halo.setPosition(this.x, this.y).setTint(mod ? c : idTint)
      .setDisplaySize(this.r * haloScale, this.r * haloScale)
      .setAlpha((mod ? 0.82 : 0.52 + Math.min(0.18, speed / 1100)) * glow);

    this.ring.setPosition(this.x, this.y).setTint(mod ? c : idTint)
      .setDisplaySize(this.r * (mod ? 3.1 : 2.85), this.r * (mod ? 3.1 : 2.85))
      .setAlpha(mod ? 0.3 : 0.16 + Math.min(0.1, speed / 1400));

    this.rim.setPosition(this.x, this.y)
      .setDisplaySize(this.r * 2.75, this.r * 2.75)
      .setTint(mod ? c : 0xffffff)
      .setAlpha(mod ? 0.65 : 0.78);

    if (!mod) this.trail.setParticleTint(this._trailTint);
    else this.trail.setParticleTint(c);
    this.trail.frequency = missile ? 4 : (chaos ? 6 : (mod ? 9 : (TRAIL_PROFILES[this._trailId]?.frequency ?? 14)));
    this.trailTarget.x = this.x;
    this.trailTarget.y = this.y;
  }

  destroy() {
    if (this._echoSprites) {
      this._echoSprites.forEach((s) => {
        s?.core?.destroy?.();
        s?.halo?.destroy?.();
      });
      this._echoSprites = null;
    }
    this.core.destroy(); this.halo.destroy(); this.ring.destroy(); this.rim.destroy();
    this.shadow.destroy(); this.trail.destroy();
  }
}
