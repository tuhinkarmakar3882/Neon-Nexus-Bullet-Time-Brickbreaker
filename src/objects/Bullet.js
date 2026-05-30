export class Bullet {
  constructor(scene, x, y, vy, owner) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.vy = vy;
    this.owner = owner; // 'player' | 'enemy'
    this.dead = false;

    const color = owner === 'player' ? 0xff3131 : 0xffa600;
    this.gfx = scene.add.rectangle(x, y, 6, 18, color).setDepth(18);
    this.glow = scene.add.image(x, y, 'soft')
      .setDisplaySize(26, 26).setTint(color).setAlpha(0.6).setDepth(17).setBlendMode('ADD');
  }

  update(dtSec, timeScale) {
    this.y += this.vy * dtSec * timeScale;
  }

  sync() {
    this.gfx.setPosition(this.x, this.y);
    this.glow.setPosition(this.x, this.y);
  }

  destroy() {
    this.gfx.destroy();
    this.glow.destroy();
  }
}
