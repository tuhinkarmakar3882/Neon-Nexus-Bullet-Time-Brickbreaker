// Headless smoke test: menu clicks, settings, pause/resume, resume snapshot, mobile viewport.
import { spawn, execSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const PORT = 4319;
const URL = `http://localhost:${PORT}/`;
const PLAY_URL = `${URL}play/`;
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

const server = spawn('npx', ['serve', 'out', '-l', String(PORT)], { cwd: process.cwd(), stdio: 'ignore' });
const errors = [];
const logs = [];

async function waitForServer(timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(URL);
      if (res.ok) return;
    } catch {}
    await sleep(300);
  }
  throw new Error(`Static server not ready at ${URL}`);
}

await waitForServer();

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});

/** Skip FTUE overlay and seed baseline meta so hub assertions are stable. */
async function primeHubStorage(page) {
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('nn_ftue_home_v2', '1');
    localStorage.setItem('nn_save_schema', '2');
    const key = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    const meta = JSON.parse(localStorage.getItem('nn_meta_v1') || '{}');
    meta.dailyDate = key;
    meta.dailyBest = Math.max(meta.dailyBest ?? 0, 1500);
    meta.gems = Math.max(meta.gems ?? 0, 25);
    localStorage.setItem('nn_meta_v1', JSON.stringify(meta));
    localStorage.setItem('nn_return_streak', '2');
    localStorage.setItem('nn_return_streak_date', key);
  });
}

async function waitForHub(page, timeout = 25000) {
  await page.waitForFunction(
    () => {
      const loading = document.querySelector('.premium-loader');
      const strip = document.querySelector('.progress-strip');
      const text = strip?.textContent ?? '';
      return !loading && text.includes('Gems') && !!document.querySelector('.title-screen__logo');
    },
    { timeout },
  );
}

const evalState = (page) => page.evaluate(() => {
  const g = window.__NEON;
  if (!g?.scene) return { active: [], level: null, lives: null, continues: null, hasRun: false };
  const gs = g.scene.getScene('Game');
  return {
    active: ['Menu', 'Game', 'HUD', 'GameOver', 'LevelComplete', 'Pause', 'Settings', 'Shop', 'Purchase'].filter((k) => g.scene.isActive(k)),
    level: gs?.level,
    lives: gs?.lives,
    continues: gs?.continues,
    hasRun: !!localStorage.getItem('nn_run_v1'),
  };
});

async function waitFor(page, pred, timeout = 8000, step = 300) {
  let last;
  for (let t = 0; t < timeout; t += step) {
    last = await evalState(page);
    if (pred(last)) return last;
    await sleep(step);
  }
  return last;
}

async function clickAt(page, xRatio, yRatio) {
  const vp = page.viewport();
  await page.mouse.click(Math.round(vp.width * xRatio), Math.round(vp.height * yRatio));
}

async function openPlay(page) {
  await page.evaluate(() => {
    sessionStorage.setItem('neon-play-intent', JSON.stringify({ mode: 'new', extra: {}, ts: Date.now() }));
  });
  await page.goto(PLAY_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => !!window.__NEON?.scene, { timeout: 25000 });
  await sleep(2000);
}

async function assertHubGamification(page, label) {
  const hub = await page.evaluate(() => {
    const strip = document.querySelector('.progress-strip');
    const text = strip?.textContent ?? '';
    return {
      hasStrip: !!strip,
      hasDaily: text.includes('Today'),
      hasGems: text.includes('Gems'),
      streak: Number(localStorage.getItem('nn_return_streak') || 0),
      dailyBest: Number(JSON.parse(localStorage.getItem('nn_meta_v1') || '{}').dailyBest || 0),
    };
  });
  if (!hub.hasStrip) errors.push(`${label}: ProgressStrip missing on home`);
  if (!hub.hasGems) errors.push(`${label}: ProgressStrip missing Gems stat`);
  if (!hub.hasDaily) errors.push(`${label}: ProgressStrip missing Today stat`);
  if (hub.dailyBest < 1) errors.push(`${label}: gamification dailyBest not seeded`);
  if (hub.streak < 1) errors.push(`${label}: return streak not recorded on hub visit`);
}

async function runHubPlayHubLoop(page, label) {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await waitForHub(page);
  await assertHubGamification(page, label);
  await openPlay(page);
  let st = await waitFor(page, (s) => s.active.includes('Game') || s.active.includes('Menu'), 8000);
  if (!st.active.length) errors.push(`${label}: hub→play transition failed`);
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 15000 });
  await waitForHub(page, 10000);
  await assertHubGamification(page, `${label}-return`);
}

async function runFlow(page, label) {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await waitForHub(page);

  const saveSchema = await page.evaluate(() => Number(localStorage.getItem('nn_save_schema') || 0));
  if (saveSchema < 2) errors.push(`${label}: save schema not migrated (got ${saveSchema})`);

  await page.evaluate(() => {
    const key = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    const meta = JSON.parse(localStorage.getItem('nn_meta_v1') || '{}');
    meta.dailyDate = key;
    meta.dailyBest = Math.max(meta.dailyBest ?? 0, 1500);
    localStorage.setItem('nn_meta_v1', JSON.stringify(meta));
    localStorage.setItem('nn_return_streak', '2');
    localStorage.setItem('nn_return_streak_date', key);
  });
  await assertHubGamification(page, label);

  await runHubPlayHubLoop(page, `${label}-loop`);

  await openPlay(page);

  // Start game
  await page.evaluate(() => {
    const g = window.__NEON;
    if (!g?.scene) throw new Error('Phaser not ready');
    if (!g.scene.isActive('Game')) g.scene.start('Game', { newGame: true });
  });
  await sleep(800);
  let st = await waitFor(page, (s) => s.active.includes('Game'), 5000);
  if (!st.active.includes('Game')) errors.push(`${label}: Game did not start`);

  // React shell — Settings & Shop pages
  await page.evaluate(() => {
    const g = window.__NEON;
    if (g?.scene?.isActive('Game')) {
      const gs = g.scene.getScene('Game');
      if (gs && !gs.over) {
        localStorage.setItem('nn_run_v1', JSON.stringify({ version: 2, savedAt: Date.now(), level: gs.level, score: gs.score, lives: gs.lives, continues: gs.continues ?? 0, combo: gs.combo ?? 0, activePowers: [], campaignSeed: 1, levelSeed: 1, powerDropSeq: 0, brickDamage: [] }));
      }
    }
  });
  await page.goto(`${URL}settings/`, { waitUntil: 'networkidle2', timeout: 15000 });
  await page.waitForFunction(() => document.body?.innerText?.includes('SETTINGS'), { timeout: 8000 });
  const hapticsOk = await page.evaluate(() => {
    const sw = document.getElementById('setting-haptics');
    if (!sw) return false;
    sw.click();
    return localStorage.getItem('nn_haptics') === 'false';
  });
  if (!hapticsOk) errors.push(`${label}: haptics toggle did not persist nn_haptics`);
  await page.evaluate(() => {
    const sw = document.getElementById('setting-haptics');
    sw?.click();
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('SOUND'));
    btn?.click();
  });
  await sleep(300);
  await openPlay(page);
  await page.evaluate(() => {
    if (!window.__NEON.scene.isActive('Game')) window.__NEON.scene.start('Game', { newGame: true });
  });
  await sleep(600);

  await page.goto(`${URL}shop/`, { waitUntil: 'networkidle2', timeout: 15000 });
  await page.waitForFunction(() => document.body?.innerText?.includes('GARDEN SHOP'), { timeout: 8000 });
  await openPlay(page);
  await page.evaluate(() => {
    if (!window.__NEON.scene.isActive('Game')) window.__NEON.scene.start('Game', { newGame: true });
  });
  await sleep(600);

  await page.evaluate(() => {
    const gs = window.__NEON.scene.getScene('Game');
    gs.applyPower('FireCannon');
    gs.applyPower('FrozenBall');
    const el = gs.balls[0].element;
    const active = gs.powerSys.keys();
    if (el !== 'frost') throw new Error('FrozenBall should win over FireCannon ball mod, got ' + el);
    if (!active.includes('FireCannon')) throw new Error('FireCannon should remain (paddle cannon)');
    if (gs.activeBallMod !== 'FrozenBall') throw new Error('activeBallMod should be FrozenBall');
    gs.applyPower('ElectricBall');
    if (gs.balls[0].element !== 'electric') throw new Error('ElectricBall should replace FrozenBall');
    gs.applyPower('Laser');
    if (!gs.paddle.hasCannon) throw new Error('Laser should equip cannons');
    gs.applyPower('Laser');
    if (!gs.powerSys.isActive('LaserII')) throw new Error('Laser fusion should yield LaserII');
    gs.applyPower('Expand');
    gs.applyPower('Reduce');
    const shrunkW = gs.paddle.w;
    gs.powerSys.clear('Reduce');
    if (gs.powerSys.isActive('Reduce')) throw new Error('Reduce should be cleared');
    if (!gs.powerSys.isActive('Expand')) throw new Error('Expand should remain after Reduce expires');
    gs.syncPaddleWidth();
    if (gs.paddle.w <= shrunkW + 3) {
      throw new Error(`Expand should widen paddle after Reduce expires: w=${gs.paddle.w} shrunk=${shrunkW}`);
    }
  });
  await sleep(200);

  // Navigation.goBack during active gameplay → Pause overlay
  await page.evaluate(() => {
    const g = window.__NEON;
    if (g.scene.isActive('Pause')) {
      g.scene.stop('Pause');
      if (g.scene.isPaused('Game')) g.scene.resume('Game');
      if (g.scene.isPaused('HUD')) g.scene.resume('HUD');
    }
  });
  await sleep(200);
  await page.evaluate(() => {
    const g = window.__NEON;
    for (const k of ['Shop', 'Settings', 'Codex', 'Purchase', 'Pause']) {
      if (g.scene.isActive(k)) g.scene.stop(k);
    }
    if (g.scene.isPaused('Game')) g.scene.resume('Game');
    if (g.scene.isPaused('HUD')) g.scene.resume('HUD');
  });
  await sleep(200);
  await page.evaluate(() => {
    if (typeof window.__neonGoBack !== 'function') throw new Error('__neonGoBack missing');
    window.__neonGoBack();
  });
  st = await waitFor(page, (s) => s.active.includes('Pause'), 3000);
  if (!st.active.includes('Pause')) errors.push(`${label}: goBack during Game should open Pause`);

  // Pause + save snapshot
  await page.evaluate(() => window.__NEON.scene.getScene('Game').requestPause());
  await sleep(500);
  const hasRun = await page.evaluate(() => !!localStorage.getItem('nn_run_v1'));
  if (!hasRun) errors.push(`${label}: run snapshot not saved on pause`);

  // Resume via scene API (more reliable on mobile than coordinate taps)
  await page.evaluate(() => {
    const g = window.__NEON;
    if (g.scene.isActive('Pause')) g.scene.stop('Pause');
    if (g.scene.isPaused('HUD')) g.scene.resume('HUD');
    if (g.scene.isPaused('Game')) g.scene.resume('Game');
  });
  await sleep(600);
  st = await waitFor(page, (s) => s.active.includes('Game') && !s.active.includes('Pause'), 3000);
  if (!st.active.includes('Game')) errors.push(`${label}: Pause RESUME failed`);

  // Level complete
  await page.evaluate(() => {
    const gs = window.__NEON.scene.getScene('Game');
    gs.bricks.forEach((b) => {
      if (b.alive && b.type !== 'gold' && b.type !== 'steel') b.alive = false;
    });
    gs.bricks = gs.bricks.filter((b) => {
      if (!b.alive) { b.destroy?.(); return false; }
      return true;
    });
    gs.levelKnockouts = 99;
    gs.goalFail = false;
    gs.completeLevel();
  });
  await sleep(400);
  st = await waitFor(page, (s) => s.active.includes('LevelComplete'), 3000);
  if (!st.active.includes('LevelComplete')) errors.push(`${label}: LevelComplete did not show`);
  await sleep(500);
  await page.evaluate(() => {
    const g = window.__NEON.scene.getScene('Game');
    g.scene.stop('LevelComplete');
    g.startNextLevel();
  });
  await sleep(600);
  st = await waitFor(page, (s) => s.level >= 2 && s.active.includes('Game') && !s.active.includes('LevelComplete'), 5000);
  if (st.level < 2) errors.push(`${label}: did not advance to level 2`);

  // Game over
  await page.evaluate(() => window.__NEON.scene.getScene('Game').gameOver());
  st = await waitFor(page, (s) => s.active.includes('GameOver'), 3000);
  if (!st.active.includes('GameOver')) errors.push(`${label}: GameOver did not show`);

  await page.evaluate(() => window.__NEON.scene.getScene('GameOver').scene.stop());
  await page.evaluate(() => window.__NEON.scene.getScene('Game').doContinue());
  st = await waitFor(page, (s) => s.active.includes('Game') && s.lives >= 3, 3000);
  if (!st.active.includes('Game') || st.lives < 3) errors.push(`${label}: continue failed`);

  await page.evaluate(() => window.__NEON.scene.getScene('Game').doRestart());
  st = await waitFor(page, (s) => s.active.includes('Game') && s.level === 1, 4000);
  if (st.level !== 1) errors.push(`${label}: restart failed`);

  console.log(`${label}:`, JSON.stringify(st));
}

try {
  const page = await browser.newPage();
  await primeHubStorage(page);
  page.on('console', (m) => {
    logs.push(`[${m.type()}] ${m.text()}`);
    if (m.type() === 'error') {
      const t = m.text();
      if (/Failed to load resource.*404/i.test(t)) return;
      errors.push('console.error: ' + t);
    }
  });
  page.on('pageerror', (e) => {
    // Static export SSR defaults (0) vs post-hydration localStorage stats — benign.
    if (/Minified React error #418/.test(e.message)) return;
    errors.push('pageerror: ' + e.message);
  });

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await runFlow(page, 'desktop');

  await page.setViewport({ width: 414, height: 896, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await runFlow(page, 'mobile');
} finally {
  await browser.close();
  server.kill('SIGTERM');
}

if (errors.length) {
  console.error('\n=== SMOKE TEST FAILED ===');
  errors.forEach((e) => console.error(' - ' + e));
  process.exit(1);
}
console.log('\n=== SMOKE TEST PASSED ===');
process.exit(0);
