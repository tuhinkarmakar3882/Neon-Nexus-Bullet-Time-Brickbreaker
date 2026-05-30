import { spawn, execSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const PORT = 4321;
const URL = `http://localhost:${PORT}/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function findChrome() {
  for (const p of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/local/bin/google-chrome',
  ]) {
    try { execSync(`test -x "${p}"`); return p; } catch {}
  }
  return 'google-chrome';
}
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: process.cwd(), stdio: 'ignore' });
await sleep(2500);
const browser = await puppeteer.launch({ executablePath: findChrome(), headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });

try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1800);

  const layout = await page.evaluate(() => {
    const c = document.querySelector('canvas'); const r = c.getBoundingClientRect();
    return { win: { w: innerWidth, h: innerHeight }, canvas: { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left) }, design: { w: window.__NEON.config.width, h: window.__NEON.config.height } };
  });
  console.log('LAYOUT', JSON.stringify(layout));

  await page.evaluate(() => { window.__NEON.scene.start('Game'); window.__NEON.scene.stop('Menu'); });
  await sleep(900);

  const structural = await page.evaluate(() => {
    const gs = window.__NEON.scene.getScene('Game');
    return { bricks: gs.bricks.length, balls: gs.balls.length, jardinains: gs.jardinains.length, paddleW: Math.round(gs.paddle.w), destructibles: gs.destructiblesLeft() };
  });
  console.log('STRUCTURE', JSON.stringify(structural));

  const report = await page.evaluate(() => {
    const gs = window.__NEON.scene.getScene('Game');
    const out = [];
    const snap = () => ({ pw: Math.round(gs.paddle.w), sticky: gs.paddle.sticky, magnet: gs.paddle.magnet, laser: gs.paddle.laser,
      balls: gs.balls.length, lives: gs.lives, through: gs.balls[0]?.through, bomb: gs.balls[0]?.bomb, mega: gs.balls[0]?.mega,
      sp: Math.round(gs.balls[0]?.speed || 0), shield: gs.powerSys.isActive('Shield'), active: gs.powerSys.keys() });
    ['Laser','Expand','Catch','Slow','Multi','Magnet','Shield','Through','Bomb','Mega','Life'].forEach((key) => {
      const b = snap(); gs.applyPower(key); const a = snap(); out.push({ key, b, a });
    });
    return out;
  });
  console.log('POWERS');
  for (const r of report) {
    const diff = Object.keys(r.a).filter((k) => JSON.stringify(r.a[k]) !== JSON.stringify(r.b[k]));
    console.log(`  ${r.key.padEnd(8)} -> ${diff.join(', ') || '(NOTHING!)'}`);
  }
  console.log('ERRORS', errors.length ? errors.join(' | ') : 'none');
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
