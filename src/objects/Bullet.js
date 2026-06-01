import { GAME } from '../config/Constants.js';
import { PAL } from '../config/Palette.js';
import { fxParticleSize, fxParticleScale } from '../utils/FxBudget.js';

const TINTS = {
  laser: 0xff7080,
  fire: PAL.powerFire,
  ice: PAL.powerFrost,
  shock: 0xb8a8ff,
  napalm: 0xff6020,
};

export class Bullet {
  constructor(scene, x, y, opts = {}) {
    this.scene = scene;
    this.type = opts.type ?? 'laser';
    this.x = x;
    this.y = y;
    this.vx = opts.vx ?? 0;
    this.vy = opts.vy ?? -GAME.LASER_BULLET_SPEED;
    this.bouncesLeft = opts.bounces ?? 0;
    this.dead = false;
    this.tint = opts.tint ?? TINTS[this.type] ?? 0xff7080;
    this.laserWidth = opts.laserWidth ?? 1;
    this.hitW = this.type === 'laser' ? 3.5 * this.laserWidth : 4;

    if (this.type === 'laser' || this.type === 'shock') {
      this.gfx = scene.add.image(x, y, 'bullet-bolt').setDepth(18).setTint(this.tint);
      const w = this.type === 'shock' ? 10 : 7 * this.laserWidth;
      this.gfx.setDisplaySize(w, 22);
    } else {
      this.gfx = scene.add.graphics().setDepth(18);
      this.drawBolt();
    }
    const glowW = fxParticleSize(scene, 8);
    this.glow = scene.add.image(x, y, 'soft').setDisplaySize(glowW, glowW * 1.5)
      .setTint(this.tint).setAlpha(0.65).setDepth(17).setBlendMode('ADD');
    this.trailTarget = { x, y };
    const trailTex = this.type === 'fire' || this.type === 'napalm' ? 'ember' : 'spark-streak';
    const trailScale = fxParticleScale(scene, trailTex, 10);
    this.trail = scene.add.particles(0, 0, trailTex, {
      follow: this.trailTarget,
      speed: { min: 4, max: 18 },
      scale: { start: trailScale, end: 0 },
      alpha: { start: 0.65, end: 0 },
      lifespan: 220,
      frequency: 24,
      tint: this.tint,
      blendMode: 'ADD',
    }).setDepth(16);
  }

  drawBolt() {
    const g = this.gfx;
    g.clear();
    const c = this.tint;
    if (this.type === 'fire' || this.type === 'napalm') {
      g.fillStyle(c, 1);
      g.fillCircle(0, 6, 5);
      g.fillTriangle(-4, 4, 4, 4, 0, -10);
      g.fillStyle(0xfff8ef, 0.7);
      g.fillCircle(0, -2, 2.5);
    } else if (this.type === 'ice') {
      g.fillStyle(c, 1);
      g.fillRect(-3, -8, 6, 16);
      g.fillStyle(0xffffff, 0.8);
      g.fillRect(-1, -6, 2, 10);
      g.lineStyle(1, 0xffffff, 0.6);
      g.lineBetween(-3, 0, 3, 0);
    }
  }

  update(dtSec, timeScale) {
    this.x += this.vx * dtSec * timeScale;
    this.y += this.vy * dtSec * timeScale;

    if (this.type === 'shock' && this.bouncesLeft > 0) {
      const lw = GAME.WALL_X;
      const rw = GAME.WIDTH - GAME.WALL_X;
      const tw = GAME.WALL_TOP;
      if (this.x <= lw || this.x >= rw) {
        this.vx *= -1;
        this.x = this.x <= lw ? lw + 4 : rw - 4;
        this.bouncesLeft--;
      }
      if (this.y <= tw) {
        this.vy = Math.abs(this.vy);
        this.y = tw + 4;
        this.bouncesLeft--;
      }
    }
  }

  sync() {
    this.gfx.setPosition(this.x, this.y);
    if (this.type === 'fire' || this.type === 'napalm' || this.type === 'ice') {
      this.gfx.setRotation(Math.atan2(this.vy, this.vx) + Math.PI / 2);
    }
    this.glow.setPosition(this.x, this.y);
    this.trailTarget.x = this.x;
    this.trailTarget.y = this.y;
  }

  destroy() {
    this.gfx.destroy();
    this.glow.destroy();
    this.trail.destroy();
  }
}
