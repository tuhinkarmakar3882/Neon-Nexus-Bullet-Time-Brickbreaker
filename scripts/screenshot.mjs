import { spawn, execSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const PORT = 4320;
const URL = `http://localhost:${PORT}/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = '/opt/cursor/artifacts/screenshots';
const LOCAL = '/workspace/.smoke-shots';
mkdirSync(OUT, { recursive: true });
mkdirSync(LOCAL, { recursive: true });

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

async function shoot(name, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2200);
  await page.screenshot({ path: `${OUT}/${name}-menu.png` });
  execSync(`cp ${OUT}/${name}-menu.png ${LOCAL}/`);

  await page.mouse.click(Math.round(w / 2), Math.round(h * 0.55));
  await page.evaluate(() => { window.__NEON.scene.start('Game'); window.__NEON.scene.stop('Menu'); });
  await sleep(900);
  await page.mouse.click(Math.round(w / 2), Math.round(h * 0.7));
  await page.evaluate(() => {
    const gs = window.__NEON.scene.getScene('Game');
    ['Laser', 'Expand', 'Mega', 'Shield', 'Multi'].forEach((k) => gs.applyPower(k));
  });
  await sleep(900);
  await page.screenshot({ path: `${OUT}/${name}-game.png` });
  execSync(`cp ${OUT}/${name}-game.png ${LOCAL}/`);
  await page.close();
  console.log(`shot ${name} ${w}x${h}`);
}

try {
  await shoot('desktop', 1440, 900);
  await shoot('mobile', 414, 896);
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
console.log('done');
