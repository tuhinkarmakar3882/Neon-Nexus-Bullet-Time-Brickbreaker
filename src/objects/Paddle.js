import { GAME } from '../config/Constants.js';
import { POWERS } from '../config/PowerUps.js';
import { clamp } from '../utils/Helpers.js';

const COLOR_DEFAULT = 0xffffff;
const COLOR_STUN = 0x5a5a5a;

export class Paddle {
  constructor(scene) {
    this.scene = scene;
    this.baseW = GAME.PADDLE_BASE_WIDTH;
    this.w = this.baseW;
    this.h = GAME.PADDLE_HEIGHT;
    this.x = GAME.WIDTH / 2; // center x
    this.y = GAME.HEIGHT - GAME.PADDLE_Y_OFFSET;

    this.sticky = false;
    this.magnet = false;
    this.reversed = false;
    this.stunUntil = 0;

    this.gfx = scene.add.graphics();
    this.gfx.setDepth(20);
    this.redraw();
  }

  get left() { return this.x - this.w / 2; }
  get right() { return this.x + this.w / 2; }
  get top() { return this.y - this.h / 2; }
  get stunned() { return this.scene.time.now < this.stunUntil; }

  setWidth(w) {
    this.w = clamp(w, this.baseW * 0.4, Math.min(GAME.WIDTH * 0.55, this.baseW * 2.6));
    this.redraw();
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
    g.clear();
    g.fillStyle(c, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    // Bright core highlight for a glossy neon bar.
    g.fillStyle(0xffffff, 0.5);
    g.fillRoundedRect(-w / 2 + 6, -h / 2 + 3, w - 12, h * 0.32, h * 0.16);
  }

  setCenter(x) {
    this.x = clamp(x, this.w / 2, GAME.WIDTH - this.w / 2);
  }

  moveByKeyboard(dir, dtSec, timeScale) {
    if (this.stunned) return;
    const d = this.reversed ? -dir : dir;
    this.setCenter(this.x + d * GAME.PADDLE_SPEED * dtSec * timeScale);
  }

  // Absolute pointer position (already in world coords), honoring reverse.
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
    this.redraw();
  }

  sync() {
    this.gfx.x = this.x;
    this.gfx.y = this.y;
  }

  destroy() {
    this.gfx.destroy();
  }
}
