// Procedurally generate all art at runtime so the game ships with zero binary
// art dependencies (keeps the repo light and the visuals crisp at any DPI).

export function generateTextures(scene) {
  makeSoftCircle(scene, 'soft', 64);
  makeSoftCircle(scene, 'spark', 16);
  makeRing(scene, 'ring', 128, 6);
  makePixel(scene, 'pixel');
  makeStar(scene, 'star', 24);
  makeBgGradient(scene, 'bg-grad', 16, 512);
}

function makeBgGradient(scene, key, w, h) {
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, w, h);
  const ctx = canvas.getContext();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0c1230');
  grad.addColorStop(0.5, '#070a18');
  grad.addColorStop(1, '#05060a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  canvas.refresh();
}

function makeSoftCircle(scene, key, size) {
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, size, size);
  const ctx = canvas.getContext();
  const r = size / 2;
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  canvas.refresh();
}

function makeRing(scene, key, size, lineWidth) {
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, size, size);
  const ctx = canvas.getContext();
  ctx.strokeStyle = 'rgba(255,255,255,1)';
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - lineWidth, 0, Math.PI * 2);
  ctx.stroke();
  canvas.refresh();
}

function makePixel(scene, key) {
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, 2, 2);
  const ctx = canvas.getContext();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 2, 2);
  canvas.refresh();
}

function makeStar(scene, key, size) {
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, size, size);
  const ctx = canvas.getContext();
  const cx = size / 2, cy = size / 2;
  const spikes = 4;
  const outer = size / 2;
  const inner = size / 5;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / spikes) * i - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  canvas.refresh();
}
