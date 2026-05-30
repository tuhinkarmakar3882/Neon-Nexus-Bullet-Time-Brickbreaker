import { BRICK, GAME } from '../config/Constants.js';
import { rand } from '../utils/Helpers.js';
import { levelScale } from '../utils/Helpers.js';

export class Brick {
  constructor(scene, x, y, w, h, type, level) {
    this.scene = scene;
    this.x = x; // top-left
    this.y = y;
    this.w = w;
    this.h = h;
    this.baseX = x;
    this.baseW = w;
    this.baseH = h;
    this.type = type;
    this.hp = type === 'boss' ? 3 : 1;
    this.alive = true;
    this.level = level;
    this.phase = rand(0, Math.PI * 2);

    // cannon timing
    this.fireTimer = rand(0, GAME.CANNON_RATE_MS * levelScale(level));

    this.gfx = scene.add.graphics().setDepth(10);
    this.redraw();
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  fillColor() {
    const C = BRICK.COLORS;
    if (this.type === 'boss') return C.boss[Math.max(0, this.hp - 1)] ?? C.boss[0];
    return C[this.type] ?? C.static;
  }

  redraw() {
    const g = this.gfx;
    const c = this.fillColor();
    g.clear();
    g.fillStyle(c, this.type === 'static' ? 0.85 : 1);
    g.fillRoundedRect(0, 0, this.w, this.h, 8);
    // inner bevel
    g.fillStyle(0xffffff, 0.18);
    g.fillRoundedRect(3, 3, this.w - 6, this.h * 0.4, 6);
    g.lineStyle(2, 0xffffff, 0.25);
    g.strokeRoundedRect(1, 1, this.w - 2, this.h - 2, 8);
  }

  // dt in seconds; returns true if it wants to fire a cannon shot this frame.
  update(dtMs, frozen) {
    if (!this.alive || frozen) return false;
    if (this.type === 'moving') {
      this.x = this.baseX + Math.sin(this.scene.time.now / 600 + this.phase) * 60;
    }
    if (this.type === 'cannon') {
      this.fireTimer -= dtMs;
      if (this.fireTimer <= 0) {
        this.fireTimer = GAME.CANNON_RATE_MS * levelScale(this.level);
        return true;
      }
    }
    return false;
  }

  setScale(s) {
    this.w = this.baseW * s;
    this.h = this.baseH * s;
    this.redraw();
  }

  hit(damage = 1) {
    this.hp -= damage;
    if (this.type === 'boss' && this.hp > 0) this.redraw();
    if (this.hp <= 0) this.alive = false;
    return this.hp <= 0;
  }

  sync() {
    this.gfx.x = this.x;
    this.gfx.y = this.y;
  }

  destroy() {
    this.gfx.destroy();
  }
}
