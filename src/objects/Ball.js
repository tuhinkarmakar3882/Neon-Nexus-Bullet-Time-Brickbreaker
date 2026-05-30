import { GAME } from '../config/Constants.js';
import { POWERS } from '../config/PowerUps.js';
import { clamp } from '../utils/Helpers.js';

export class Ball {
  constructor(scene, paddle) {
    this.scene = scene;
    this.paddle = paddle;
    this.baseR = GAME.BALL_RADIUS;
    this.r = this.baseR;
    this.speed = GAME.BALL_MIN_SPEED * 1.12;
    this.vx = 0; this.vy = 0;
    this.stuck = true;
    this.stuckOffset = 0;

    this.through = false;
    this.bomb = false;
    this.mega = false;

    this.x = paddle.x;
    this.y = paddle.top - this.r;

    this.shadow = scene.add.image(this.x, this.y, 'shadow').setDepth(18).setAlpha(0.35);
    this.halo = scene.add.image(this.x, this.y, 'orb').setDepth(21).setAlpha(0.95);
    this.core = scene.add.circle(this.x, this.y, this.r * 0.55, 0xffffff).setDepth(22);
    this.trailTarget = { x: this.x, y: this.y };
    this.trail = scene.add.particles(0, 0, 'soft', {
      follow: this.trailTarget, speed: 0,
      scale: { start: this.r / 22, end: 0 }, alpha: { start: 0.5, end: 0 },
      lifespan: 240, frequency: 14, tint: 0x2fe6c7, blendMode: 'ADD',
    }).setDepth(19);
  }

  tint() {
    if (this.bomb) return POWERS.Bomb.color;
    if (this.through) return POWERS.Through.color;
    if (this.mega) return POWERS.Mega.color;
    return 0x7fefff;
  }

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

  setMega(on) {
    this.mega = on;
    this.r = on ? this.baseR * 1.9 : this.baseR;
  }

  reset() {
    this.through = false; this.bomb = false;
    this.setMega(false);
    this.speed = Math.max(GAME.BALL_MIN_SPEED, this.speed);
  }

  sync() {
    const c = this.tint();
    this.core.setPosition(this.x, this.y).setRadius(this.r * 0.55);
    this.halo.setPosition(this.x, this.y).setTint(c).setDisplaySize(this.r * 4.2, this.r * 4.2);
    this.shadow.setPosition(this.x, this.y + this.r * 1.4).setDisplaySize(this.r * 2.4, this.r * 1.3);
    this.trail.setParticleTint(c);
    this.trailTarget.x = this.x; this.trailTarget.y = this.y;
  }

  destroy() {
    this.core.destroy(); this.halo.destroy(); this.shadow.destroy(); this.trail.destroy();
  }
}
