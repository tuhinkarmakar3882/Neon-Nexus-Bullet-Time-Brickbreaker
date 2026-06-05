import { GAME } from '../config/Constants.js';
import { drawSoftGlow, makeGlowLayer } from '../utils/GlowFx.js';
import { circleOverlapsPaddle } from '../utils/PaddleCollision.js';

/** Collectible garden dew crystal — bonus score. */
export class Gem {
  constructor(scene, x, y, value = 150, color = 0xb8f0e8) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.value = value;
    this.color = color;
    this.r = Math.max(12, GAME.HEIGHT * 0.012);
    this.fall = GAME.HEIGHT * 0.1;
    this.spin = 0;

    this.glowGfx = makeGlowLayer(scene, 15);
    this.sprite = scene.add.image(x, y, 'gem').setDepth(16).setTint(color);
    this.spark = scene.add.image(x, y, 'spark').setDepth(17).setTint(0xffffff)
      .setAlpha(0.55).setBlendMode('ADD').setDisplaySize(this.r * 0.8, this.r * 0.8);
  }

  update(dtSec, timeScale, paddle) {
    this.y += this.fall * dtSec * timeScale;
    if (paddle.magnet) {
      this.x += (paddle.x - this.x) * Math.min(1, 5 * dtSec) * timeScale;
      this.y += (paddle.top - this.y) * Math.min(1, 5 * dtSec) * timeScale;
    }
    this.spin += dtSec * 4 * timeScale;
  }

  overlapsPaddle(p) {
    return circleOverlapsPaddle(p, this.x, this.y, this.r);
  }

  sync() {
    const sx = 0.6 + 0.4 * Math.abs(Math.cos(this.spin));
    this.sprite.setPosition(this.x, this.y).setDisplaySize(this.r * 2.2 * sx, this.r * 2.2);
    drawSoftGlow(this.glowGfx, this.x, this.y, this.r * 1.45, this.r * 1.45, this.color, 0.42);
    this.spark.setPosition(this.x, this.y - this.r * 0.5).setAlpha(0.35 + 0.35 * Math.abs(Math.sin(this.spin * 2)));
  }

  destroy() {
    this.sprite.destroy();
    this.glowGfx.destroy();
    this.spark.destroy();
  }
}
