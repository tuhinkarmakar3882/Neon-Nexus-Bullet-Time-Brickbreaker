import { BRICK, GAME } from '../config/Constants.js';
import { rand, levelScale, lerpColor } from '../utils/Helpers.js';

export class Brick {
  constructor(scene, x, y, w, h, type, level) {
    this.scene = scene;
    this.x = x;
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
    const w = this.w, h = this.h, r = Math.min(9, h * 0.3);
    const c = this.fillColor();
    const bright = lerpColor(c, 0xffffff, 0.45);
    const dark = lerpColor(c, 0x000000, 0.35);
    g.clear();
    // body
    g.fillStyle(dark, 0.95);
    g.fillRoundedRect(0, 0, w, h, r);
    // top gloss band
    g.fillStyle(bright, 0.55);
    g.fillRoundedRect(2, 2, w - 4, h * 0.42, r * 0.7);
    // mid color
    g.fillStyle(c, 0.85);
    g.fillRoundedRect(2, h * 0.42, w - 4, h * 0.5, r * 0.6);
    // neon edge
    g.lineStyle(2, bright, 0.9);
    g.strokeRoundedRect(1, 1, w - 2, h - 2, r);

    // boss HP pips
    if (this.type === 'boss') {
      for (let i = 0; i < this.hp; i++) {
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(8 + i * 12, h - 7, 3);
      }
    }
    // cannon muzzle hint
    if (this.type === 'cannon') {
      g.fillStyle(0x05060a, 0.8);
      g.fillRect(w / 2 - 4, h - 6, 8, 5);
    }
  }

  update(dtMs, frozen) {
    if (!this.alive || frozen) return false;
    if (this.type === 'moving') {
      this.x = this.baseX + Math.sin(this.scene.time.now / 600 + this.phase) * (this.w * 0.6 + 30);
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
