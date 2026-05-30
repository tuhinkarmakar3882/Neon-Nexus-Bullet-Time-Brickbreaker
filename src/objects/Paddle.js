import { GAME } from '../config/Constants.js';
import { POWERS } from '../config/PowerUps.js';
import { VAUS_SLICE } from '../utils/Textures.js';
import { clamp } from '../utils/Helpers.js';

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
    this.laser = false;
    this.stunUntil = 0;

    this.shadow = scene.add.image(this.x, this.y + this.h * 0.7, 'shadow')
      .setDepth(18).setAlpha(0.5);
    this.glow = scene.add.image(this.x, this.y, 'soft').setDepth(19).setBlendMode('ADD').setAlpha(0.0);
    this.body = scene.add.nineslice(this.x, this.y, 'vaus', undefined, this.w, this.h,
      VAUS_SLICE.l, VAUS_SLICE.r, VAUS_SLICE.t, VAUS_SLICE.b).setDepth(20);
    this.cannons = scene.add.graphics().setDepth(21);
  }

  get left() { return this.x - this.w / 2; }
  get right() { return this.x + this.w / 2; }
  get top() { return this.y - this.h / 2; }
  get stunned() { return this.scene.time.now < this.stunUntil; }

  setWidth(w) {
    this.w = clamp(w, this.baseW * 0.45, Math.min(GAME.WIDTH * 0.5, this.baseW * 2.4));
  }

  glowColor() {
    if (this.stunned) return 0xff5a6e;
    if (this.sticky) return POWERS.Catch.color;
    if (this.laser) return POWERS.Laser.color;
    if (this.magnet) return POWERS.Magnet.color;
    return 0x2fe6c7;
  }

  setCenter(x) { this.x = clamp(x, GAME.WALL_X + this.w / 2, GAME.WIDTH - GAME.WALL_X - this.w / 2); }

  moveByKeyboard(dir, dtSec, timeScale) {
    if (this.stunned) return;
    this.setCenter(this.x + dir * GAME.PADDLE_SPEED * dtSec * timeScale);
  }

  setPointer(worldX) {
    if (this.stunned) return;
    this.setCenter(worldX);
  }

  stun(ms) { this.stunUntil = this.scene.time.now + ms; }

  reset() {
    this.w = this.baseW;
    this.sticky = false; this.magnet = false; this.laser = false;
    this.stunUntil = 0;
    this.x = GAME.WIDTH / 2;
  }

  sync() {
    this.body.setSize(this.w, this.h);
    this.body.setPosition(this.x, this.y);
    this.body.setTint(this.stunned ? 0x99a0b0 : 0xffffff);
    this.shadow.setPosition(this.x, this.y + this.h * 0.75).setDisplaySize(this.w * 1.05, this.h * 1.6);

    const gc = this.glowColor();
    const active = this.sticky || this.laser || this.magnet || this.stunned;
    this.glow.setTint(gc).setPosition(this.x, this.y)
      .setDisplaySize(this.w * 1.2, this.h * 4)
      .setAlpha(active ? 0.45 : 0.18);

    this.cannons.clear();
    if (this.laser) {
      this.cannons.fillStyle(POWERS.Laser.color, 1);
      this.cannons.fillRoundedRect(this.left + 8, this.top - 10, 10, 14, 3);
      this.cannons.fillRoundedRect(this.right - 18, this.top - 10, 10, 14, 3);
    }
  }

  destroy() {
    this.body.destroy(); this.glow.destroy(); this.shadow.destroy(); this.cannons.destroy();
  }
}
