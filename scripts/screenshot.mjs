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

const save = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` }).then(() => execSync(`cp ${OUT}/${name}.png ${LOCAL}/`));
const kick = (page) => page.evaluate(() => {
  const gs = window.__NEON.scene.getScene('Game');
  gs.maxEnemies = 5; gs.enemyTimer = 0;
  gs.balls.forEach((b) => { b.stuck = false; b.vy = -420; b.vx = 150; });
});

async function run(name, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2200);
  await save(page, `${name}-menu`);

  await page.mouse.click(Math.round(w / 2), Math.round(h * 0.55));
  await page.evaluate(() => { window.__NEON.scene.start('Game'); window.__NEON.scene.stop('Menu'); });
  await sleep(700);

  for (let lvl = 1; lvl <= 3; lvl++) {
    if (lvl > 1) await page.evaluate(() => window.__NEON.scene.getScene('Game').startNextLevel());
    await sleep(500);
    await kick(page);
    await sleep(1400);
    await save(page, `${name}-l${lvl}`);
  }
  await page.close();
  console.log(`shot ${name} ${w}x${h}`);
}

try {
  await run('desktop', 1440, 900);
  await run('mobile', 414, 896);
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
console.log('done');
