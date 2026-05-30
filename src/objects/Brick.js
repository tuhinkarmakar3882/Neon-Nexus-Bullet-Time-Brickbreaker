import { BRICK, GAME } from '../config/Constants.js';
import { PAL } from '../config/Palette.js';
import { PANEL_SLICE } from '../utils/Textures.js';
import { lerpColor } from '../utils/Helpers.js';

export class Brick {
  constructor(scene, x, y, w, h, type, color, level) {
    this.scene = scene;
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.type = type;
    this.color = color;
    this.level = level;
    this.alive = true;
    this.indestructible = type === 'gold';

    let hp = BRICK.HP[type] ?? 1;
    if (type === 'silver') hp = Math.min(5, 2 + Math.floor(level / 4));
    this.maxHp = hp;
    this.hp = hp;

    this.panel = scene.add.nineslice(this.cx, this.cy, 'panel', undefined, w, h, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE)
      .setDepth(10).setTint(color);
    this.fx = scene.add.graphics().setDepth(11);
    this.drawFx();
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  drawFx() {
    const g = this.fx;
    g.clear();
    g.x = this.x; g.y = this.y;
    const w = this.w, h = this.h;

    if (this.type === 'gold') {
      // metallic bolts + diagonal shine
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(8, 8, 2.5); g.fillCircle(w - 8, 8, 2.5);
      g.fillCircle(8, h - 8, 2.5); g.fillCircle(w - 8, h - 8, 2.5);
      g.lineStyle(3, 0xffffff, 0.25);
      g.lineBetween(w * 0.2, h * 0.8, w * 0.55, h * 0.2);
    } else if (this.type === 'silver') {
      const dmg = this.maxHp - this.hp;
      g.lineStyle(2, 0x05060c, 0.5);
      for (let i = 0; i < dmg; i++) {
        const yy = 6 + i * 5;
        g.lineBetween(w * 0.25, yy, w * 0.75, yy + 3);
      }
      // hp pips
      g.fillStyle(0xffffff, 0.8);
      for (let i = 0; i < this.hp; i++) g.fillCircle(8 + i * 9, h - 6, 2.2);
    } else if (this.type === 'explosive') {
      g.fillStyle(0x2a0d05, 0.85);
      g.fillCircle(w / 2, h / 2, h * 0.22);
      g.lineStyle(2, 0xfff0c0, 0.9);
      g.lineBetween(w / 2, h * 0.18, w / 2 + 5, h * 0.06);
      g.fillStyle(0xffd23d, 1);
      g.fillCircle(w / 2 + 5, h * 0.06, 2);
    } else if (this.type === 'nest') {
      // little arched doorway
      g.fillStyle(0x10142a, 0.7);
      g.fillRoundedRect(w / 2 - 9, h - 16, 18, 14, { tl: 8, tr: 8, bl: 0, br: 0 });
    }
  }

  hit(damage = 1) {
    if (this.indestructible) { this.clang(); return false; }
    this.hp -= damage;
    this.flash();
    if (this.type === 'silver' && this.hp > 0) this.drawFx();
    if (this.hp <= 0) { this.alive = false; return true; }
    return false;
  }

  flash() {
    this.scene.tweens.killTweensOf(this.panel);
    this.panel.setTint(lerpColor(this.color, 0xffffff, 0.7));
    this.scene.time.delayedCall(60, () => this.panel.active && this.panel.setTint(this.color));
    this.scene.tweens.add({ targets: this.panel, scaleX: 1.08, scaleY: 1.12, duration: 70, yoyo: true });
  }

  clang() {
    this.scene.tweens.add({ targets: this.panel, scaleX: 0.94, duration: 60, yoyo: true });
  }

  setScale(s) {
    this.w = this.baseW ? this.baseW * s : this.w;
  }

  sync() {
    this.panel.setPosition(this.cx, this.cy);
    this.fx.x = this.x; this.fx.y = this.y;
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.panel);
    this.panel.destroy();
    this.fx.destroy();
  }
}
