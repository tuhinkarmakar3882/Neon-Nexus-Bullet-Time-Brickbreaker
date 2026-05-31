import { GAME } from '../config/Constants.js';
import { PAL } from '../config/Palette.js';
import { powerFillColor } from '../config/PowerUps.js';
import { VAUS_SLICE } from '../utils/Textures.js';
import { clamp } from '../utils/Helpers.js';

const CANNON_COLORS = {
  laser: () => powerFillColor('Laser'),
  fire: () => powerFillColor('FireCannon'),
  ice: () => powerFillColor('IceCannon'),
  shock: () => powerFillColor('ShockCannon'),
  napalm: () => powerFillColor('NapalmCannon'),
};

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
    this.cannonType = null;
    this.speedMult = 1;
    this.widthPenaltyMult = 1;
    this.stunUntil = 0;
    this._targetX = this.x;
    this._smooth = 0.35;
    this._hullTint = 0xffffff;

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
  get hasCannon() { return !!this.cannonType; }

  setCannon(type) {
    this.cannonType = type || null;
  }

  setWidth(w) {
    const tb = GAME.TABLET_BOOST ?? 0;
    const cap = GAME.IS_PORTRAIT
      ? GAME.WIDTH * (0.62 + tb * 0.05)
      : GAME.WIDTH * (0.48 + tb * 0.05);
    this.w = clamp(w, this.baseW * 0.45, Math.min(cap, this.baseW * 2.4));
  }

  glowColor() {
    if (this.stunned) return PAL.danger;
    if (this.sticky) return powerFillColor('Catch');
    if (this.cannonType && CANNON_COLORS[this.cannonType]) return CANNON_COLORS[this.cannonType]();
    return PAL.accent;
  }

  setCenter(x) {
    this.x = clamp(x, GAME.WALL_X + this.w / 2, GAME.WIDTH - GAME.WALL_X - this.w / 2);
  }

  moveByKeyboard(dir, dtSec, timeScale) {
    if (this.stunned) return;
    this.setCenter(this.x + dir * GAME.PADDLE_SPEED * this.speedMult * dtSec * timeScale);
  }

  setPointer(worldX) {
    if (this.stunned) return;
    this._targetX = clamp(worldX, GAME.WALL_X + this.w / 2, GAME.WIDTH - GAME.WALL_X - this.w / 2);
    const smooth = clamp(this._smooth * this.speedMult, 0.2, 0.55);
    this.x += (this._targetX - this.x) * smooth;
  }

  relayout() {
    this.baseW = GAME.PADDLE_BASE_WIDTH;
    this.y = GAME.HEIGHT - GAME.PADDLE_Y_OFFSET;
    if (window.innerWidth / window.innerHeight < 0.6) {
      this.y -= GAME.HEIGHT * 0.04;
    }
    this._targetX = clamp(this.x, GAME.WALL_X + this.w / 2, GAME.WIDTH - GAME.WALL_X - this.w / 2);
  }

  applyAnchorShrink() {
    this.widthPenaltyMult = Math.max(0.4, this.widthPenaltyMult * GAME.ANCHOR_WIDTH_PENALTY);
  }

  stun(ms) { this.stunUntil = this.scene.time.now + ms; }

  reset() {
    this.w = this.baseW;
    this.sticky = false;
    this.magnet = false;
    this.cannonType = null;
    this.speedMult = 1;
    this.widthPenaltyMult = 1;
    this.stunUntil = 0;
    this.x = GAME.WIDTH / 2;
  }

  applyCosmetic(tint = 0xffffff) {
    this._hullTint = tint;
  }

  sync() {
    this.body.setAngle(0);
    this.body.setSize(this.w, this.h);
    this.body.setPosition(this.x, this.y);
    this.body.setTint(this.stunned ? 0xff6b7a : this._hullTint);
    this.shadow.setPosition(this.x, this.y + this.h * 0.75).setDisplaySize(this.w * 1.05, this.h * 1.55);

    const gc = this.glowColor();
    const active = this.sticky || this.hasCannon || this.magnet || this.stunned;
    this.glow.setPosition(this.x, this.y)
      .setDisplaySize(this.w * 1.2, this.h * 3.4)
      .setTint(active ? gc : 0x5aa0ff)
      .setAlpha(active ? 0.45 + 0.1 * Math.sin(this.scene.frame * 0.08) : 0.14);

    this.cannons.clear();
    if (!this.cannonType) return;
    const c = CANNON_COLORS[this.cannonType]?.() ?? PAL.accent;
    this.cannons.fillStyle(c, 1);
    if (this.cannonType === 'laser') {
      this.cannons.fillRoundedRect(this.left + 8, this.top - 10, 10, 14, 3);
      this.cannons.fillRoundedRect(this.right - 18, this.top - 10, 10, 14, 3);
    } else if (this.cannonType === 'fire') {
      this.cannons.fillCircle(this.x - 18, this.top - 6, 8);
      this.cannons.fillCircle(this.x + 18, this.top - 6, 8);
    } else if (this.cannonType === 'ice') {
      this.cannons.fillRoundedRect(this.x - 6, this.top - 12, 12, 16, 4);
    } else if (this.cannonType === 'shock') {
      this.cannons.fillTriangle(this.x - 10, this.top - 4, this.x, this.top - 14, this.x + 10, this.top - 4);
    } else if (this.cannonType === 'napalm') {
      this.cannons.fillCircle(this.x - 14, this.top - 6, 7);
      this.cannons.fillCircle(this.x + 14, this.top - 6, 7);
      this.cannons.fillStyle(0xffaa00, 0.8);
      this.cannons.fillCircle(this.x, this.top - 10, 5);
    }
  }

  destroy() {
    this.body.destroy();
    this.glow.destroy();
    this.shadow.destroy();
    this.cannons.destroy();
  }
}
