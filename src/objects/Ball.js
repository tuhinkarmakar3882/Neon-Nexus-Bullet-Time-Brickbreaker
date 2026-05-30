import { GAME } from '../config/Constants.js';
import { POWERS } from '../config/PowerUps.js';
import { clamp } from '../utils/Helpers.js';

const COLOR_DEFAULT = 0xffffff;

export class Ball {
  constructor(scene, paddle) {
    this.scene = scene;
    this.paddle = paddle;
    this.r = GAME.BALL_RADIUS;
    this.speed = GAME.BALL_MIN_SPEED * 1.15;
    this.vx = 0;
    this.vy = 0;
    this.stuck = true;
    this.stuckOffset = 0; // x offset from paddle center while glued

    // visual modifiers (driven by power system)
    this.missile = false;
    this.gravity = false;
    this.chargeReady = false;
    this.teleport = false;

    this.x = paddle.x;
    this.y = paddle.top - this.r;

    this.core = scene.add.circle(this.x, this.y, this.r, COLOR_DEFAULT).setDepth(22);
    this.halo = scene.add.image(this.x, this.y, 'soft')
      .setDepth(21)
      .setDisplaySize(this.r * 5, this.r * 5)
      .setAlpha(0.5);

    // Neon trail (follows a persistent point we update each frame)
    this.trailTarget = { x: this.x, y: this.y };
    this.trail = scene.add.particles(0, 0, 'soft', {
      follow: this.trailTarget,
      speed: 0,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 260,
      frequency: 16,
      tint: COLOR_DEFAULT,
      blendMode: 'ADD',
    }).setDepth(19);
  }

  color() {
    if (this.chargeReady) return POWERS.ChargeShot.color;
    if (this.teleport) return POWERS.Teleport.color;
    if (this.missile) return POWERS.Missile.color;
    if (this.gravity) return POWERS.Gravity.color;
    return COLOR_DEFAULT;
  }

  release() {
    if (!this.stuck) return;
    this.stuck = false;
    const rel = this.stuckOffset / (this.paddle.w / 2);
    const angle = clamp(rel, -1, 1) * GAME.MAX_BOUNCE_ANGLE;
    this.vx = this.speed * Math.sin(angle);
    this.vy = -this.speed * Math.cos(angle);
    this.enforceMinVertical();
  }

  // Prevents the ball from getting stuck bouncing near-horizontally.
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

  reset() {
    this.missile = false;
    this.gravity = false;
    this.chargeReady = false;
    this.teleport = false;
    this.speed = Math.max(GAME.BALL_MIN_SPEED, this.speed);
  }

  sync() {
    const c = this.color();
    this.core.setFillStyle(c);
    this.core.setPosition(this.x, this.y);
    this.halo.setPosition(this.x, this.y).setTint(c);
    this.trail.setParticleTint(c);
    this.trailTarget.x = this.x;
    this.trailTarget.y = this.y;
  }

  destroy() {
    this.core.destroy();
    this.halo.destroy();
    this.trail.destroy();
  }
}
