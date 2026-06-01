import Phaser from 'phaser';
import { GAME } from '../config/Constants.js';
import { PAL, cssHex } from '../config/Palette.js';
import { audio } from '../systems/AudioManager.js';
import { clamp } from './Helpers.js';
import { fitButtonLabel, parseDesignPx, uiFont, uiPx, overlayType, FONTS } from './Typography.js';

// Robust button with padded hit areas, tap validation, ripples, and depth 1000+.
export function makeButton(scene, x, y, label, onClick, opts = {}) {
  const w = opts.width ?? 320;
  let h = opts.height ?? 76;
  if (!opts.compact) h = Math.max(h, 48);
  const color = opts.color ?? PAL.accent;
  const hitPad = opts.hitPad ?? 14;
  const depth = opts.depth ?? 1000;
  const disabled = opts.disabled ?? false;

  const container = scene.add.container(x, y).setDepth(depth);
  const bg = scene.add.graphics();
  let pressed = false;
  let selected = opts.primary !== false;
  let btnColor = color;

  const designFs = parseDesignPx(opts.fontSize, Math.round(h * 0.38));
  const text = scene.add.text(0, 0, label, {
    fontFamily: FONTS.display,
    fontSize: opts.rawFont ? `${designFs}px` : uiFont(designFs, { min: 9, max: designFs }),
    fontStyle: 'bold',
    color: selected ? PAL.textDark : cssHex(btnColor),
  }).setOrigin(0.5);
  if (disabled) text.setAlpha(0.4);
  if (label && opts.fitLabel !== false) fitButtonLabel(text, w, 9);

  const redraw = (hover = false) => {
    bg.clear();
    if (selected) {
      bg.fillStyle(btnColor, hover ? 1 : 0.92);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    } else {
      bg.fillStyle(0x0c1018, hover ? 0.95 : 0.82);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    }
    bg.lineStyle(selected ? 3 : 2, selected ? btnColor : 0x556677, selected ? 1 : 0.75);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    text.setColor(selected ? PAL.textDark : cssHex(btnColor));
  };
  redraw(false);

  container.add([bg, text]);

  if (!disabled) {
    const hitW = w + hitPad * 2;
    const hitH = h + hitPad * 2;
    const zone = scene.add.zone(0, 0, hitW, hitH).setOrigin(0.5, 0.5);
    container.add(zone);
    zone.setInteractive({ useHandCursor: true });

    const ripple = (lx, ly) => {
      if (!scene.textures.exists('soft')) return;
      const ring = scene.add.image(lx, ly, 'soft').setDepth(depth + 1)
        .setTint(btnColor).setBlendMode('ADD').setAlpha(0.6).setScale(0.05);
      container.add(ring);
      scene.tweens.add({
        targets: ring, scale: 0.5, alpha: 0, duration: 300,
        onComplete: () => ring.destroy(),
      });
    };

    zone.on('pointerover', () => {
      redraw(true);
      scene.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 120 });
    });
    zone.on('pointerout', () => {
      redraw(false);
      scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120 });
    });
    const activate = () => {
      if (!pressed) return;
      pressed = false;
      onClick?.();
      scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 });
    };
    zone.on('pointerdown', (_ptr, lx, ly) => {
      pressed = true;
      ripple(lx, ly);
      scene.tweens.add({ targets: container, scaleX: 0.96, scaleY: 0.96, duration: 80 });
      audio.init();
      audio.blip(720);
      if (opts.activateOnDown) activate();
    });
    zone.on('pointerup', activate);
    zone.on('pointerupoutside', activate);
  }

  container.setAlpha(disabled ? 0.4 : 1);
  container.setSelected = (on, col) => {
    if (col !== undefined) btnColor = col;
    selected = !!on;
    redraw(false);
  };
  container.setFocused = (focused) => redraw(focused);
  return container;
}

export function makeVolumeSlider(scene, x, y, label, value, onChange, opts = {}) {
  const depth = opts.depth ?? 1001;
  const c = scene.add.container(x, y).setDepth(depth);
  scene.add.text(-260, 0, label, {
    fontFamily: FONTS.display, fontSize: uiFont(22), color: '#cfe9ff',
  }).setOrigin(0, 0.5).setDepth(depth);

  let vol = Math.max(0, Math.min(100, value ?? 100));
  const valText = scene.add.text(120, 0, `${vol}%`, {
    fontFamily: FONTS.display, fontSize: uiFont(22), color: cssHex(PAL.accent),
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

/** Overlay panel sized to safe viewport — works on portrait phones and desktop. */
export function makeResponsiveOverlayPanel(scene, opts = {}) {
  const W = GAME.WIDTH;
  const H = GAME.HEIGHT;
  const topPad = GAME.SAFE_TOP + uiPx(6, { min: 4, max: 10 });
  const bottomPad = GAME.SAFE_BOTTOM + uiPx(8, { min: 6, max: 12 });
  const sidePad = Math.max(GAME.SAFE_LEFT, GAME.SAFE_RIGHT, uiPx(4, { min: 2, max: 8 }));
  const usableH = H - topPad - bottomPad;
  const usableW = W - sidePad * 2;
  const cardW = opts.cardW ?? Math.min(usableW * 0.96, opts.maxCardW ?? 720);
  const heightRatio = opts.heightRatio ?? (GAME.IS_PORTRAIT ? 0.94 : 0.9);
  const cardH = opts.cardH ?? Math.min(usableH * heightRatio, usableH);
  const cy = opts.y ?? (topPad + usableH / 2);
  return makeOverlayPanel(scene, {
    gameW: W,
    gameH: H,
    x: W / 2,
    y: cy,
    cardW,
    cardH,
    dimAlpha: opts.dimAlpha,
    depth: opts.depth,
  });
}

/** Content bounds inside an overlay card (header / scroll / footer regions). */
export function overlayFrame(panel, opts = {}) {
  const cardTop = panel.cy - panel.cardH / 2;
  const cardBot = panel.cy + panel.cardH / 2;
  const pad = uiPx(16, { min: 12, max: 20 });
  const footerReserve = opts.footerReserve ?? uiPx(68, { min: 56, max: 72 });
  const headerReserve = opts.headerReserve ?? uiPx(72, { min: 56, max: 80 });
  const t = overlayType(panel);
  const btnH = uiPx(opts.btnH ?? 48, { min: 42, max: 52 });
  const btnGap = uiPx(opts.btnGap ?? 10, { min: 8, max: 12 });
  const contentTop = cardTop + headerReserve;
  const contentBottom = cardBot - footerReserve;
  return {
    cx: panel.cx,
    cardTop,
    cardBot,
    pad,
    wrap: t.wrap,
    t,
    btnW: Math.min(panel.cardW * 0.88, t.btnW),
    btnH,
    btnGap,
    contentTop,
    contentBottom,
    contentH: Math.max(48, contentBottom - contentTop),
    titleY: cardTop + uiPx(32, { min: 24, max: 40 }),
    footerY: cardBot - footerReserve / 2,
  };
}

/** Bottom-anchored button column — shrinks height/gap on short screens. */
export function anchorButtonStack(scene, panel, items, opts = {}) {
  const frame = overlayFrame(panel, { footerReserve: 0, ...opts });
  let btnH = opts.btnHeight ?? frame.btnH;
  let gap = opts.gap ?? frame.btnGap;
  const btnW = opts.width ?? frame.btnW;
  const n = items.length;
  const footerPad = uiPx(14, { min: 10, max: 16 });
  const minTop = opts.minTop ?? frame.titleY + uiPx(72, { min: 56, max: 72 });
  const maxStackH = Math.max(btnH, frame.cardBot - footerPad - minTop);

  let stackH = n * btnH + Math.max(0, n - 1) * gap;
  while (stackH > maxStackH && btnH > 38) {
    btnH -= 2;
    stackH = n * btnH + Math.max(0, n - 1) * gap;
  }
  while (stackH > maxStackH && gap > 6) {
    gap -= 2;
    stackH = n * btnH + Math.max(0, n - 1) * gap;
  }

  let y = frame.cardBot - footerPad - stackH + btnH / 2;
  const buttons = [];
  items.forEach((item) => {
    const { label, onClick, height, ...rest } = item;
    const h = height ?? btnH;
    buttons.push(makeButton(scene, frame.cx, y, label, onClick, { width: btnW, height: h, ...rest }));
    y += h + gap;
  });
  return { buttons, stackTop: y - btnH / 2 - (n > 0 ? 0 : 0), btnH, frame };
}

/** Clamp scroll offset for overlay lists. */
export function clampOverlayScroll(scrollY, maxScroll) {
  return clamp(scrollY, 0, Math.max(0, maxScroll));
}

/**
 * Touch/wheel scroll for overlay lists — scene-level tracking so rows/buttons
 * underneath remain tappable when the gesture is a tap (not a drag).
 *
 * Touch and wheel share one axis: increasing scroll reveals content further down.
 */
export function attachOverlayScroll(scene, opts = {}) {
  const {
    left, top, width, height,
    getScroll = () => 0,
    setScroll = () => {},
    getMaxScroll = () => 0,
    dragThreshold = 8,
    wheelFactor = 0.35,
  } = opts;

  const resolve = (v) => (typeof v === 'function' ? v() : v);

  let tracking = false;
  let gestureDragged = false;
  let startY = 0;
  let scrollStart = 0;

  const bounds = () => ({
    left: resolve(left),
    top: resolve(top),
    width: resolve(width),
    height: resolve(height),
  });

  const inBounds = (x, y) => {
    const b = bounds();
    return x >= b.left && x <= b.left + b.width && y >= b.top && y <= b.top + b.height;
  };

  const applyScroll = (next) => {
    setScroll(clampOverlayScroll(next, getMaxScroll()));
  };

  const onDown = (pointer) => {
    if (!inBounds(pointer.x, pointer.y)) return;
    if (getMaxScroll() <= 0) return;
    // Always track drags in the scroll pane — row taps must check isDragGesture() on release.
    tracking = true;
    gestureDragged = false;
    startY = pointer.y;
    scrollStart = getScroll();
  };

  const onMove = (pointer) => {
    if (!tracking || !pointer.isDown) return;
    if (getMaxScroll() <= 0) return;
    const dy = pointer.y - startY;
    if (!gestureDragged && Math.abs(dy) < dragThreshold) return;
    gestureDragged = true;
    // Content tracks the finger; swipe up reveals items below (same axis as wheel).
    applyScroll(scrollStart - dy);
  };

  const onUp = () => {
    tracking = false;
  };

  const onWheel = (pointer, _gos, _dx, dy) => {
    if (getMaxScroll() <= 0) return;
    const px = pointer?.x ?? scene.input.activePointer.x;
    const py = pointer?.y ?? scene.input.activePointer.y;
    if (!inBounds(px, py)) return;
    applyScroll(getScroll() + dy * wheelFactor);
  };

  scene.input.on('pointerdown', onDown);
  scene.input.on('pointermove', onMove);
  scene.input.on('pointerup', onUp);
  scene.input.on('pointerupoutside', onUp);
  scene.input.on('pointercancel', onUp);
  scene.input.on('wheel', onWheel);

  return {
    isDragGesture: () => gestureDragged,
    resetGesture: () => { gestureDragged = false; },
    destroy() {
      scene.input.off('pointerdown', onDown);
      scene.input.off('pointermove', onMove);
      scene.input.off('pointerup', onUp);
      scene.input.off('pointerupoutside', onUp);
      scene.input.off('pointercancel', onUp);
      scene.input.off('wheel', onWheel);
    },
  };
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
  const trackW = opts.width ?? uiPx(72, { min: 48, max: 88 });
  const trackH = opts.height ?? uiPx(36, { min: 28, max: 40 });
  const radius = Math.round(trackH / 2);
  const knobR = Math.max(6, Math.round(trackH * 0.36));
  const pad = Math.max(2, Math.round(trackH * 0.08));
  const travel = Math.max(4, trackW / 2 - knobR - pad);

  const c = scene.add.container(x, y).setDepth(opts.depth ?? 1100);
  const g = scene.add.graphics();
  const knob = scene.add.circle(0, 0, knobR, 0xffffff);
  c.add([g, knob]);

  let on = !!value;
  const draw = (animate = false) => {
    g.clear();
    g.fillStyle(on ? PAL.accent : 0x333a44, 1);
    g.fillRoundedRect(-trackW / 2, -trackH / 2, trackW, trackH, radius);
    if (on) {
      g.lineStyle(Math.max(1, Math.round(trackH * 0.05)), PAL.accent, 0.6);
      g.strokeRoundedRect(-trackW / 2, -trackH / 2, trackW, trackH, radius);
    }
    const targetX = on ? travel : -travel;
    if (animate) {
      scene.tweens.add({ targets: knob, x: targetX, duration: 200, ease: 'Cubic.easeOut' });
    } else {
      knob.x = targetX;
    }
  };
  draw(false);

  const zone = scene.add.zone(0, 0, trackW, trackH).setOrigin(0.5, 0.5);
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
    trackW,
    trackH,
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

import { applySceneVfx, updateSceneVfx } from './SceneVfx.js';
import { fxConfettiCount } from './FxBudget.js';

/** Apply camera bloom/vignette/overlays from full settings or legacy opts. */
export function addCameraFx(scene, settingsOrOpts = {}) {
  const settings = settingsOrOpts.vfxQuality != null
    ? settingsOrOpts
    : {
      bloom: settingsOrOpts.bloom ?? 0.72,
      vignette: settingsOrOpts.vignette ?? 0,
      scanlines: settingsOrOpts.scanlines ?? false,
      scanlineAlpha: settingsOrOpts.scanlineAlpha ?? 0.03,
      grain: settingsOrOpts.grain ?? 0,
      chroma: settingsOrOpts.chroma ?? false,
    };
  applySceneVfx(scene, settings);
}

/** Live VFX quality change while a scene is running. */
export function updateCameraFx(scene, patch = {}) {
  updateSceneVfx(scene, patch);
}

export function spawnConfetti(scene, x, y, count = 64) {
  const n = fxConfettiCount(scene, count);
  if (n <= 0 || !scene.textures.exists('soft')) return;
  const tex = scene.textures.exists('spark-shard') ? ['soft', 'spark-shard', 'ember'] : ['soft'];
  const sizeMult = scene?.settings?.particleSizeMult ?? 0.82;
  scene.add.particles(x, y, tex, {
    speed: { min: 180, max: 520 },
    scale: { start: 0.52 * sizeMult, end: 0 },
    lifespan: 900,
    blendMode: 'ADD',
    quantity: n,
    emitting: false,
    angle: { min: 200, max: 340 },
    rotate: { min: -360, max: 360 },
    tint: [PAL.accent, PAL.accent2, PAL.accent3, PAL.info],
  }).explode(n);
}
