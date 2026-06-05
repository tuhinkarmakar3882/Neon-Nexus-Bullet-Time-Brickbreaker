import { GAME } from '../config/Constants.js';
import { clamp } from '../utils/Helpers.js';
import { drawSoftGlow, makeGlowLayer } from '../utils/GlowFx.js';
import { circleOverlapsPaddle } from '../utils/PaddleCollision.js';

/** Gnome-thrown hazard: pot, anchor/safe, or smartphone. */
export class GnomeProjectile {
  constructor(scene, x, y, targetX, opts = {}) {
    this.scene = scene;
    this.type = opts.type ?? 'pot';
    this.x = x;
    this.y = y;
    this.dead = false;
    this.tracking = opts.tracking ?? false;
    this.gravityScale = opts.gravityScale ?? 1;
    this._telegraphed = false;
    this._shadowGfx = null;
    this.r = this.type === 'anchor' ? Math.max(16, GAME.HEIGHT * 0.016) : Math.max(12, GAME.HEIGHT * 0.013);
    this.spin = 0;

    const ang = Math.atan2(GAME.HEIGHT - y, targetX - x);
    const speedMult = (scene.potSpeedMult ?? scene.difficulty?.potSpeedMult ?? 1) * (opts.speedMult ?? 1);
    const base = (this.type === 'anchor' ? GAME.POT_SPEED * 0.85 : GAME.POT_SPEED) * speedMult;
    const sp = base;
    const vxBase = Math.cos(ang) * sp * 0.65 + (opts.vxBias ?? 0);
    this.vx = clamp(vxBase, -sp * 0.9, sp * 0.9);
    this.vy = Math.abs(Math.sin(ang) * sp) + sp * 0.35;

    this._glowTint = 0xe8a060;
    this.glowGfx = makeGlowLayer(scene, 16);
    this.gfx = scene.add.graphics().setDepth(17);
    this.draw();
  }

  draw() {
    const g = this.gfx;
    const r = this.r;
    g.clear();
    if (this.type === 'anchor') {
      g.fillStyle(0x08050c, 0.3);
      g.fillEllipse(0, r * 0.5, r * 1.4, r * 0.35);
      g.fillStyle(0x556677, 1);
      g.fillCircle(0, 0, r);
      g.fillStyle(0x99aabb, 1);
      g.fillRect(-r * 0.12, -r * 1.15, r * 0.24, r * 0.55);
      g.lineStyle(3, 0xddeeff, 0.9);
      g.lineBetween(-r * 0.65, r * 0.15, r * 0.65, r * 0.15);
      g.fillStyle(0xccddee, 0.6);
      g.fillCircle(0, -r * 0.85, r * 0.18);
    } else if (this.type === 'phone') {
      g.fillStyle(0x08050c, 0.25);
      g.fillEllipse(0, r * 0.75, r * 0.9, r * 0.2);
      g.fillStyle(0x2a2838, 1);
      g.fillRoundedRect(-r * 0.52, -r * 0.88, r * 1.04, r * 1.75, 5);
      g.fillStyle(0x1a1828, 1);
      g.fillRoundedRect(-r * 0.44, -r * 0.72, r * 0.88, r * 1.35, 3);
      g.fillStyle(0x66ccff, 0.85);
      g.fillRoundedRect(-r * 0.38, -r * 0.62, r * 0.76, r * 1.1, 2);
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(0, r * 0.58, r * 0.08);
    } else {
      // terracotta flower pot
      g.fillStyle(0x08050c, 0.3);
      g.fillEllipse(0, r * 0.85, r * 1.5, r * 0.3);
      g.fillStyle(0x8b5030, 1);
      g.fillRoundedRect(-r * 0.85, r * 0.05, r * 1.7, r * 0.75, 4);
      g.fillStyle(0xc87848, 1);
      g.beginPath();
      g.moveTo(-r * 0.95, r * 0.05);
      g.lineTo(r * 0.95, r * 0.05);
      g.lineTo(r * 0.75, -r * 0.15);
      g.lineTo(-r * 0.75, -r * 0.15);
      g.closePath();
      g.fillPath();
      g.fillStyle(0xe8a060, 1);
      g.fillRect(-r * 1.0, -r * 0.15, r * 2.0, r * 0.22);
      g.fillStyle(0x5ecf5a, 1);
      g.fillEllipse(-r * 0.22, -r * 0.42, r * 0.2, r * 0.28);
      g.fillEllipse(0, -r * 0.55, r * 0.18, r * 0.32);
      g.fillEllipse(r * 0.22, -r * 0.42, r * 0.2, r * 0.28);
      g.fillStyle(0x3a9028, 1);
      g.fillRect(-r * 0.04, -r * 0.35, r * 0.08, r * 0.45);
    }
    this._glowTint = this.type === 'anchor' ? 0xaabbcc : this.type === 'phone' ? 0x66ccff : 0xe8a060;
  }

  update(dtSec, timeScale, paddle) {
    const grav = GAME.HEIGHT * 0.6 * this.gravityScale * dtSec * timeScale;
    this.vy += grav;

    if (this.tracking && paddle && this.y < paddle.y) {
      const dx = paddle.x - this.x;
      this.vx += clamp(dx * 0.8, -200, 200) * dtSec * timeScale;
    }

    this.x += this.vx * dtSec * timeScale;
    this.y += this.vy * dtSec * timeScale;
    this.spin += dtSec * 5 * timeScale * (this.vx < 0 ? -1 : 1);
  }

  hitsPaddle(p) {
    return this.vy > 0 && circleOverlapsPaddle(p, this.x, this.y, this.r);
  }

  sync() {
    this.gfx.setPosition(this.x, this.y).setRotation(this.spin);
    drawSoftGlow(this.glowGfx, this.x, this.y, this.r * 1.35, this.r * 1.35, this._glowTint, 0.22);
  }

  destroy() {
    this._shadowGfx?.destroy?.();
    this.gfx.destroy();
    this.glowGfx.destroy();
  }
}

/** @deprecated alias */
export { GnomeProjectile as Pot };
