import Phaser from 'phaser';

// Reusable neon UI widgets shared across scenes.

export function neonButton(scene, x, y, label, onClick, opts = {}) {
  const w = opts.width ?? 320;
  const h = opts.height ?? 76;
  const color = opts.color ?? 0x00ffc3;
  const primary = opts.primary !== false;

  const container = scene.add.container(x, y);
  const bg = scene.add.graphics();

  const drawBg = (hover) => {
    bg.clear();
    if (primary) {
      bg.fillStyle(color, hover ? 1 : 0.9);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    } else {
      bg.fillStyle(0x000000, 0.35);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    }
    bg.lineStyle(3, color, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
  };
  drawBg(false);

  const text = scene.add.text(0, 0, label, {
    fontFamily: 'Orbitron, monospace',
    fontSize: opts.fontSize ?? '30px',
    fontStyle: 'bold',
    color: primary ? '#05060a' : '#' + color.toString(16).padStart(6, '0'),
  }).setOrigin(0.5);

  container.add([bg, text]);
  container.setSize(w, h);
  container.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);

  container.on('pointerover', () => {
    drawBg(true);
    scene.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 120 });
  });
  container.on('pointerout', () => {
    drawBg(false);
    scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120 });
  });
  container.on('pointerdown', () => {
    scene.tweens.add({ targets: container, scaleX: 0.96, scaleY: 0.96, duration: 80, yoyo: true });
  });
  container.on('pointerup', () => onClick && onClick());

  return container;
}

export function addCameraFx(scene, { bloom = 0.9, vignette = true } = {}) {
  const cam = scene.cameras.main;
  if (!cam.postFX) return;
  try {
    cam.postFX.addBloom(0xffffff, 1, 1, bloom, 1.1);
    if (vignette) cam.postFX.addVignette(0.5, 0.5, 0.85, 0.35);
  } catch {
    /* WebGL FX unavailable (Canvas fallback) — game still runs */
  }
}
