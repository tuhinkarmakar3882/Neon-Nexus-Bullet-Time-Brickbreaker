import { GAME } from '../config/Constants.js';
import { rand } from '../utils/Helpers.js';

// Layered neon backdrop: gradient + drifting nebula blobs + parallax starfield +
// a subtle floor grid for depth. Designed to fill any aspect ratio.
export class Background {
  constructor(scene, accent = 0x00ffc3) {
    this.scene = scene;
    this.accent = accent;
    this.t = 0;
    const W = GAME.WIDTH, H = GAME.HEIGHT;

    this.grad = scene.add.image(W / 2, H / 2, 'bg-grad')
      .setDisplaySize(W * 1.1, H * 1.1).setDepth(-100);

    // Nebula blobs (big, soft, additive) for color depth
    this.nebula = [];
    const blobColors = [accent, 0xff2bd6, 0x2b6bff];
    for (let i = 0; i < 3; i++) {
      const b = scene.add.image(rand(0, W), rand(0, H * 0.8), 'soft')
        .setDisplaySize(W * 0.9, W * 0.9)
        .setTint(blobColors[i % blobColors.length])
        .setAlpha(0.12).setBlendMode('ADD').setDepth(-95);
      this.nebula.push({ img: b, ox: b.x, oy: b.y, ph: rand(0, 6.28), sp: rand(0.1, 0.25) });
    }

    // Parallax starfield: far (small, slow) + near (bigger, faster)
    this.starsFar = scene.add.particles(0, 0, 'soft', {
      x: { min: 0, max: W }, y: { min: -20, max: H },
      lifespan: 14000, speedY: { min: 8, max: 16 },
      scale: { min: 0.04, max: 0.12 }, alpha: { min: 0.2, max: 0.5 },
      frequency: 120, tint: 0xbfdfff, blendMode: 'ADD',
    }).setDepth(-90);
    this.starsNear = scene.add.particles(0, 0, 'soft', {
      x: { min: 0, max: W }, y: { min: -20, max: H },
      lifespan: 9000, speedY: { min: 22, max: 40 },
      scale: { min: 0.1, max: 0.22 }, alpha: { min: 0.3, max: 0.7 },
      frequency: 260, tint: accent, blendMode: 'ADD',
    }).setDepth(-88);

    this.grid = scene.add.graphics().setDepth(-92).setAlpha(0.10);
  }

  setAccent(color) {
    this.accent = color;
    this.starsNear.setParticleTint(color);
    if (this.nebula[0]) this.nebula[0].img.setTint(color);
  }

  update(dtSec) {
    this.t += dtSec;
    this.nebula.forEach((n) => {
      n.img.x = n.ox + Math.sin(this.t * n.sp + n.ph) * 60;
      n.img.y = n.oy + Math.cos(this.t * n.sp * 0.8 + n.ph) * 40;
      n.img.setAlpha(0.10 + 0.05 * Math.sin(this.t * 0.5 + n.ph));
    });

    const g = this.grid;
    const W = GAME.WIDTH, H = GAME.HEIGHT;
    g.clear();
    g.lineStyle(1, this.accent, 1);
    const spacing = Math.max(60, H * 0.06);
    const scroll = (this.t * 26) % spacing;
    for (let y = H * 0.5 + scroll; y < H; y += spacing) g.lineBetween(0, y, W, y);
    for (let x = 0; x <= W; x += spacing) g.lineBetween(x, H * 0.5, x, H);
  }

  destroy() {
    this.grad.destroy();
    this.nebula.forEach((n) => n.img.destroy());
    this.starsFar.destroy();
    this.starsNear.destroy();
    this.grid.destroy();
  }
}
