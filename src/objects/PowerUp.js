import { GAME } from '../config/Constants.js';
import { POWERS } from '../config/PowerUps.js';

export class PowerUp {
  constructor(scene, x, y, key) {
    this.scene = scene;
    this.key = key;
    const def = POWERS[key];
    this.color = def.color;
    this.w = Math.max(86, GAME.WIDTH * 0.072);
    this.h = this.w * 0.36;
    this.x = x; this.y = y; // top-left
    this.dead = false;
    this.fallSpeed = GAME.HEIGHT * 0.13;

    this.glow = scene.add.image(this.cx, this.cy, 'soft').setDepth(15)
      .setTint(this.color).setAlpha(0.5).setBlendMode('ADD').setDisplaySize(this.w * 1.5, this.h * 3);
    this.pill = scene.add.image(this.cx, this.cy, 'pill').setDepth(16)
      .setDisplaySize(this.w, this.h).setTint(this.color);
    this.label = scene.add.text(this.cx, this.cy - 1, def.letter, {
      fontFamily: 'Orbitron, monospace', fontSize: Math.round(this.h * 0.74) + 'px',
      fontStyle: '900', color: '#0a0d1c',
    }).setOrigin(0.5).setDepth(17);

    this.spin = 0;
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dtSec, timeScale, paddle) {
    this.y += this.fallSpeed * dtSec * timeScale;
    if (paddle.magnet) {
      const tx = paddle.x - this.w / 2;
      const ty = paddle.top - this.h;
      this.x += (tx - this.x) * Math.min(1, 5 * dtSec) * timeScale;
      this.y += (ty - this.y) * Math.min(1, 5 * dtSec) * timeScale;
    }
    this.spin += dtSec * 6 * timeScale;
  }

  overlapsPaddle(p) {
    return this.x < p.right && this.x + this.w > p.left &&
      this.y + this.h > p.top && this.y < p.y + p.h / 2;
  }

  sync() {
    const sx = 0.6 + 0.4 * Math.abs(Math.cos(this.spin));
    this.pill.setPosition(this.cx, this.cy).setScale(sx * (this.w / this.pill.width), this.h / this.pill.height);
    this.label.setPosition(this.cx, this.cy - 1).setScale(Math.max(0.2, sx), 1);
    this.glow.setPosition(this.cx, this.cy);
  }

  destroy() {
    this.glow.destroy(); this.pill.destroy(); this.label.destroy();
  }
}
