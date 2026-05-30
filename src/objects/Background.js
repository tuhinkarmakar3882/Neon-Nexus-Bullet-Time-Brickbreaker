import { GAME } from '../config/Constants.js';
import { rand } from '../utils/Helpers.js';

// Animated neon backdrop: vertical gradient + slow scrolling perspective grid +
// drifting glow motes. Shared by Menu and Game scenes.
export class Background {
  constructor(scene, accent = 0x00ffc3) {
    this.scene = scene;
    this.accent = accent;
    this.t = 0;

    this.grad = scene.add.image(GAME.WIDTH / 2, GAME.HEIGHT / 2, 'bg-grad')
      .setDisplaySize(GAME.WIDTH, GAME.HEIGHT)
      .setDepth(-100);

    this.grid = scene.add.graphics().setDepth(-90).setAlpha(0.18);

    // Drifting motes
    this.motes = scene.add.particles(0, 0, 'soft', {
      x: { min: 0, max: GAME.WIDTH },
      y: { min: 0, max: GAME.HEIGHT },
      lifespan: 6000,
      speedY: { min: -12, max: -4 },
      speedX: { min: -6, max: 6 },
      scale: { min: 0.1, max: 0.4 },
      alpha: { start: 0.0, end: 0.35, ease: 'Sine.easeInOut' },
      frequency: 240,
      tint: accent,
      blendMode: 'ADD',
    }).setDepth(-80);
  }

  setAccent(color) {
    this.accent = color;
    this.motes.setParticleTint(color);
  }

  update(dtSec) {
    this.t += dtSec;
    const g = this.grid;
    g.clear();
    g.lineStyle(1, this.accent, 1);
    const spacing = 70;
    const scroll = (this.t * 30) % spacing;
    for (let y = -spacing + scroll; y < GAME.HEIGHT; y += spacing) {
      g.lineBetween(0, y, GAME.WIDTH, y);
    }
    for (let x = 0; x <= GAME.WIDTH; x += spacing) {
      g.lineBetween(x, 0, x, GAME.HEIGHT);
    }
  }

  destroy() {
    this.grad.destroy();
    this.grid.destroy();
    this.motes.destroy();
  }
}
