import { GAME } from '../config/Constants.js';
import { POWERS } from '../config/PowerUps.js';
import { clamp, lerpColor } from '../utils/Helpers.js';

const COLOR_DEFAULT = 0x00ffc3;
const COLOR_STUN = 0x5a5a5a;

export class Paddle {
  constructor(scene) {
    this.scene = scene;
    this.baseW = GAME.PADDLE_BASE_WIDTH;
    this.w = this.baseW;
    this.h = GAME.PADDLE_HEIGHT;
    this.x = GAME.WIDTH / 2;
    this.y = GAME.HEIGHT - GAME.PADDLE_Y_OFFSET;

    this.sticky = false;
    this.magnet = false;
    this.reversed = false;
    this.stunUntil = 0;
    this._sig = '';

    this.glow = scene.add.image(this.x, this.y, 'soft').setDepth(19)
      .setAlpha(0.5).setBlendMode('ADD');
    this.gfx = scene.add.graphics().setDepth(20);
    this.redraw();
  }

  get left() { return this.x - this.w / 2; }
  get right() { return this.x + this.w / 2; }
  get top() { return this.y - this.h / 2; }
  get stunned() { return this.scene.time.now < this.stunUntil; }

  setWidth(w) {
    this.w = clamp(w, this.baseW * 0.4, Math.min(GAME.WIDTH * 0.55, this.baseW * 2.6));
  }

  color() {
    if (this.stunned) return COLOR_STUN;
    if (this.sticky) return POWERS.Glue.color;
    if (this.reversed) return POWERS.Reverse.color;
    if (this.magnet) return POWERS.Magnet.color;
    return COLOR_DEFAULT;
  }

  redraw() {
    const g = this.gfx;
    const w = this.w, h = this.h;
    const c = this.color();
    const bright = lerpColor(c, 0xffffff, 0.6);
    const dark = lerpColor(c, 0x000000, 0.25);
    g.clear();
    g.fillStyle(dark, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.fillStyle(c, 1);
    g.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, h / 2);
    g.fillStyle(bright, 0.85);
    g.fillRoundedRect(-w / 2 + 8, -h / 2 + 3, w - 16, h * 0.34, h * 0.17);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(-w / 2 + h / 2, 0, h * 0.18);
    g.fillCircle(w / 2 - h / 2, 0, h * 0.18);
    this.glow.setTint(c).setDisplaySize(w * 1.25, h * 4);
  }

  setCenter(x) {
    this.x = clamp(x, this.w / 2, GAME.WIDTH - this.w / 2);
  }

  moveByKeyboard(dir, dtSec, timeScale) {
    if (this.stunned) return;
    const d = this.reversed ? -dir : dir;
    this.setCenter(this.x + d * GAME.PADDLE_SPEED * dtSec * timeScale);
  }

  setPointer(worldX) {
    if (this.stunned) return;
    const target = this.reversed ? GAME.WIDTH - worldX : worldX;
    this.setCenter(target);
  }

  stun(ms) {
    this.stunUntil = this.scene.time.now + ms;
  }

  reset() {
    this.w = this.baseW;
    this.sticky = false;
    this.magnet = false;
    this.reversed = false;
    this.stunUntil = 0;
    this.x = GAME.WIDTH / 2;
  }

  sync() {
    // Redraw only when shape/state changed (cheap + always current).
    const sig = `${Math.round(this.w)}_${this.color()}`;
    if (sig !== this._sig) { this._sig = sig; this.redraw(); }
    this.gfx.x = this.x;
    this.gfx.y = this.y;
    this.glow.setPosition(this.x, this.y);
  }

  destroy() {
    this.gfx.destroy();
    this.glow.destroy();
  }
}
