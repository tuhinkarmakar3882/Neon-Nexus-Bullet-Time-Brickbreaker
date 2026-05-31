import Phaser from 'phaser';
import { GAME } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { audio } from '../systems/AudioManager.js';

// Robust button with padded hit areas, tap validation, ripples, and depth 1000+.
export function makeButton(scene, x, y, label, onClick, opts = {}) {
  const w = opts.width ?? 320;
  let h = opts.height ?? 76;
  h = Math.max(h, 48);
  const color = opts.color ?? PAL.accent;
  const primary = opts.primary !== false;
  const hitPad = opts.hitPad ?? 14;
  const depth = opts.depth ?? 1000;
  const disabled = opts.disabled ?? false;

  const container = scene.add.container(x, y).setDepth(depth);
  const bg = scene.add.graphics();
  let pressed = false;

  const drawBg = (hover = false) => {
    bg.clear();
    if (primary) {
      bg.fillStyle(color, hover ? 1 : 0.9);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    } else {
      bg.fillStyle(0x000000, 0.35);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    }
    bg.lineStyle(3, color, disabled ? 0.4 : 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
  };
  drawBg(false);

  const text = scene.add.text(0, 0, label, {
    fontFamily: 'Orbitron, monospace',
    fontSize: opts.fontSize ?? '30px',
    fontStyle: 'bold',
    color: primary ? PAL.textDark : cssHex(color),
  }).setOrigin(0.5);
  if (disabled) text.setAlpha(0.4);

  container.add([bg, text]);

  if (!disabled) {
    const hitW = w + hitPad * 2;
    const hitH = h + hitPad * 2;
    // Container input uses top-left origin; graphics are center-origin. A centered Zone
    // matches the visible button and fixes corner-only touch targets on mobile.
    const zone = scene.add.zone(0, 0, hitW, hitH).setOrigin(0.5, 0.5);
    container.add(zone);
    zone.setInteractive({ useHandCursor: true });

    const ripple = (lx, ly) => {
      if (!scene.textures.exists('soft')) return;
      const ring = scene.add.image(lx, ly, 'soft').setDepth(depth + 1)
        .setTint(color).setBlendMode('ADD').setAlpha(0.6).setScale(0.05);
      container.add(ring);
      scene.tweens.add({
        targets: ring, scale: 0.5, alpha: 0, duration: 300,
        onComplete: () => ring.destroy(),
      });
    };

    zone.on('pointerover', () => {
      drawBg(true);
      scene.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 120 });
    });
    zone.on('pointerout', () => {
      pressed = false;
      drawBg(false);
      scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120 });
    });
    zone.on('pointerdown', (_ptr, lx, ly) => {
      pressed = true;
      ripple(lx, ly);
      scene.tweens.add({ targets: container, scaleX: 0.96, scaleY: 0.96, duration: 80 });
      audio.init();
      audio.blip(720);
    });
    zone.on('pointerup', () => {
      if (pressed) onClick?.();
      pressed = false;
      scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 });
    });
    zone.on('pointerupoutside', () => { pressed = false; });
  }

  container.setAlpha(disabled ? 0.4 : 1);
  container.setFocused = (focused) => {
    drawBg(focused);
    bg.lineStyle(focused ? 4 : 3, focused ? 0xffffff : color, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
  };
  return container;
}

export function makeVolumeSlider(scene, x, y, label, value, onChange, opts = {}) {
  const depth = opts.depth ?? 1001;
  const c = scene.add.container(x, y).setDepth(depth);
  scene.add.text(-260, 0, label, {
    fontFamily: 'Orbitron, monospace', fontSize: '22px', color: '#cfe9ff',
  }).setOrigin(0, 0.5).setDepth(depth);

  let vol = Math.max(0, Math.min(100, value ?? 100));
  const valText = scene.add.text(120, 0, `${vol}%`, {
    fontFamily: 'Orbitron, monospace', fontSize: '22px', color: cssHex(PAL.accent),
  }).setOrigin(0.5).setDepth(depth);

  const update = (v) => {
    vol = Math.max(0, Math.min(100, v));
    valText.setText(`${vol}%`);
    onChange?.(vol);
  };

  makeButton(scene, x + 210, y, '−', () => update(vol - 10), { width: 52, height: 44, fontSize: '22px', primary: false, depth });
  makeButton(scene, x + 280, y, '+', () => update(vol + 10), { width: 52, height: 44, fontSize: '22px', primary: false, depth });

  return { getValue: () => vol, setValue: update };
}

export function neonButton(scene, x, y, label, onClick, opts = {}) {
  return makeButton(scene, x, y, label, onClick, opts);
}

// Frosted-glass overlay card with animated border pulse and nebula blobs.
export function makeOverlayPanel(scene, opts = {}) {
  const W = opts.gameW ?? GAME.WIDTH;
  const H = opts.gameH ?? GAME.HEIGHT;
  const cx = opts.x ?? W / 2;
  const cy = opts.y ?? H / 2;
  const cardW = opts.cardW ?? Math.min(W * 0.82, 680);
  const cardH = opts.cardH ?? Math.min(H * 0.78, H - 48);
  const depth = opts.depth ?? 900;

  const root = scene.add.container(0, 0).setDepth(depth);
  const dim = scene.add.rectangle(cx, cy, W, H, 0x05060a, opts.dimAlpha ?? 0.78);
  root.add(dim);

  for (let i = 0; i < 3; i++) {
    const blob = scene.add.image(
      cx + (i - 1) * 120,
      cy + (i - 1) * 40,
      'soft',
    ).setDisplaySize(W * 0.5, W * 0.5)
      .setTint([PAL.accent, PAL.accent2, PAL.info][i])
      .setAlpha(0.08).setBlendMode('ADD');
    root.add(blob);
    scene.tweens.add({
      targets: blob, alpha: 0.14, yoyo: true, repeat: -1,
      duration: 2000 + i * 400, ease: 'Sine.easeInOut',
    });
  }

  const card = scene.add.graphics();
  const drawCard = (borderAlpha = 0.55) => {
    card.clear();
    card.fillStyle(0x080b16, 0.82);
    card.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 20);
    card.lineStyle(2, PAL.accent, borderAlpha);
    card.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 20);
  };
  drawCard();
  root.add(card);
  scene.tweens.add({
    targets: { a: 0.35 },
    a: 0.75,
    duration: 2000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
    onUpdate: (tw) => drawCard(tw.getValue()),
  });

  return { root, cx, cy, cardW, cardH, dim };
}

/** Stack overlay buttons inside a panel card — avoids %Y drift on tall canvases. */
export function layoutButtonStack(scene, panel, items, opts = {}) {
  const { cx, cy } = panel;
  let gap = opts.gap ?? 14;
  const width = opts.width ?? Math.min(panel.cardW * 0.88, 420);
  let heights = items.map((it) => it.height ?? opts.btnH ?? 72);
  const maxBottom = opts.maxBottom;
  if (maxBottom != null && opts.startY != null) {
    let totalH = heights.reduce((a, h) => a + h, 0) + gap * Math.max(0, items.length - 1);
    while (opts.startY + totalH > maxBottom && gap > 6) {
      gap -= 2;
      totalH = heights.reduce((a, h) => a + h, 0) + gap * Math.max(0, items.length - 1);
    }
    while (opts.startY + totalH > maxBottom && heights.some((h) => h > 40)) {
      heights = heights.map((h) => Math.max(40, h - 3));
      totalH = heights.reduce((a, h) => a + h, 0) + gap * Math.max(0, items.length - 1);
    }
  }
  const totalH = heights.reduce((a, h) => a + h, 0) + gap * Math.max(0, items.length - 1);
  let y = opts.startY != null
    ? opts.startY + heights[0] / 2
    : cy - totalH / 2 + (opts.offsetY ?? 24);

  return items.map((item, i) => {
    const h = heights[i];
    const { label, onClick, height, ...rest } = item;
    const btn = makeButton(scene, cx, y, label, onClick, { width, height: h, ...rest });
    y += h + gap;
    return btn;
  });
}

// Animated pill toggle — updates graphics in place (no removeAll).
export function makeToggle(scene, x, y, value, onChange, opts = {}) {
  const c = scene.add.container(x, y).setDepth(opts.depth ?? 1100);
  const g = scene.add.graphics();
  const knob = scene.add.circle(0, 0, 20, 0xffffff);
  c.add([g, knob]);

  let on = !!value;
  const draw = (animate = false) => {
    g.clear();
    g.fillStyle(on ? PAL.accent : 0x333a44, 1);
    g.fillRoundedRect(-56, -26, 112, 52, 26);
    if (on) {
      g.lineStyle(2, PAL.accent, 0.6);
      g.strokeRoundedRect(-56, -26, 112, 52, 26);
    }
    const targetX = on ? 30 : -30;
    if (animate) {
      scene.tweens.add({ targets: knob, x: targetX, duration: 200, ease: 'Cubic.easeOut' });
    } else {
      knob.x = targetX;
    }
  };
  draw(false);

  const zone = scene.add.zone(0, 0, 112, 52).setOrigin(0.5, 0.5);
  c.add(zone);
  zone.setInteractive({ useHandCursor: true });

  let pressed = false;
  zone.on('pointerdown', () => { pressed = true; });
  zone.on('pointerup', () => {
    if (!pressed) return;
    pressed = false;
    on = !on;
    draw(true);
    onChange?.(on);
    audio.init();
    audio.blip(720);
  });
  zone.on('pointerupoutside', () => { pressed = false; });

  return {
    container: c,
    setValue(v) { on = !!v; draw(false); },
    getValue: () => on,
  };
}

export function staggerButtons(scene, buttons, delayMs = 80) {
  buttons.forEach((btn, i) => {
    const y0 = btn.y;
    btn.setAlpha(0).setY(y0 + 24);
    scene.tweens.add({
      targets: btn,
      alpha: 1,
      y: y0,
      delay: i * delayMs,
      duration: 350,
      ease: 'Back.easeOut',
    });
  });
}

export function addCameraFx(scene, { bloom = 0.72, vignette = true, scanlines = false } = {}) {
  const cam = scene.cameras.main;
  if (!cam.postFX) return;
  try {
    cam.postFX.addBloom(0xffffff, 1, 1, bloom, 1.1);
    if (vignette) cam.postFX.addVignette(0.5, 0.5, 0.85, 0.35);
  } catch {
    /* WebGL FX unavailable */
  }
  if (scanlines && !scene._scanlineGfx) {
    const W = scene.scale.width;
    const H = scene.scale.height;
    const g = scene.add.graphics().setDepth(999).setScrollFactor(0);
    g.fillStyle(0x000000, 0.04);
    for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
    scene._scanlineGfx = g;
  }
}

export function spawnConfetti(scene, x, y, count = 64) {
  if (!scene.textures.exists('soft')) return;
  const tex = scene.textures.exists('spark-shard') ? ['soft', 'spark-shard', 'ember'] : ['soft'];
  scene.add.particles(x, y, tex, {
    speed: { min: 180, max: 520 },
    scale: { start: 0.7, end: 0 },
    lifespan: 900,
    blendMode: 'ADD',
    quantity: count,
    emitting: false,
    angle: { min: 200, max: 340 },
    rotate: { min: -360, max: 360 },
    tint: [PAL.accent, PAL.accent2, PAL.accent3, PAL.info],
  }).explode(count);
}
