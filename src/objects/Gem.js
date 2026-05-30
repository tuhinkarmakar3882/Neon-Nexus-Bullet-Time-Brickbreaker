import { GAME } from '../config/Constants.js';

// A collectible gem that drops from bricks for bonus score. Magnet-attracted,
// spins, and sparkles. Worth more than the brick that dropped it.
export class Gem {
  constructor(scene, x, y, value = 150, color = 0x7fefff) {
    this.scene = scene;
    this.x = x; this.y = y;
    this.value = value;
    this.color = color;
    this.r = Math.max(11, GAME.HEIGHT * 0.011);
    this.fall = GAME.HEIGHT * 0.1;
    this.spin = 0;

    this.glow = scene.add.image(x, y, 'soft').setDepth(15).setTint(color).setAlpha(0.6)
      .setBlendMode('ADD').setDisplaySize(this.r * 4, this.r * 4);
    this.gfx = scene.add.graphics().setDepth(16);
    this.draw();
  }

  draw() {
    const g = this.gfx; const r = this.r; const c = this.color;
    g.clear();
    g.fillStyle(c, 1);
    g.fillPoints([{ x: 0, y: -r }, { x: r * 0.8, y: -r * 0.2 }, { x: 0, y: r }, { x: -r * 0.8, y: -r * 0.2 }], true);
    g.fillStyle(0xffffff, 0.85);
    g.fillPoints([{ x: 0, y: -r }, { x: r * 0.8, y: -r * 0.2 }, { x: 0, y: -r * 0.1 }], true);
    g.lineStyle(1.5, 0xffffff, 0.7);
    g.strokePoints([{ x: 0, y: -r }, { x: r * 0.8, y: -r * 0.2 }, { x: 0, y: r }, { x: -r * 0.8, y: -r * 0.2 }], true);
  }

  update(dtSec, timeScale, paddle) {
    this.y += this.fall * dtSec * timeScale;
    if (paddle.magnet) {
      this.x += (paddle.x - this.x) * Math.min(1, 5 * dtSec) * timeScale;
      this.y += (paddle.top - this.y) * Math.min(1, 5 * dtSec) * timeScale;
    }
    this.spin += dtSec * 4 * timeScale;
  }

  overlapsPaddle(p) {
    return this.x > p.left - this.r && this.x < p.right + this.r && this.y + this.r > p.top && this.y < p.y + p.h;
  }

  sync() {
    this.gfx.setPosition(this.x, this.y).setScale(0.55 + 0.45 * Math.abs(Math.cos(this.spin)), 1);
    this.glow.setPosition(this.x, this.y);
  }

  destroy() { this.gfx.destroy(); this.glow.destroy(); }
}
