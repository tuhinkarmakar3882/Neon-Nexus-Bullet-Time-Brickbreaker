// Headless smoke test: serves dist/, loads the game in real Chrome (WebGL),
// drives the full scene flow, and fails on any console/page error.
import { spawn, execSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const PORT = 4319;
const URL = `http://localhost:${PORT}/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findChrome() {
  for (const p of ['/usr/bin/google-chrome-stable', '/usr/local/bin/google-chrome', '/usr/local/bin/chrome']) {
    try { execSync(`test -x ${p}`); return p; } catch {}
  }
  return 'google-chrome';
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: process.cwd(), stdio: 'ignore',
});

const errors = [];
const logs = [];
await sleep(2500);

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl',
    '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});

const evalState = (page) => page.evaluate(() => {
  const g = window.__NEON;
  const gs = g.scene.getScene('Game');
  return {
    active: ['Menu', 'Game', 'HUD', 'GameOver', 'LevelComplete', 'Pause'].filter((k) => g.scene.isActive(k)),
    score: gs?.score, level: gs?.level, lives: gs?.lives,
    balls: gs?.balls?.length, bricks: gs?.bricks?.length, continues: gs?.continues,
  };
});

// Poll until predicate passes or timeout. Returns last state.
async function waitFor(page, predicate, timeoutMs = 8000, step = 300) {
  let last;
  for (let t = 0; t < timeoutMs; t += step) {
    last = await evalState(page);
    if (predicate(last)) return last;
    await sleep(step);
  }
  return last;
}

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 480, height: 800, deviceScaleFactor: 1 });
  page.on('console', (m) => { logs.push(`[${m.type()}] ${m.text()}`); if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => { if (!r.url().includes('fonts.g')) errors.push('requestfailed: ' + r.url()); });

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1500);
  if (!(await page.evaluate(() => window.__NEON?.scene?.isActive('Menu')))) errors.push('Menu did not boot');

  // Start (and stop Menu like the real PLAY flow does)
  await page.mouse.click(240, 400);
  await page.evaluate(() => { window.__NEON.scene.start('Game'); window.__NEON.scene.stop('Menu'); });
  await sleep(1000);

  for (let i = 0; i < 40; i++) { await page.mouse.move(120 + (i % 30) * 8, 700); if (i === 3) await page.mouse.click(240, 600); await sleep(40); }
  console.log('PHASE play:', JSON.stringify(await evalState(page)));

  // Every power-up apply path
  await page.evaluate(() => {
    const gs = window.__NEON.scene.getScene('Game');
    ['Expand','Reduce','Magnet','Glue','Laser','Shield','Flip','Velocity','Chill','Burst','Heart','Joker','Reverse','Wrap','Freeze','ChargeShot','BlackHole','Missile','Gravity','Echo','Teleport','Squeeze','Shuffle'].forEach((k) => gs.applyPower(k));
  });
  await sleep(800);
  console.log('PHASE powers:', JSON.stringify(await evalState(page)));

  // Level complete -> tap to advance (deterministic, also exercises pointer path)
  await page.evaluate(() => { const gs = window.__NEON.scene.getScene('Game'); gs.bricks.forEach((b) => (b.alive = false)); });
  const lc = await waitFor(page, (s) => s.active.includes('LevelComplete'), 4000);
  if (!lc.active.includes('LevelComplete')) errors.push('LevelComplete did not show');
  await sleep(400);
  await page.mouse.click(240, 500); // tap to continue
  const lvl = await waitFor(page, (s) => s.level >= 2 && s.active.includes('Game') && !s.active.includes('LevelComplete'), 6000);
  console.log('PHASE levelup:', JSON.stringify(lvl));
  if (lvl.level < 2) errors.push('did not advance to level 2');
  if (!lvl.active.includes('Game')) errors.push('Game not resumed after level up');

  // Game over
  await page.evaluate(() => {
    const gs = window.__NEON.scene.getScene('Game');
    gs.lives = 1;
    gs.balls.forEach((b) => { b.stuck = false; b.y = 99999; b.vy = 1; });
  });
  const go = await waitFor(page, (s) => s.active.includes('GameOver'), 4000);
  console.log('PHASE gameover:', JSON.stringify(go));
  if (!go.active.includes('GameOver')) errors.push('GameOver did not show');

  // Continue
  await page.evaluate(() => window.__NEON.scene.getScene('GameOver').scene.stop());
  await page.evaluate(() => window.__NEON.scene.getScene('Game').doContinue());
  const cont = await waitFor(page, (s) => s.active.includes('Game') && s.lives >= 3, 3000);
  console.log('PHASE continue:', JSON.stringify(cont));
  if (!cont.active.includes('Game') || cont.lives < 3) errors.push('continue failed');

  // Pause / resume
  await page.evaluate(() => window.__NEON.scene.getScene('Game').requestPause());
  const pz = await waitFor(page, (s) => s.active.includes('Pause'), 2000);
  if (!pz.active.includes('Pause')) errors.push('Pause did not show');
  await page.evaluate(() => window.__NEON.scene.getScene('Pause').resume());
  await sleep(300);

  // Restart
  await page.evaluate(() => window.__NEON.scene.getScene('Game').doRestart());
  const re = await waitFor(page, (s) => s.active.includes('Game') && s.level === 1 && s.bricks > 0, 4000);
  console.log('PHASE restart:', JSON.stringify(re));
  if (!re.active.includes('Game') || re.level !== 1) errors.push('restart failed');
} finally {
  await browser.close();
  server.kill('SIGTERM');
}

if (errors.length) {
  console.error('\n=== SMOKE TEST FAILED ===');
  errors.slice(0, 40).forEach((e) => console.error(' - ' + e));
  console.error('\n--- recent logs ---\n' + logs.slice(-30).join('\n'));
  process.exit(1);
} else {
  console.log('\n=== SMOKE TEST PASSED (no console/page errors, full flow exercised) ===');
  process.exit(0);
}
