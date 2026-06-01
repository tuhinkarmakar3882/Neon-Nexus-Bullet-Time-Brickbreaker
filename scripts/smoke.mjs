// Headless smoke test: menu clicks, settings, pause/resume, resume snapshot, mobile viewport.
import { spawn, execSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const PORT = 4319;
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
const errors = [];
const logs = [];
await sleep(2500);

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});

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

async function runFlow(page, label) {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => !!window.__NEON?.scene, { timeout: 20000 });
  await sleep(2000);

  const saveSchema = await page.evaluate(() => Number(localStorage.getItem('nn_save_schema') || 0));
  if (saveSchema < 2) errors.push(`${label}: save schema not migrated (got ${saveSchema})`);

  // Start game (bypass loadout picker in headless smoke)
  await page.evaluate(() => {
    const g = window.__NEON;
    if (!g?.scene) throw new Error('Phaser not ready');
    g.scene.start('Game', { newGame: true });
    g.scene.stop('Menu');
  });
  await sleep(800);
  let st = await waitFor(page, (s) => s.active.includes('Game'), 5000);
  if (!st.active.includes('Game')) errors.push(`${label}: Game did not start`);

  // Settings flow via scene API (click fallback)
  await page.evaluate(() => {
    window.__NEON.scene.stop('HUD');
    window.__NEON.scene.stop('Game');
    window.__NEON.scene.start('Menu');
  });
  await sleep(500);
  await clickAt(page, 0.5, 0.72);
  await sleep(400);
  await page.evaluate(() => {
    const g = window.__NEON;
    const menu = g.scene.getScene('Menu');
    if (menu) {
      menu.scene.launch('Settings', { from: 'Menu' });
      menu.scene.pause();
    }
  });
  await sleep(400);
  st = await waitFor(page, (s) => s.active.includes('Settings'), 3000);
  if (!st.active.includes('Settings')) errors.push(`${label}: Settings did not open`);
  await page.evaluate(() => {
    const s = window.__NEON.scene.getScene('Settings');
    s.settings.sound = !s.settings.sound;
    s.close();
  });
  await sleep(400);

  // Navigation.goBack — Settings from Menu (reset overlays first; clickAt may have opened Shop)
  await page.evaluate(() => {
    const g = window.__NEON;
    for (const k of ['Shop', 'Settings', 'Codex', 'Purchase', 'Pause']) {
      if (g.scene.isActive(k)) g.scene.stop(k);
    }
    if (g.scene.isPaused('Menu')) g.scene.resume('Menu');
    if (!g.scene.isActive('Menu')) g.scene.start('Menu');
    const menu = g.scene.getScene('Menu');
    menu.scene.launch('Settings', { from: 'Menu' });
    menu.scene.pause();
  });
  await sleep(300);
  await page.evaluate(() => {
    if (typeof window.__neonGoBack !== 'function') throw new Error('__neonGoBack missing');
    window.__neonGoBack();
  });
  await sleep(400);
  st = await waitFor(
    page,
    (s) => s.active.includes('Menu') && !s.active.includes('Settings') && !s.active.includes('Shop'),
    4000,
  );
  if (!st.active.includes('Menu') || st.active.includes('Settings')) {
    errors.push(`${label}: Navigation goBack from Settings failed — active=${st.active.join(',')}`);
  }

  // Shop + Purchase via Monetization (skipped when VITE_IAP_ENABLED=false)
  const iapEnabled = await page.evaluate(() => window.__NEON_FLAGS?.iapEnabled === true);
  await page.evaluate(() => {
    const g = window.__NEON;
    g.scene.getScene('Menu')?.scene.launch('Shop', { from: 'Menu' });
    g.scene.getScene('Menu')?.scene.pause();
  });
  await sleep(400);
  st = await waitFor(page, (s) => s.active.includes('Shop'), 3000);
  if (!st.active.includes('Shop')) errors.push(`${label}: Shop did not open`);

  if (iapEnabled) {
  const purchaseOk = await page.evaluate(async () => {
    const g = window.__NEON;
    const shop = g.scene.getScene('Shop');
    if (!shop) return { ok: false, err: 'no shop' };
    try {
      const p = shop.buyStoreProduct('coins_small');
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 150));
        if (g.scene.isActive('Purchase')) break;
      }
      if (!g.scene.isActive('Purchase')) return { ok: false, err: 'Purchase scene not open' };
      g.scene.getScene('Purchase').confirmPurchase();
      await p;
      await new Promise((r) => setTimeout(r, 200));
      return {
        ok: g.scene.isActive('Shop') && !g.scene.isPaused('Shop'),
        err: null,
      };
    } catch (e) {
      return { ok: false, err: String(e?.message ?? e) };
    }
  });
  if (!purchaseOk.ok) errors.push(`${label}: demo purchase flow failed — ${purchaseOk.err ?? 'unknown'}`);
  }

  await page.evaluate(() => {
    const g = window.__NEON;
    g.scene.stop('Shop');
    g.scene.stop('Purchase');
    if (g.scene.isPaused('Menu')) g.scene.resume('Menu');
  });
  await sleep(300);

  // Start game
  await clickAt(page, 0.5, 0.5);
  await sleep(800);
  await page.evaluate(() => { if (!window.__NEON.scene.isActive('Game')) { window.__NEON.scene.start('Game', { newGame: true }); window.__NEON.scene.stop('Menu'); } });
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
    const padW = (shrink) => {
      let w = gs.paddle.baseW * (gs.paddle.widthPenaltyMult ?? 1) * 1.35;
      if (shrink) w *= 0.65;
      return w;
    };
    const w = gs.paddle.w;
    if (Math.abs(w - padW(true)) > 3) throw new Error(`Expand+Reduce width wrong: w=${w} expected=${padW(true)}`);
    gs.powerSys.clear('Reduce');
    if (Math.abs(gs.paddle.w - padW(false)) > 3) {
      throw new Error(`Expand should remain after Reduce expires: w=${gs.paddle.w} expected=${padW(false)} keys=${gs.powerSys.keys().join(',')}`);
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
  page.on('console', (m) => {
    logs.push(`[${m.type()}] ${m.text()}`);
    if (m.type() === 'error') errors.push('console.error: ' + m.text());
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

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
