import { GAME } from '../config/Constants.js';
import { PAL } from '../config/Palette.js';

// Neon garden pests — crisp silhouettes with glowing outlines.
const KINDS = ['drifter', 'chaser', 'zigzag'];
const COLORS = { drifter: PAL.info, chaser: PAL.danger, zigzag: PAL.accent };

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
    this.wingPhase = Math.random() * Math.PI * 2;

    const base = GAME.HEIGHT * 0.05 + level * 5;
    this.vy = Math.min(base, GAME.HEIGHT * 0.12);
    this.vx = (Math.random() < 0.5 ? -1 : 1) * this.vy * 0.7;
    this.swayPhase = Math.random() * Math.PI * 2;

    this.glow = scene.add.image(this.x, this.y, 'soft').setDepth(12).setTint(this.color)
      .setAlpha(0.38).setBlendMode('ADD').setDisplaySize(this.r * 3.2, this.r * 3.2);
    this.gfx = scene.add.graphics().setDepth(13);
    this.draw();
  }

  static random(scene, x, level) { return new Enemy(scene, null, x, level); }

  draw() {
    const g = this.gfx;
    const r = this.r;
    const c = this.color;
    g.clear();

    if (this.kind === 'drifter') {
      const wing = 0.5 + 0.5 * Math.abs(Math.sin(this.wingPhase));
      g.fillStyle(c, 0.18);
      g.fillEllipse(-r * 0.48 * wing, -r * 0.04, r * 0.92 * wing, r * 0.58);
      g.fillEllipse(r * 0.48 * wing, -r * 0.04, r * 0.92 * wing, r * 0.58);
      g.lineStyle(2, c, 0.85);
      g.strokeEllipse(-r * 0.48 * wing, -r * 0.04, r * 0.88 * wing, r * 0.52);
      g.strokeEllipse(r * 0.48 * wing, -r * 0.04, r * 0.88 * wing, r * 0.52);
      g.fillStyle(c, 0.95);
      g.fillEllipse(0, 0, r * 0.28, r * 0.62);
      g.fillStyle(0xffffff, 0.95);
      g.fillCircle(-r * 0.1, -r * 0.22, r * 0.09);
      g.fillCircle(r * 0.1, -r * 0.22, r * 0.09);
      g.fillStyle(0x080c18, 0.9);
      g.fillCircle(-r * 0.1, -r * 0.2, r * 0.045);
      g.fillCircle(r * 0.1, -r * 0.2, r * 0.045);
    } else if (this.kind === 'chaser') {
      const wing = 0.55 + 0.45 * Math.abs(Math.sin(this.wingPhase * 1.4));
      g.fillStyle(c, 0.15);
      g.fillEllipse(-r * 0.72 * wing, -r * 0.05, r * 0.5, r * 0.38);
      g.fillEllipse(r * 0.72 * wing, -r * 0.05, r * 0.5, r * 0.38);
      g.lineStyle(2, c, 0.8);
      g.strokeEllipse(-r * 0.72 * wing, -r * 0.05, r * 0.5, r * 0.38);
      g.strokeEllipse(r * 0.72 * wing, -r * 0.05, r * 0.5, r * 0.38);
      g.fillStyle(c, 0.95);
      g.fillTriangle(0, -r * 0.42, r * 0.32, r * 0.08, 0, r * 0.42);
      g.fillTriangle(0, -r * 0.42, -r * 0.32, r * 0.08, 0, r * 0.42);
      g.fillTriangle(0, r * 0.08, r * 0.22, r * 0.55, 0, r * 0.42);
      g.fillTriangle(0, r * 0.08, -r * 0.22, r * 0.55, 0, r * 0.42);
      g.lineStyle(2, 0xffffff, 0.35);
      g.lineBetween(0, -r * 0.42, r * 0.32, r * 0.08);
      g.lineBetween(r * 0.32, r * 0.08, r * 0.22, r * 0.55);
      g.lineBetween(r * 0.22, r * 0.55, 0, r * 0.42);
      g.lineBetween(0, r * 0.42, -r * 0.22, r * 0.55);
      g.lineBetween(-r * 0.22, r * 0.55, -r * 0.32, r * 0.08);
      g.lineBetween(-r * 0.32, r * 0.08, 0, -r * 0.42);
      g.fillStyle(0x120818, 0.65);
      g.fillRect(-r * 0.38, -r * 0.05, r * 0.76, r * 0.1);
      g.fillRect(-r * 0.32, r * 0.12, r * 0.64, r * 0.08);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(0, -r * 0.32, r * 0.14);
      g.fillStyle(0x120818, 0.85);
      g.fillCircle(-r * 0.05, -r * 0.32, r * 0.045);
      g.fillCircle(r * 0.05, -r * 0.32, r * 0.045);
    } else {
      const pulse = 0.85 + 0.15 * Math.sin(this.wingPhase * 2);
      g.fillStyle(c, 0.2 * pulse);
      g.fillCircle(0, 0, r * 0.95);
      g.lineStyle(2.5, c, 0.9);
      g.strokeCircle(0, 0, r * 0.82);
      g.fillStyle(c, 0.9);
      g.fillCircle(0, 0, r * 0.55);
      g.fillStyle(0xffffff, 0.75);
      g.fillEllipse(0, -r * 0.12, r * 0.38, r * 0.22);
      g.lineStyle(1.5, c, 0.7);
      g.lineBetween(-r * 0.08, -r * 0.58, -r * 0.22, -r * 0.82);
      g.lineBetween(r * 0.08, -r * 0.58, r * 0.22, -r * 0.82);
      g.fillStyle(0xffffff, 0.95);
      g.fillCircle(0, r * 0.52, r * 0.12 * pulse);
    }
  }

  update(dtSec, paddle) {
    if (!this.alive) return null;
    const lw = GAME.WALL_X + this.r;
    const rw = GAME.WIDTH - GAME.WALL_X - this.r;

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

    this.spin += dtSec * (this.kind === 'zigzag' ? 5 : 2);
    this.wingPhase += dtSec * 12;
    this.draw();

    if (this.y + this.r >= paddle.top && this.x > paddle.left - this.r && this.x < paddle.right + this.r) return 'attack';
    if (this.y > GAME.HEIGHT + this.r * 2) return 'gone';
    return null;
  }

  hitBy(x, y, radius) {
    return this.alive && Math.hypot(x - this.x, y - this.y) < this.r + radius;
  }

  sync() {
    this.gfx.setPosition(this.x, this.y).setRotation(this.kind === 'zigzag' ? this.spin * 0.25 : 0);
    this.glow.setPosition(this.x, this.y).setAlpha(0.32 + 0.12 * Math.sin(this.wingPhase));
  }

  kill() {
    this.alive = false;
    const dir = Math.random() < 0.5 ? -1 : 1;
    this.scene.tweens.add({
      targets: [this.gfx, this.glow], y: this.y + 120, x: this.x + dir * 120,
      alpha: 0, angle: dir * 360, duration: 450, onComplete: () => this.destroy(),
    });
  }

  destroy() {
    if (this._d) return;
    this._d = true;
    this.gfx.destroy();
    this.glow.destroy();
  }
}
