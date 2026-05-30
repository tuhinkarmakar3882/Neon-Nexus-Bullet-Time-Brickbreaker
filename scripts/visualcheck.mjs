// Objective visual sanity using Phaser's renderer.snapshot (correct GL readback),
// then sampling pixels for content / color variety / brightness distribution.
import { spawn, execSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const PORT = 4322;
const URL = `http://localhost:${PORT}/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function findChrome() {
  for (const p of ['/usr/bin/google-chrome-stable', '/usr/local/bin/google-chrome', '/usr/local/bin/chrome']) {
    try { execSync(`test -x ${p}`); return p; } catch {}
  }
  return 'google-chrome';
}
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: process.cwd(), stdio: 'ignore' });
await sleep(2500);
const browser = await puppeteer.launch({ executablePath: findChrome(), headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });

const sampleFn = async () => {
  const dataUrl = await new Promise((res) => {
    window.__NEON.renderer.snapshot((img) => res(img.src));
  });
  const img = new Image();
  await new Promise((r) => { img.onload = r; img.src = dataUrl; });
  const cw = 240, ch = 240;
  const tmp = document.createElement('canvas'); tmp.width = cw; tmp.height = ch;
  const ctx = tmp.getContext('2d');
  ctx.drawImage(img, 0, 0, cw, ch);
  const data = ctx.getImageData(0, 0, cw, ch).data;
  let sum = 0, black = 0, blown = 0, n = 0, topSum = 0, topN = 0, botSum = 0, botN = 0;
  const hueSet = new Set();
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const i = (y * cw + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    sum += lum; n++;
    if (lum < 12) black++; if (lum > 240) blown++;
    if (y < ch * 0.4) { topSum += lum; topN++; } else if (y > ch * 0.82) { botSum += lum; botN++; }
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx - mn > 28 && mx > 45) {
      let h = 0;
      if (mx === r) h = ((g - b) / (mx - mn)) % 6; else if (mx === g) h = (b - r) / (mx - mn) + 2; else h = (r - g) / (mx - mn) + 4;
      hueSet.add(Math.floor((((h * 60) + 360) % 360) / 30));
    }
  }
  return { mean: sum / n, black: black / n, blown: blown / n, hues: hueSet.size, topLum: topSum / topN, botLum: botSum / botN };
};

function report(label, s) {
  console.log(`\n[${label}] mean=${s.mean.toFixed(1)} black=${(s.black * 100).toFixed(1)}% blown=${(s.blown * 100).toFixed(1)}% hues=${s.hues}/12 top=${s.topLum.toFixed(1)} bottom=${s.botLum.toFixed(1)}`);
  const issues = [];
  if (s.black > 0.9) issues.push('almost entirely black');
  if (s.mean < 7) issues.push('too dark');
  if (s.blown > 0.45) issues.push('blown out');
  if (s.hues < 3) issues.push('low color variety');
  console.log('  verdict:', issues.length ? 'ISSUES: ' + issues.join('; ') : 'OK');
  return issues;
}

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);
  const issues = [];
  issues.push(...report('MENU', await page.evaluate(sampleFn)));

  await page.mouse.click(640, 440);
  await page.evaluate(() => { window.__NEON.scene.start('Game'); window.__NEON.scene.stop('Menu'); });
  await sleep(800);
  await page.evaluate(() => { const gs = window.__NEON.scene.getScene('Game'); ['Laser', 'Mega', 'Shield'].forEach((k) => gs.applyPower(k)); });
  await sleep(700);
  issues.push(...report('GAME', await page.evaluate(sampleFn)));

  console.log('\n===', issues.length ? 'VISUAL ISSUES FOUND' : 'VISUAL SANITY OK', '===');
  process.exitCode = issues.length ? 1 : 0;
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
