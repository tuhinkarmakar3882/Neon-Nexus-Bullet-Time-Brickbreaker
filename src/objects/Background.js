import Phaser from 'phaser';
import { GAME } from '../config/Constants.js';
import { PAL } from '../config/Palette.js';
import { VFX_PRESETS } from '../config/VfxQuality.js';
import { fxParticlesOn } from '../utils/FxBudget.js';
import { rand } from '../utils/Helpers.js';

const DEFAULT_BG = {
  nebula: 3,
  nebulaAlpha: 0.12,
  stars: true,
  motes: true,
  gridAlpha: 0.1,
  aurora: false,
  starFarFreq: 120,
  starNearFreq: 260,
  moteFreq: 420,
};

/** Gameplay backdrop — subtle dim so neon gameplay reads without crushing visibility. */
const GAMEPLAY_DIM = {
  overlay: 0x020408,
  overlayAlpha: 0.32,
  layerMult: 0.72,
  gradAlpha: 0.9,
  gridMult: 0.75,
  starAlphaMult: 0.7,
};

// Layered garden backdrop: gradient + nebula + parallax starfield + aurora + floor grid.
export class Background {
  constructor(scene, accent = PAL.accent, opts = {}) {
    this.scene = scene;
    this.accent = accent;
    this.preset = null;
    this.gameplay = opts.gameplay ?? false;
    this.layerMult = this.gameplay ? GAMEPLAY_DIM.layerMult : 1;
    this.t = 0;
    const W = GAME.WIDTH;
    const H = GAME.HEIGHT;

    this.grad = scene.add.image(W / 2, H / 2, 'bg-grad')
      .setDisplaySize(W * 1.1, H * 1.1).setDepth(-100);
    if (this.gameplay) this.grad.setAlpha(GAMEPLAY_DIM.gradAlpha);

    this.dimOverlay = null;
    if (this.gameplay) {
      this.dimOverlay = scene.add.rectangle(W / 2, H / 2, W, H, GAMEPLAY_DIM.overlay, GAMEPLAY_DIM.overlayAlpha)
        .setDepth(-81).setOrigin(0.5);
    }

    this.nebula = [];
    this.aurora = [];
    this.starsFar = null;
    this.starsNear = null;
    this.motes = null;
    this.grid = scene.add.graphics().setDepth(-92);
    this.frame = 0;

    this.applyVfxPreset(opts.preset ?? { bg: DEFAULT_BG, bgReduced: opts.reducedFx ?? false });
  }

  dimAlpha(base) {
    return base * this.layerMult;
  }

  applyVfxPreset(preset = {}) {
    this.preset = preset;
    const bg = { ...DEFAULT_BG, ...(preset.bg ?? {}) };
    const W = GAME.WIDTH;
    const H = GAME.HEIGHT;

    this.nebula.forEach((n) => n.img.destroy());
    this.nebula = [];
    const blobColors = [this.accent, 0xd45d8c, 0x684878, 0x3a5878];
    const nebulaN = bg.nebula ?? 3;
    for (let i = 0; i < nebulaN; i++) {
      const b = this.scene.add.image(rand(0, W), rand(0, H * 0.8), 'soft')
        .setDisplaySize(W * (0.75 + i * 0.08), W * (0.75 + i * 0.08))
        .setTint(blobColors[i % blobColors.length])
        .setAlpha(this.dimAlpha(bg.nebulaAlpha ?? 0.12))
        .setBlendMode('ADD')
        .setDepth(-95 - i * 0.01);
      this.nebula.push({ img: b, ox: b.x, oy: b.y, ph: rand(0, 6.28), sp: rand(0.1, 0.28) });
    }

    this.aurora.forEach((a) => a.destroy());
    this.aurora = [];
    if (bg.aurora) {
      const auroraBase = bg.auroraAlpha ?? 0.06;
      const auroraA = this.dimAlpha(this.gameplay ? auroraBase * 0.85 : auroraBase);
      for (let i = 0; i < 2; i++) {
        const band = this.scene.add.image(W * (0.3 + i * 0.4), H * 0.22, 'soft')
          .setDisplaySize(W * 1.4, H * 0.35)
          .setTint(i === 0 ? this.accent : 0x8866cc)
          .setAlpha(auroraA)
          .setBlendMode('ADD')
          .setDepth(-94);
        this.aurora.push(band);
      }
    }

    this.rebuildParticles(bg);
    this.grid.setAlpha(this.dimAlpha(bg.gridAlpha ?? 0.1) * (this.gameplay ? GAMEPLAY_DIM.gridMult : 1));
  }

  rebuildParticles(bg) {
    this.starsFar?.destroy();
    this.starsNear?.destroy();
    this.motes?.destroy();
    this.starsFar = null;
    this.starsNear = null;
    this.motes = null;

    const W = GAME.WIDTH;
    const H = GAME.HEIGHT;
    const starsOn = (bg.stars === true || bg.stars === 'reduced') && fxParticlesOn(this.scene);
    if (!starsOn) return;

    const farFreq = bg.starFarFreq || (bg.stars === 'reduced' ? 220 : 120);
    const nearFreq = bg.starNearFreq || (bg.stars === 'reduced' ? 480 : 260);

    const starMult = this.gameplay ? GAMEPLAY_DIM.starAlphaMult : 1;

    this.starsFar = this.scene.add.particles(0, 0, 'soft', {
      x: { min: 0, max: W },
      y: { min: -20, max: H },
      lifespan: 14000,
      speedY: { min: 8, max: 16 },
      scale: { min: 0.03, max: 0.09 },
      alpha: { min: 0.2 * starMult, max: 0.5 * starMult },
      frequency: farFreq,
      tint: 0xbfdfff,
      blendMode: 'ADD',
    }).setDepth(-90);

    this.starsNear = this.scene.add.particles(0, 0, 'soft', {
      x: { min: 0, max: W },
      y: { min: -20, max: H },
      lifespan: 9000,
      speedY: { min: 22, max: 40 },
      scale: { min: 0.07, max: 0.16 },
      alpha: { min: 0.3 * starMult, max: 0.7 * starMult },
      frequency: nearFreq,
      tint: this.accent,
      blendMode: 'ADD',
    }).setDepth(-88);

    if (bg.motes && bg.moteFreq > 0 && fxParticlesOn(this.scene)) {
      this.motes = this.scene.add.particles(0, 0, 'spark-shard', {
        x: { min: 0, max: W },
        y: { min: 0, max: H },
        lifespan: { min: 6000, max: 11000 },
        speedX: { min: -8, max: 8 },
        speedY: { min: -14, max: -4 },
        scale: { min: 0.03, max: 0.08 },
        alpha: { min: 0.08 * starMult, max: 0.22 * starMult },
        frequency: bg.moteFreq,
        tint: this.gameplay ? 0xbfdfff : this.accent,
        blendMode: 'ADD',
        rotate: { min: 0, max: 360 },
      }).setDepth(-89);
    }
  }

  relayout() {
    const W = GAME.WIDTH;
    const H = GAME.HEIGHT;
    this.grad.setPosition(W / 2, H / 2).setDisplaySize(W * 1.1, H * 1.1);
    this.dimOverlay?.setPosition(W / 2, H / 2).setSize(W, H);
    if (this.preset) this.applyVfxPreset(this.preset);
  }

  setAccent(color) {
    this.accent = color;
    this.starsNear?.setParticleTint(color);
    this.motes?.setParticleTint(color);
    if (this.nebula[0]) this.nebula[0].img.setTint(color);
  }

  /** @deprecated use applyVfxPreset */
  setFxLevel(reduced = false) {
    this.applyVfxPreset(VFX_PRESETS[reduced ? 'medium' : 'high']);
  }

  update(dtSec, isBoss = false) {
    this.t += dtSec;
    const bg = this.preset?.bg ?? DEFAULT_BG;

    this.nebula.forEach((n) => {
      n.img.x = n.ox + Math.sin(this.t * n.sp + n.ph) * 60;
      n.img.y = n.oy + Math.cos(this.t * n.sp * 0.8 + n.ph) * 40;
      const baseA = this.dimAlpha(bg.nebulaAlpha ?? 0.12);
      n.img.setAlpha(baseA + baseA * 0.35 * Math.sin(this.t * 0.5 + n.ph));
    });

    this.aurora.forEach((band, i) => {
      band.x = GAME.WIDTH * (0.3 + i * 0.4) + Math.sin(this.t * 0.15 + i) * 40;
      band.y = GAME.HEIGHT * 0.22 + Math.cos(this.t * 0.12 + i * 1.3) * 30;
      band.setAlpha(this.dimAlpha(0.05 + 0.04 * Math.sin(this.t * 0.4 + i * 2)));
      band.setRotation(Math.sin(this.t * 0.08 + i) * 0.08);
    });

    const shift = 0.5 + 0.5 * Math.sin(this.t / 18);
    if (this.gameplay) {
      this.grad.setTint(Phaser.Display.Color.GetColor(
        Math.round(22 + shift * 18),
        Math.round(48 + shift * 24),
        Math.round(68 + shift * 28),
      ));
    } else {
      this.grad.setTint(Phaser.Display.Color.GetColor(
        Math.round(40 + shift * 30),
        Math.round(90 + shift * 40),
        Math.round(120 + shift * 50),
      ));
    }

    if (isBoss && this.frame++ % 120 === 0 && this.starsNear) {
      this.starsNear.explode(3, Math.random() * GAME.WIDTH, 0);
    }

    const g = this.grid;
    const W = GAME.WIDTH;
    const H = GAME.HEIGHT;
    const gridA = this.dimAlpha(bg.gridAlpha ?? 0.1) * (this.gameplay ? GAMEPLAY_DIM.gridMult : 1);
    g.clear();
    g.lineStyle(1, this.accent, 0.85);
    g.setAlpha(gridA);
    const spacing = Math.max(60, H * 0.06);
    const scroll = (this.t * 26) % spacing;
    for (let y = H * 0.5 + scroll; y < H; y += spacing) g.lineBetween(0, y, W, y);
    for (let x = 0; x <= W; x += spacing) g.lineBetween(x, H * 0.5, x, H);

    if (bg.aurora && this.frame % 180 === 0 && this.motes) {
      this.motes.explode(1, rand(W * 0.2, W * 0.8), rand(H * 0.1, H * 0.4));
    }
  }

  destroy() {
    this.dimOverlay?.destroy();
    this.grad.destroy();
    this.nebula.forEach((n) => n.img.destroy());
    this.aurora.forEach((a) => a.destroy());
    this.starsFar?.destroy();
    this.starsNear?.destroy();
    this.motes?.destroy();
    this.grid.destroy();
  }
}
