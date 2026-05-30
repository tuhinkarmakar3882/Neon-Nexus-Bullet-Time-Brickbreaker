import { GAME } from '../config/Constants.js';
import { PAL } from '../config/Palette.js';
import { clamp } from '../utils/Helpers.js';

const TRAIL_PROFILES = {
  comet: { tex: 'spark-streak', frequency: 16, lifespan: 400, scale: 0.32, speedMin: 8, speedMax: 28 },
  gold: { tex: 'ember', frequency: 12, lifespan: 460, scale: 0.42, speedMin: 10, speedMax: 34 },
  rose: { tex: 'spark-shard', frequency: 20, lifespan: 340, scale: 0.22, speedMin: 6, speedMax: 22 },
  nexus: { tex: 'spark-streak', frequency: 9, lifespan: 480, scale: 0.38, speedMin: 14, speedMax: 42 },
};

export class Ball {
  constructor(scene, paddle) {
    this.scene = scene;
    this.paddle = paddle;
    this.baseR = GAME.BALL_RADIUS;
    this.r = this.baseR;
    this.baseSpeed = GAME.BALL_MIN_SPEED * GAME.BALL_LEVEL_BASE_MULT;
    this.speed = this.baseSpeed;
    this.vx = 0; this.vy = 0;
    this.stuck = true;
    this.stuckOffset = 0;

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

    this._trailTint = 0xffffff;
    this._trailId = 'comet';
    this._trailTex = 'spark-streak';
    this.x = paddle.x;
    this.y = paddle.top - this.r;

    this.shadow = scene.add.image(this.x, this.y, 'shadow').setDepth(18).setAlpha(0.42);
    this.halo = scene.add.image(this.x, this.y, 'orb').setDepth(20).setAlpha(0.88).setBlendMode('ADD');
    this.ring = scene.add.image(this.x, this.y, 'ring').setDepth(21).setAlpha(0.35).setBlendMode('ADD');
    this.core = scene.add.image(this.x, this.y, 'ball-core').setDepth(22);
    this.trailTarget = { x: this.x, y: this.y };
    this.trail = this.buildTrail();
  }

  buildTrail() {
    const p = TRAIL_PROFILES[this._trailId] ?? TRAIL_PROFILES.comet;
    this._trailTex = p.tex;
    return this.scene.add.particles(0, 0, p.tex, {
      follow: this.trailTarget,
      speed: { min: p.speedMin, max: p.speedMax },
      scale: { start: p.scale, end: 0 },
      alpha: { start: 0.82, end: 0 },
      lifespan: p.lifespan,
      frequency: p.frequency,
      tint: 0xffffff,
      blendMode: 'ADD',
      angle: { min: 160, max: 200 },
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

  /** Keep steering mods from runaway velocity growth. */
  clampToSpeed() {
    const sp = this.speed || this.baseSpeed;
    const cur = Math.hypot(this.vx, this.vy);
    if (cur < 1) return;
    this.vx = (this.vx / cur) * sp;
    this.vy = (this.vy / cur) * sp;
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
    this.resetToLevelBase();
  }

  applyCosmetic(tint = 0xffffff, id = 'comet') {
    this._trailTint = tint;
    if (this._trailId !== id) {
      this._trailId = id;
      this.trail?.destroy();
      this.trail = this.buildTrail();
    }
  }

  sync() {
    const c = this.tint();
    const mod = this.isModified();
    const speed = Math.hypot(this.vx, this.vy);
    const d = this.r * 2.4;
    this.core.setPosition(this.x, this.y).setDisplaySize(d, d).setTint(c);
    const haloScale = (mod ? 4.8 : 4.2) + Math.min(0.6, speed / 900);
    this.halo.setPosition(this.x, this.y).setTint(mod ? c : 0xffffff)
      .setDisplaySize(this.r * haloScale, this.r * haloScale)
      .setAlpha(mod ? 0.82 : 0.42 + Math.min(0.18, speed / 1200));
    this.ring.setPosition(this.x, this.y).setTint(mod ? c : this._trailTint)
      .setDisplaySize(this.r * (mod ? 3.2 : 2.8), this.r * (mod ? 3.2 : 2.8))
      .setAlpha(mod ? 0.32 : 0.16 + Math.min(0.12, speed / 1400));
    if (!mod) this.trail.setParticleTint(this._trailTint);
    else this.trail.setParticleTint(c);
    this.trail.frequency = mod ? 10 : (TRAIL_PROFILES[this._trailId]?.frequency ?? 16);
    this.trailTarget.x = this.x;
    this.trailTarget.y = this.y;
  }

  destroy() {
    this.core.destroy(); this.halo.destroy(); this.ring.destroy();
    this.shadow.destroy(); this.trail.destroy();
  }
}
