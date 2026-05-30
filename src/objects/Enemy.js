import { GAME } from '../config/Constants.js';

// Wandering Arkanoid-style mobs. Three kinds with distinct looks + behaviour:
//   drifter — hexagon drone, slow sway descent
//   chaser  — arrowhead that steers toward the paddle
//   zigzag  — diamond that strafes side to side
// Killed by ball or laser (deflects the ball + points). If it reaches the
// paddle it detonates and stuns you.
const KINDS = ['drifter', 'chaser', 'zigzag'];
const COLORS = { drifter: 0xb14dff, chaser: 0xff5a6e, zigzag: 0xffb24d };

export class Enemy {
  constructor(scene, kind, x, level) {
    this.scene = scene;
    this.kind = kind || KINDS[(Math.random() * KINDS.length) | 0];
    this.color = COLORS[this.kind];
    this.r = Math.max(18, GAME.HEIGHT * 0.019);
    this.x = x;
    this.y = GAME.WALL_TOP + this.r + 4;
    this.alive = true;
    this.spin = 0;
    this.flip = 0;

    const base = GAME.HEIGHT * 0.05 + level * 5;
    this.vy = Math.min(base, GAME.HEIGHT * 0.12);
    this.vx = (Math.random() < 0.5 ? -1 : 1) * this.vy * 0.7;
    this.swayPhase = Math.random() * Math.PI * 2;

    this.glow = scene.add.image(this.x, this.y, 'soft').setDepth(12).setTint(this.color)
      .setAlpha(0.55).setBlendMode('ADD').setDisplaySize(this.r * 4, this.r * 4);
    this.gfx = scene.add.graphics().setDepth(13);
    this.draw();
  }

  static random(scene, x, level) { return new Enemy(scene, null, x, level); }

  draw() {
    const g = this.gfx; const r = this.r; const c = this.color;
    g.clear();
    g.lineStyle(2, 0xffffff, 0.5);
    if (this.kind === 'drifter') {
      g.fillStyle(c, 1); this.poly(g, 6, r, 0);
      g.fillStyle(0x05060c, 0.6); this.poly(g, 6, r * 0.55, this.spin);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(0, 0, r * 0.22);
    } else if (this.kind === 'chaser') {
      g.fillStyle(c, 1);
      g.fillTriangle(0, r, -r * 0.9, -r * 0.7, r * 0.9, -r * 0.7);
      g.fillStyle(0x05060c, 0.5); g.fillCircle(0, -r * 0.2, r * 0.28);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(0, -r * 0.2, r * 0.14);
    } else {
      g.fillStyle(c, 1); this.poly(g, 4, r, Math.PI / 4);
      g.lineStyle(3, 0xffffff, 0.7);
      g.lineBetween(-r * 0.5, 0, r * 0.5, 0);
      g.lineBetween(0, -r * 0.5, 0, r * 0.5);
    }
  }

  poly(g, sides, rad, rot) {
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = rot + (Math.PI * 2 * i) / sides - Math.PI / 2;
      pts.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad });
    }
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath(); g.fillPath();
  }

  update(dtSec, paddle) {
    if (!this.alive) return null;
    const lw = GAME.WALL_X + this.r, rw = GAME.WIDTH - GAME.WALL_X - this.r;

    if (this.kind === 'chaser') {
      const dir = Math.sign(paddle.x - this.x) || 1;
      this.vx += dir * GAME.WIDTH * 0.6 * dtSec;
      this.vx = Math.max(-this.vy * 1.6, Math.min(this.vy * 1.6, this.vx));
    } else if (this.kind === 'zigzag') {
      this.flip += dtSec;
      if (this.flip > 0.7) { this.flip = 0; this.vx *= -1; }
    } else {
      this.swayPhase += dtSec * 2;
      this.vx = Math.cos(this.swayPhase) * this.vy * 0.8;
    }

    this.x += this.vx * dtSec;
    this.y += this.vy * dtSec;
    if (this.x < lw) { this.x = lw; this.vx = Math.abs(this.vx); }
    else if (this.x > rw) { this.x = rw; this.vx = -Math.abs(this.vx); }

    this.spin += dtSec * (this.kind === 'zigzag' ? 6 : 3);

    if (this.kind === 'drifter') this.draw();

    // reached the paddle line?
    if (this.y + this.r >= paddle.top && this.x > paddle.left - this.r && this.x < paddle.right + this.r) return 'attack';
    if (this.y > GAME.HEIGHT + this.r * 2) return 'gone';
    return null;
  }

  hitBy(x, y, radius) {
    return this.alive && Math.hypot(x - this.x, y - this.y) < this.r + radius;
  }

  sync() {
    this.gfx.setPosition(this.x, this.y).setRotation(this.kind === 'drifter' ? 0 : this.spin);
    this.glow.setPosition(this.x, this.y);
  }

  kill() {
    this.alive = false;
    const dir = Math.random() < 0.5 ? -1 : 1;
    this.scene.tweens.add({ targets: [this.gfx, this.glow], y: this.y + 120, x: this.x + dir * 120, alpha: 0, angle: dir * 360, duration: 450, onComplete: () => this.destroy() });
  }

  destroy() {
    if (this._d) return; this._d = true;
    this.gfx.destroy(); this.glow.destroy();
  }
}
