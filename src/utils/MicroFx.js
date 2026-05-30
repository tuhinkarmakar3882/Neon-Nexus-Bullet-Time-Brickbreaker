/** Lightweight micro-animation helpers — keep motion snappy (<400ms). */

import { fxCount, fxParticlesOn } from './FxBudget.js';

export function popScale(scene, target, opts = {}) {
  if (!target?.active) return;
  const { peak = 1.1, dur = 110, from = 0.88 } = opts;
  scene.tweens.killTweensOf(target);
  target.setScale(from);
  scene.tweens.add({
    targets: target,
    scaleX: peak,
    scaleY: peak,
    duration: dur,
    yoyo: true,
    ease: 'Back.easeOut',
  });
}

export function squashStretch(scene, target, opts = {}) {
  if (!target?.active) return;
  const { sx = 1.14, sy = 0.82, dur = 90 } = opts;
  scene.tweens.killTweensOf(target);
  scene.tweens.add({
    targets: target,
    scaleX: sx,
    scaleY: sy,
    duration: dur,
    yoyo: true,
    ease: 'Quad.easeOut',
  });
}

export function wobble(scene, target, opts = {}) {
  if (!target?.active) return;
  const { angle = 9, dur = 280, repeat = 1 } = opts;
  scene.tweens.add({
    targets: target,
    angle: { from: -angle, to: angle },
    duration: dur,
    yoyo: true,
    repeat,
    ease: 'Sine.easeInOut',
    onComplete: () => { if (target.active) target.angle = 0; },
  });
}

export function floatUpFade(scene, target, opts = {}) {
  if (!target?.active) return;
  const { dy = -48, dur = 680, delay = 0 } = opts;
  scene.tweens.add({
    targets: target,
    y: target.y + dy,
    alpha: 0,
    delay,
    duration: dur,
    ease: 'Cubic.easeOut',
    onComplete: () => target.destroy?.(),
  });
}

export function pulseAlpha(scene, target, opts = {}) {
  if (!target?.active) return;
  const { min = 0.55, max = 1, dur = 900 } = opts;
  scene.tweens.add({
    targets: target,
    alpha: { from: min, to: max },
    duration: dur,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

export function rippleRing(scene, x, y, opts = {}) {
  const { tint = 0xffffff, scale = 2.8, dur = 480, depth = 32 } = opts;
  const ring = scene.add.image(x, y, 'ring').setDepth(depth).setTint(tint)
    .setBlendMode('ADD').setScale(0.08).setAlpha(0.85);
  const ring2 = scene.add.image(x, y, 'ring').setDepth(depth - 1).setTint(0xffffff)
    .setBlendMode('ADD').setScale(0.05).setAlpha(0.35);
  scene.tweens.add({
    targets: ring,
    scaleX: scale,
    scaleY: scale,
    alpha: 0,
    duration: dur,
    ease: 'Cubic.easeOut',
    onComplete: () => ring.destroy(),
  });
  scene.tweens.add({
    targets: ring2,
    scaleX: scale * 0.65,
    scaleY: scale * 0.65,
    alpha: 0,
    duration: dur * 0.85,
    ease: 'Cubic.easeOut',
    onComplete: () => ring2.destroy(),
  });
}

/** Staggered entrance for brick panels / containers */
export function staggerDropIn(scene, items, opts = {}) {
  const { delay = 28, drop = 36, dur = 340 } = opts;
  items.forEach((item, i) => {
    if (!item?.panel && !item?.c && !item?.active) return;
    const targets = item.panel ? [item.panel] : item.c ? [item.c] : [item];
    const baseY = targets[0].y;
    targets.forEach((t) => {
      t.setAlpha(0);
      t.y = baseY - drop;
    });
    scene.tweens.add({
      targets,
      y: baseY,
      alpha: 1,
      delay: i * delay,
      duration: dur,
      ease: 'Back.easeOut',
    });
  });
}

export function shardBurst(scene, x, y, color, count = 6) {
  if (!fxParticlesOn(scene)) return;
  const n = fxCount(scene, count);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 22 + Math.random() * 38;
    const tex = Math.random() > 0.45 ? 'spark-shard' : 'spark';
    const s = scene.add.image(x, y, tex).setDepth(33).setTint(color)
      .setDisplaySize(5 + Math.random() * 7, 5 + Math.random() * 7)
      .setAlpha(0.92).setRotation(Math.random() * Math.PI);
    scene.tweens.add({
      targets: s,
      x: x + Math.cos(a) * dist,
      y: y + Math.sin(a) * dist + 12,
      alpha: 0,
      angle: s.angle + randSpin(),
      scale: 0,
      duration: 300 + Math.random() * 200,
      ease: 'Cubic.easeOut',
      onComplete: () => s.destroy(),
    });
  }
}

function randSpin() {
  return (Math.random() - 0.5) * 2.4;
}

/** Ceramic tile chips + dust for brick destruction. */
export function tileChipBurst(scene, x, y, color, count = 5) {
  if (!fxParticlesOn(scene)) return;
  const n = fxCount(scene, count);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
    const dist = 14 + Math.random() * 28;
    const chip = scene.add.image(x, y, 'tile-chip').setDepth(32).setTint(color)
      .setDisplaySize(8 + Math.random() * 6, 6 + Math.random() * 4)
      .setAlpha(0.95).setRotation(Math.random() * Math.PI);
    scene.tweens.add({
      targets: chip,
      x: x + Math.cos(a) * dist,
      y: y + Math.sin(a) * dist + 18,
      alpha: 0,
      angle: chip.angle + randSpin(),
      scaleX: 0.2,
      scaleY: 0.2,
      duration: 340 + Math.random() * 180,
      ease: 'Quad.easeIn',
      onComplete: () => chip.destroy(),
    });
  }
}

export function dustPuff(scene, x, y, tint = 0xffffff, count = 4) {
  if (!fxParticlesOn(scene)) return;
  const n = fxCount(scene, count);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = 8 + Math.random() * 16;
    const p = scene.add.image(x, y, 'soft').setDepth(31).setTint(tint)
      .setDisplaySize(10 + Math.random() * 14, 10 + Math.random() * 14)
      .setAlpha(0.22).setBlendMode('ADD');
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(a) * d,
      y: y + Math.sin(a) * d - 10,
      alpha: 0,
      scale: 1.4,
      duration: 420 + Math.random() * 160,
      ease: 'Cubic.easeOut',
      onComplete: () => p.destroy(),
    });
  }
}

/** Combined brick-break presentation. */
export function brickBreakFx(scene, x, y, color, opts = {}) {
  const { reduced = false, particles = true } = opts;
  rippleRing(scene, x, y, { tint: color, scale: 2.35, dur: 360 });
  if (!particles) return;
  tileChipBurst(scene, x, y, color, reduced ? 3 : 6);
  dustPuff(scene, x, y, color, reduced ? 2 : 4);
  shardBurst(scene, x, y, color, reduced ? 3 : 6);
}

export function microShake(scene, intensity = 0.004, dur = 80) {
  scene.cameras.main.shake(dur, intensity);
}

/** Combo / milestone callout with punchy scale-in */
export function surgeText(scene, x, y, msg, color, size = 36) {
  const t = scene.add.text(x, y, msg, {
    fontFamily: 'Orbitron, monospace', fontSize: size + 'px', fontStyle: '900', color,
  }).setOrigin(0.5).setDepth(42).setScale(0.3).setAlpha(0);
  t.setShadow(0, 0, color, 16, true, true);
  scene.tweens.add({ targets: t, scale: 1.15, alpha: 1, duration: 140, ease: 'Back.easeOut' });
  scene.tweens.add({
    targets: t, scale: 1, y: y - 72, alpha: 0, duration: 680, delay: 160, ease: 'Cubic.easeOut',
    onComplete: () => t.destroy(),
  });
}

export function tickBump(scene, target) {
  if (!target?.active) return;
  scene.tweens.add({
    targets: target,
    scaleX: 1.12,
    scaleY: 1.12,
    duration: 80,
    yoyo: true,
    ease: 'Quad.easeOut',
  });
}

/** Tiny sparks on wall / paddle / brick glances */
export function hitSpark(scene, x, y, opts = {}) {
  if (!fxParticlesOn(scene)) return;
  const { tint = 0xffffff, count = 4, depth = 31, spread = 22, angle = null } = opts;
  const n = fxCount(scene, count);
  for (let i = 0; i < n; i++) {
    const a = angle != null
      ? angle + (Math.random() - 0.5) * 1.2
      : Math.random() * Math.PI * 2;
    const d = 8 + Math.random() * spread;
    const tex = Math.random() > 0.35 ? 'spark-streak' : 'spark';
    const s = scene.add.image(x, y, tex).setDepth(depth).setTint(tint)
      .setDisplaySize(tex === 'spark-streak' ? 10 : 5, tex === 'spark-streak' ? 4 : 5)
      .setAlpha(0.88).setRotation(a);
    scene.tweens.add({
      targets: s,
      x: x + Math.cos(a) * d,
      y: y + Math.sin(a) * d,
      alpha: 0,
      scale: 0,
      duration: 130 + Math.random() * 110,
      ease: 'Quad.easeOut',
      onComplete: () => s.destroy(),
    });
  }
}

/** Brick panel nudge on ball impact (surviving hit) */
export function brickNudge(scene, panel, nx = 0, ny = -1) {
  if (!panel?.active) return;
  scene.tweens.killTweensOf(panel);
  const ox = panel.x;
  const oy = panel.y;
  scene.tweens.add({
    targets: panel,
    x: ox + nx * 3,
    y: oy + ny * 3,
    scaleX: 1.08,
    scaleY: 0.94,
    duration: 55,
    yoyo: true,
    ease: 'Quad.easeOut',
    onComplete: () => { if (panel.active) { panel.x = ox; panel.y = oy; } },
  });
}

/** Power pickup burst — positive or cursed */
export function powerAcquireBurst(scene, x, y, opts = {}) {
  const { tint = 0xffffff, neg = false, big = false } = opts;
  if (neg) {
    rippleRing(scene, x, y, { tint: 0xff4466, scale: 2.8, dur: 420, depth: 35 });
    hitSpark(scene, x, y, { tint: 0xff6b7a, count: 10, spread: 28, depth: 36 });
  } else {
    rippleRing(scene, x, y, { tint, scale: big ? 3.4 : 2.6, dur: 400, depth: 35 });
    hitSpark(scene, x, y, { tint, count: big ? 12 : 7, spread: big ? 30 : 22, depth: 36 });
    if (big) shardBurst(scene, x, y, tint, 10);
  }
}

/** Ball launch puff */
export function launchBurst(scene, x, y, tint = 0xffffff) {
  rippleRing(scene, x, y, { tint, scale: 2.2, dur: 320, depth: 24 });
  hitSpark(scene, x, y, { tint, count: 6, spread: 28 });
  dustPuff(scene, x, y, tint, 3);
}

/** Gnome / entity pop-in */
export function risePop(scene, target, opts = {}) {
  if (!target?.active) return;
  const { peak = 1.22, dur = 200 } = opts;
  scene.tweens.add({
    targets: target,
    scaleX: { from: 0.15, to: peak },
    scaleY: { from: 0.15, to: peak },
    alpha: { from: 0.4, to: 1 },
    duration: dur,
    ease: 'Back.easeOut',
    onComplete: () => {
      if (!target.active) return;
      scene.tweens.add({
        targets: target, scaleX: 1, scaleY: 1, duration: 90, ease: 'Quad.easeOut',
      });
    },
  });
}

/** Continuous idle bob for pickups / HUD chips */
export function idleBob(scene, target, opts = {}) {
  if (!target?.active) return;
  const { dy = 4, dur = 900 } = opts;
  const baseY = target.y;
  scene.tweens.add({
    targets: target,
    y: baseY - dy,
    duration: dur,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

/** Spin-in for collectibles */
export function spinIn(scene, target, opts = {}) {
  if (!target?.active) return;
  const { dur = 280 } = opts;
  target.setScale(0.2).setAlpha(0);
  scene.tweens.add({
    targets: target,
    scaleX: 1,
    scaleY: 1,
    alpha: 1,
    angle: 360,
    duration: dur,
    ease: 'Back.easeOut',
    onComplete: () => { if (target.active) target.angle = 0; },
  });
}

/** Difficulty tier flash on level start */
export function tierPulse(scene, x, y, rating, color) {
  const stars = '▮'.repeat(Math.min(rating, 10));
  const t = scene.add.text(x, y, stars, {
    fontFamily: 'Orbitron, monospace', fontSize: '22px', fontStyle: '900', color,
    letterSpacing: 4,
  }).setOrigin(0.5).setDepth(41).setAlpha(0).setScale(0.6);
  scene.tweens.add({ targets: t, alpha: 0.9, scale: 1, duration: 220, ease: 'Back.easeOut' });
  scene.tweens.add({
    targets: t, alpha: 0, y: y - 36, duration: 520, delay: 680, ease: 'Cubic.easeOut',
    onComplete: () => t.destroy(),
  });
}

/** Enemy spawn drop */
export function dropIn(scene, target, opts = {}) {
  if (!target?.active) return;
  const { fromY = target.y - 48, dur = 320 } = opts;
  const ty = target.y;
  target.y = fromY;
  target.setAlpha(0);
  scene.tweens.add({
    targets: target,
    y: ty,
    alpha: 1,
    duration: dur,
    ease: 'Bounce.easeOut',
  });
}
