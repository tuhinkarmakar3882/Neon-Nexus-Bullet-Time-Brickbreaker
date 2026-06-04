import Phaser from 'phaser';

/** Soft bloom drawn as ellipses — avoids square canvas-texture quads on sprites. */
export function makeGlowLayer(scene, depth = 10, blend = Phaser.BlendModes.ADD) {
  return scene.add.graphics().setDepth(depth).setBlendMode(blend);
}

export function drawSoftGlow(g, cx, cy, rx, ry, color, alpha) {
  if (!g?.active || alpha <= 0.002) {
    g?.clear?.();
    return;
  }
  g.clear();
  const layers = 5;
  for (let i = layers; i >= 1; i--) {
    const t = i / layers;
    g.fillStyle(color, alpha * (1 - t * 0.82) * 0.24);
    g.fillEllipse(cx, cy, rx * t, ry * t);
  }
}

export function drawSoftShadow(g, cx, cy, rx, ry, alpha = 0.32) {
  if (!g?.active || alpha <= 0.002) {
    g?.clear?.();
    return;
  }
  g.clear();
  g.fillStyle(0x08050c, alpha);
  g.fillEllipse(cx, cy, rx, ry);
}
