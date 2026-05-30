import { spawn, execSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const PORT = 4321;
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

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1800);

  const layout = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { win: { w: innerWidth, h: innerHeight }, canvas: { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top) },
      design: { w: window.__NEON.config.width, h: window.__NEON.config.height } };
  });
  console.log('LAYOUT', JSON.stringify(layout));

  await page.evaluate(() => { window.__NEON.scene.start('Game'); window.__NEON.scene.stop('Menu'); });
  await sleep(900);

  // Verify each power-up actually changes state.
  const report = await page.evaluate(async () => {
    const gs = window.__NEON.scene.getScene('Game');
    const out = [];
    const snap = () => ({
      pw: Math.round(gs.paddle.w), magnet: gs.paddle.magnet, sticky: gs.paddle.sticky, rev: gs.paddle.reversed,
      balls: gs.balls.length, lives: gs.lives, wrap: gs.wrap, freeze: gs.freeze, echo: gs.echo,
      charge: gs.chargeReady, bh: !!gs.blackHole, squeezed: gs.squeezed, rot: Math.round(gs.cameras.main.rotation * 100) / 100,
      sp: Math.round(gs.balls[0]?.speed || 0), miss: gs.balls[0]?.missile, grav: gs.balls[0]?.gravity, tele: gs.balls[0]?.teleport,
      bullets: gs.bullets.length, active: gs.powerSys.keys(),
    });
    const test = (key) => { const b = snap(); gs.applyPower(key); const a = snap(); out.push({ key, before: b, after: a }); };
    ['Expand','Reduce','Magnet','Glue','Laser','Shield','Flip','Velocity','Chill','Burst','Heart','Joker','Reverse','Wrap','Freeze','ChargeShot','BlackHole','Missile','Gravity','Echo','Teleport','Squeeze','Shuffle'].forEach(test);
    return out;
  });
  console.log('POWERS');
  for (const r of report) {
    const diff = Object.keys(r.after).filter((k) => JSON.stringify(r.after[k]) !== JSON.stringify(r.before[k]));
    console.log(`  ${r.key.padEnd(11)} changed: ${diff.join(', ') || '(NOTHING!)'}`);
  }
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
