import Phaser from 'phaser';
import { GAME } from '../config/Constants.js';
import { PAL } from '../config/Palette.js';
import { rand } from '../utils/Helpers.js';

// Layered garden backdrop: gradient + drifting nebula + parallax starfield + floor grid.
export class Background {
  constructor(scene, accent = PAL.accent, opts = {}) {
    this.scene = scene;
    this.accent = accent;
    this.reducedFx = opts.reducedFx ?? false;
    this.t = 0;
    const W = GAME.WIDTH, H = GAME.HEIGHT;

    this.grad = scene.add.image(W / 2, H / 2, 'bg-grad')
      .setDisplaySize(W * 1.1, H * 1.1).setDepth(-100);

    this.nebula = [];
    const blobColors = [accent, 0xd45d8c, 0x684878];
    for (let i = 0; i < 3; i++) {
      const b = scene.add.image(rand(0, W), rand(0, H * 0.8), 'soft')
        .setDisplaySize(W * 0.9, W * 0.9)
        .setTint(blobColors[i % blobColors.length])
        .setAlpha(0.12).setBlendMode('ADD').setDepth(-95);
      this.nebula.push({ img: b, ox: b.x, oy: b.y, ph: rand(0, 6.28), sp: rand(0.1, 0.25) });
    }

    const farFreq = this.reducedFx ? 220 : 120;
    const nearFreq = this.reducedFx ? 480 : 260;
    this.starsFar = scene.add.particles(0, 0, 'soft', {
      x: { min: 0, max: W }, y: { min: -20, max: H },
      lifespan: 14000, speedY: { min: 8, max: 16 },
      scale: { min: 0.04, max: 0.12 }, alpha: { min: 0.2, max: 0.5 },
      frequency: farFreq, tint: 0xbfdfff, blendMode: 'ADD',
    }).setDepth(-90);
    this.starsNear = scene.add.particles(0, 0, 'soft', {
      x: { min: 0, max: W }, y: { min: -20, max: H },
      lifespan: 9000, speedY: { min: 22, max: 40 },
      scale: { min: 0.1, max: 0.22 }, alpha: { min: 0.3, max: 0.7 },
      frequency: nearFreq, tint: accent, blendMode: 'ADD',
    }).setDepth(-88);

    this.motes = scene.add.particles(0, 0, 'spark-shard', {
      x: { min: 0, max: W }, y: { min: 0, max: H },
      lifespan: { min: 6000, max: 11000 },
      speedX: { min: -8, max: 8 },
      speedY: { min: -14, max: -4 },
      scale: { min: 0.04, max: 0.1 },
      alpha: { min: 0.08, max: 0.22 },
      frequency: this.reducedFx ? 900 : 420,
      tint: accent,
      blendMode: 'ADD',
      rotate: { min: 0, max: 360 },
    }).setDepth(-89);

    this.grid = scene.add.graphics().setDepth(-92).setAlpha(0.10);
    this.frame = 0;
  }

  relayout() {
    const W = GAME.WIDTH, H = GAME.HEIGHT;
    this.grad.setPosition(W / 2, H / 2).setDisplaySize(W * 1.1, H * 1.1);
  }

  setAccent(color) {
    this.accent = color;
    this.starsNear.setParticleTint(color);
    this.motes.setParticleTint(color);
    if (this.nebula[0]) this.nebula[0].img.setTint(color);
  }

  setFxLevel(reduced = false) {
    this.reducedFx = reduced;
    if (!this.starsFar?.scene) return;
    this.starsFar.setFrequency(reduced ? 220 : 120);
    this.starsNear.setFrequency(reduced ? 480 : 260);
    this.motes?.setFrequency(reduced ? 900 : 420);
  }

  update(dtSec, isBoss = false) {
    this.t += dtSec;
    this.nebula.forEach((n) => {
      n.img.x = n.ox + Math.sin(this.t * n.sp + n.ph) * 60;
      n.img.y = n.oy + Math.cos(this.t * n.sp * 0.8 + n.ph) * 40;
      n.img.setAlpha(0.10 + 0.05 * Math.sin(this.t * 0.5 + n.ph));
    });

    const shift = 0.5 + 0.5 * Math.sin(this.t / 18);
    this.grad.setTint(Phaser.Display.Color.GetColor(
      Math.round(40 + shift * 30),
      Math.round(90 + shift * 40),
      Math.round(120 + shift * 50),
    ));

    if (isBoss && this.frame++ % 120 === 0) {
      this.starsNear.explode(3, Math.random() * GAME.WIDTH, 0);
    }

    const g = this.grid;
    const W = GAME.WIDTH, H = GAME.HEIGHT;
    g.clear();
    g.lineStyle(1, this.accent, 0.85);
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
    this.motes.destroy();
    this.grid.destroy();
  }
}
