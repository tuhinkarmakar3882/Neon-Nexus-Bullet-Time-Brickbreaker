import { POWERS } from '../config/PowerUps.js';

const FALL_SPEED = 150; // px/sec

export class PowerUp {
  constructor(scene, x, y, key) {
    this.scene = scene;
    this.key = key;
    this.x = x; // top-left
    this.y = y;
    this.w = 96;
    this.h = 30;
    this.dead = false;
    this.color = POWERS[key].color;

    this.container = scene.add.container(x + this.w / 2, y + this.h / 2).setDepth(16);
    const bg = scene.add.graphics();
    bg.fillStyle(this.color, 1);
    bg.fillRoundedRect(-this.w / 2, -this.h / 2, this.w, this.h, 8);
    bg.lineStyle(2, 0xffffff, 0.6);
    bg.strokeRoundedRect(-this.w / 2, -this.h / 2, this.w, this.h, 8);
    const label = scene.add.text(0, 0, key, {
      fontFamily: 'Orbitron, monospace',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#05060a',
    }).setOrigin(0.5);
    this.container.add([bg, label]);

    this.glow = scene.add.image(x + this.w / 2, y + this.h / 2, 'soft')
      .setDisplaySize(this.w * 1.4, this.h * 2.4)
      .setTint(this.color).setAlpha(0.4).setDepth(15).setBlendMode('ADD');

    scene.tweens.add({ targets: this.container, scaleX: 1.06, scaleY: 1.06, yoyo: true, repeat: -1, duration: 600 });
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dtSec, timeScale, paddle) {
    this.y += FALL_SPEED * dtSec * timeScale;
    if (paddle.magnet) {
      const tx = paddle.x - this.w / 2;
      const ty = paddle.top - this.h;
      this.x += (tx - this.x) * Math.min(1, 4 * dtSec) * timeScale;
      this.y += (ty - this.y) * Math.min(1, 4 * dtSec) * timeScale;
    }
  }

  overlapsPaddle(paddle) {
    return (
      this.x < paddle.right &&
      this.x + this.w > paddle.left &&
      this.y + this.h > paddle.top &&
      this.y < paddle.y + paddle.h / 2
    );
  }

  sync() {
    this.container.setPosition(this.cx, this.cy);
    this.glow.setPosition(this.cx, this.cy);
  }

  destroy() {
    this.container.destroy();
    this.glow.destroy();
  }
}
