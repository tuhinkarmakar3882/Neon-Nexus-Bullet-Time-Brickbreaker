import { GAME } from '../config/Constants.js';

// A flowerpot lobbed by a Jardinain. Tumbles toward the paddle; stuns on hit.
export class Pot {
  constructor(scene, x, y, targetX) {
    this.scene = scene;
    this.x = x; this.y = y;
    this.dead = false;
    this.r = Math.max(12, GAME.HEIGHT * 0.013);

    const ang = Math.atan2(GAME.HEIGHT - y, targetX - x);
    const sp = GAME.POT_SPEED;
    this.vx = Math.cos(ang) * sp * 0.6;
    this.vy = Math.abs(Math.sin(ang) * sp) + sp * 0.4;
    this.spin = 0;

    this.gfx = scene.add.graphics().setDepth(17);
    this.draw();
  }

  draw() {
    const g = this.gfx;
    const r = this.r;
    g.clear();
    // soil + pot
    g.fillStyle(0x6b4a2b, 1);
    g.fillRoundedRect(-r * 0.8, -r * 0.2, r * 1.6, r * 0.45, 3);
    g.fillStyle(0xc8773f, 1);
    g.fillTriangle(-r * 0.9, -r * 0.2, r * 0.9, -r * 0.2, r * 0.55, r);
    g.fillTriangle(-r * 0.9, -r * 0.2, r * 0.55, r, -r * 0.55, r);
    g.fillStyle(0xe0934f, 1);
    g.fillRect(-r * 0.95, -r * 0.45, r * 1.9, r * 0.3);
    // little sprout
    g.fillStyle(0x6fcf5a, 1);
    g.fillCircle(-r * 0.18, -r * 0.55, r * 0.18);
    g.fillCircle(r * 0.18, -r * 0.55, r * 0.18);
  }

  update(dtSec, timeScale) {
    this.vy += GAME.HEIGHT * 0.6 * dtSec * timeScale; // gravity
    this.x += this.vx * dtSec * timeScale;
    this.y += this.vy * dtSec * timeScale;
    this.spin += dtSec * 5 * timeScale * (this.vx < 0 ? -1 : 1);
    if (this.x < GAME.WALL_X || this.x > GAME.WIDTH - GAME.WALL_X) this.vx *= -1;
  }

  hitsPaddle(p) {
    return this.y + this.r > p.top && this.y - this.r < p.y + p.h &&
      this.x > p.left - this.r && this.x < p.right + this.r && this.vy > 0;
  }

  sync() {
    this.gfx.setPosition(this.x, this.y).setRotation(this.spin);
  }

  destroy() { this.gfx.destroy(); }
}
