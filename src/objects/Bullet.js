export class Bullet {
  constructor(scene, x, y, vy) {
    this.scene = scene;
    this.x = x; this.y = y; this.vy = vy;
    this.dead = false;
    this.gfx = scene.add.rectangle(x, y, 5, 20, 0xff5566).setDepth(18);
    this.glow = scene.add.image(x, y, 'soft').setDisplaySize(22, 30)
      .setTint(0xff5566).setAlpha(0.7).setDepth(17).setBlendMode('ADD');
  }

  update(dtSec, timeScale) {
    this.y += this.vy * dtSec * timeScale;
  }

  sync() {
    this.gfx.setPosition(this.x, this.y);
    this.glow.setPosition(this.x, this.y);
  }

  destroy() {
    this.gfx.destroy(); this.glow.destroy();
  }
}
