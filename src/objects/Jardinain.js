import { GAME, JARDINAIN } from '../config/Constants.js';
import { rand } from '../utils/Helpers.js';

// A little creature that lives on a brick, bobs, and lobs flowerpots at the
// paddle. Knock it off with the ball for big points. (Jardinains homage.)
export class Jardinain {
  constructor(scene, brick) {
    this.scene = scene;
    this.brick = brick;
    this.alive = true;
    this.r = Math.max(15, GAME.HEIGHT * 0.013);
    this.bob = rand(0, Math.PI * 2);
    this.throwTimer = rand(JARDINAIN.THROW_MIN_MS, JARDINAIN.THROW_MAX_MS);
    this.knocked = false;

    this.x = brick.cx;
    this.y = brick.y - this.r;

    this.c = scene.add.container(this.x, this.y).setDepth(13);
    this.draw();
  }

  draw() {
    const r = this.r;
    const g = this.scene.add.graphics();
    // feet
    g.fillStyle(0x14241c, 1);
    g.fillEllipse(-r * 0.4, r * 0.85, r * 0.4, r * 0.25);
    g.fillEllipse(r * 0.4, r * 0.85, r * 0.4, r * 0.25);
    // body
    g.fillStyle(0x1c3a2a, 1);
    g.fillCircle(0, 0, r * 1.02);
    g.fillStyle(0x86e6b0, 1);
    g.fillCircle(0, 0, r * 0.92);
    // belly
    g.fillStyle(0xc7f6da, 0.8);
    g.fillEllipse(0, r * 0.22, r * 0.9, r * 0.7);
    // eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(-r * 0.34, -r * 0.18, r * 0.3);
    g.fillCircle(r * 0.34, -r * 0.18, r * 0.3);
    g.fillStyle(0x10202a, 1);
    g.fillCircle(-r * 0.3, -r * 0.1, r * 0.15);
    g.fillCircle(r * 0.38, -r * 0.1, r * 0.15);
    // antenna
    g.lineStyle(2, 0x1c3a2a, 1);
    g.lineBetween(0, -r * 0.9, r * 0.2, -r * 1.5);
    this.c.add(g);
    this.tip = this.scene.add.image(r * 0.2, -r * 1.5, 'soft').setTint(0x2fe6c7).setBlendMode('ADD').setDisplaySize(r * 0.9, r * 0.9);
    this.c.add(this.tip);
    this.gfx = g;
  }

  // returns true if it wants to throw a pot this frame
  update(dtMs, dtSec) {
    if (this.knocked || !this.alive) return false;
    if (!this.brick || !this.brick.alive) { this.flee(); return false; }
    this.bob += dtSec * 3;
    this.x = this.brick.cx;
    this.y = this.brick.y - this.r - 2 + Math.sin(this.bob) * 3;
    this.c.setPosition(this.x, this.y);
    this.tip.setAlpha(0.6 + 0.4 * Math.sin(this.bob * 2));

    this.throwTimer -= dtMs;
    if (this.throwTimer <= 0) {
      this.throwTimer = rand(JARDINAIN.THROW_MIN_MS, JARDINAIN.THROW_MAX_MS);
      this.scene.tweens.add({ targets: this.c, scaleY: 0.7, scaleX: 1.2, duration: 110, yoyo: true });
      return true;
    }
    return false;
  }

  hitBy(ball) {
    if (this.knocked) return false;
    return Math.hypot(ball.x - this.x, ball.y - this.y) < this.r + ball.r;
  }

  knockout() {
    this.knocked = true;
    this.alive = false;
    const dir = Math.random() < 0.5 ? -1 : 1;
    this.scene.tweens.add({
      targets: this.c, y: this.y + GAME.HEIGHT, x: this.x + dir * 200,
      angle: dir * 540, alpha: 0, duration: 900, ease: 'Cubic.easeIn',
      onComplete: () => this.destroy(),
    });
  }

  flee() {
    if (this.knocked) return;
    this.knocked = true;
    this.alive = false;
    this.scene.tweens.add({
      targets: this.c, y: this.y - 120, alpha: 0, duration: 500, ease: 'Cubic.easeOut',
      onComplete: () => this.destroy(),
    });
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.c.destroy();
  }
}
