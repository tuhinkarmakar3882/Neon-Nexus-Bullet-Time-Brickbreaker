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

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: process.cwd(), stdio: 'ignore' });
const errors = [];
const logs = [];
await sleep(2500);

const browser = await puppeteer.launch({ executablePath: findChrome(), headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });

const evalState = (page) => page.evaluate(() => {
  const g = window.__NEON; const gs = g.scene.getScene('Game');
  return { active: ['Menu', 'Game', 'HUD', 'GameOver', 'LevelComplete', 'Pause'].filter((k) => g.scene.isActive(k)),
    score: gs?.score, level: gs?.level, lives: gs?.lives, balls: gs?.balls?.length, bricks: gs?.bricks?.length,
    enemies: gs?.enemies?.length, gems: gs?.gems?.length, theme: gs?.theme?.name, continues: gs?.continues };
});
async function waitFor(page, pred, timeout = 8000, step = 300) {
  let last; for (let t = 0; t < timeout; t += step) { last = await evalState(page); if (pred(last)) return last; await sleep(step); } return last;
}

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  page.on('console', (m) => { logs.push(`[${m.type()}] ${m.text()}`); if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => { if (!r.url().includes('fonts.g')) errors.push('requestfailed: ' + r.url()); });

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1500);
  if (!(await page.evaluate(() => window.__NEON?.scene?.isActive('Menu')))) errors.push('Menu did not boot');

  await page.mouse.click(700, 500);
  await page.evaluate(() => { window.__NEON.scene.start('Game'); window.__NEON.scene.stop('Menu'); });
  await sleep(1000);

  for (let i = 0; i < 40; i++) { await page.mouse.move(500 + (i % 30) * 14, 760); if (i === 3) await page.mouse.click(700, 600); await sleep(40); }
  console.log('PHASE play:', JSON.stringify(await evalState(page)));

  await page.evaluate(() => {
    const gs = window.__NEON.scene.getScene('Game');
    ['Laser','Expand','Catch','Slow','Multi','Magnet','Shield','Through','Bomb','Mega','Life'].forEach((k) => gs.applyPower(k));
  });
  await sleep(700);
  console.log('PHASE powers:', JSON.stringify(await evalState(page)));

  // Enemies + gems
  await page.evaluate(() => {
    const gs = window.__NEON.scene.getScene('Game');
    gs.maxEnemies = 8; gs.enemyTimer = 0;
    gs.balls.forEach((b) => { b.stuck = false; if (Math.abs(b.vy) < 60) b.vy = -420; });
  });
  await sleep(2800);
  console.log('PHASE enemies:', JSON.stringify(await evalState(page)));

  // Level complete via tap-advance
  await page.evaluate(() => { const gs = window.__NEON.scene.getScene('Game'); gs.bricks.forEach((b) => (b.alive = false)); });
  const lc = await waitFor(page, (s) => s.active.includes('LevelComplete'), 4000);
  if (!lc.active.includes('LevelComplete')) errors.push('LevelComplete did not show');
  await sleep(400); await page.mouse.click(700, 500);
  const lvl = await waitFor(page, (s) => s.level >= 2 && s.active.includes('Game') && !s.active.includes('LevelComplete'), 6000);
  console.log('PHASE levelup:', JSON.stringify(lvl));
  if (lvl.level < 2) errors.push('did not advance to level 2');

  await page.evaluate(() => { const gs = window.__NEON.scene.getScene('Game'); gs.lives = 1; gs.balls.forEach((b) => { b.stuck = false; b.y = 99999; b.vy = 1; }); });
  const go = await waitFor(page, (s) => s.active.includes('GameOver'), 4000);
  console.log('PHASE gameover:', JSON.stringify(go));
  if (!go.active.includes('GameOver')) errors.push('GameOver did not show');

  await page.evaluate(() => window.__NEON.scene.getScene('GameOver').scene.stop());
  await page.evaluate(() => window.__NEON.scene.getScene('Game').doContinue());
  const cont = await waitFor(page, (s) => s.active.includes('Game') && s.lives >= 3, 3000);
  console.log('PHASE continue:', JSON.stringify(cont));
  if (!cont.active.includes('Game') || cont.lives < 3) errors.push('continue failed');

  await page.evaluate(() => window.__NEON.scene.getScene('Game').requestPause());
  const pz = await waitFor(page, (s) => s.active.includes('Pause'), 2000);
  if (!pz.active.includes('Pause')) errors.push('Pause did not show');
  await page.evaluate(() => window.__NEON.scene.getScene('Pause').resume());
  await sleep(300);

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
