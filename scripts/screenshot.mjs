import { spawn, execSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const PORT = 4320;
const URL = `http://localhost:${PORT}/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = '/opt/cursor/artifacts/screenshots';
mkdirSync(OUT, { recursive: true });

function findChrome() {
  for (const p of ['/usr/bin/google-chrome-stable', '/usr/local/bin/google-chrome', '/usr/local/bin/chrome']) {
    try { execSync(`test -x ${p}`); return p; } catch {}
  }
  return 'google-chrome';
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: process.cwd(), stdio: 'ignore' });
await sleep(2500);

const browser = await puppeteer.launch({
  executablePath: findChrome(), headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 720, height: 1280, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);
  await page.screenshot({ path: `${OUT}/menu.png` });

  await page.mouse.click(360, 600);
  await page.evaluate(() => { window.__NEON.scene.start('Game'); window.__NEON.scene.stop('Menu'); });
  await sleep(900);
  // release ball, apply some visually rich powers
  await page.mouse.click(360, 800);
  await page.evaluate(() => {
    const gs = window.__NEON.scene.getScene('Game');
    ['Echo', 'Laser', 'BlackHole', 'Expand', 'Shield', 'Burst'].forEach((k) => gs.applyPower(k));
  });
  await sleep(700);
  await page.screenshot({ path: `${OUT}/gameplay.png` });
  console.log('Screenshots saved to', OUT);
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
