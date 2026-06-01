#!/usr/bin/env node
/**
 * Patch capacitor.config.json AdMob plugin IDs from VITE_ADMOB_* env vars.
 * Run before `cap sync` for production native builds.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = join(root, 'capacitor.config.json');

if (!existsSync(configPath)) {
  console.warn('[sync-capacitor-admob] capacitor.config.json not found');
  process.exit(0);
}

const androidAppId = process.env.VITE_ADMOB_APP_ID_ANDROID;
const iosAppId = process.env.VITE_ADMOB_APP_ID_IOS;
const testMode = (process.env.VITE_AD_TEST_MODE ?? 'true').toLowerCase() !== 'false';

if (!androidAppId && !iosAppId) {
  console.log('[sync-capacitor-admob] No VITE_ADMOB_APP_ID_* set — keeping capacitor.config.json defaults');
  process.exit(0);
}

const config = JSON.parse(readFileSync(configPath, 'utf8'));
config.plugins = config.plugins ?? {};
config.plugins.AdMob = config.plugins.AdMob ?? {};
if (androidAppId) {
  config.plugins.AdMob.appId = androidAppId;
  config.plugins.AdMob.androidAppId = androidAppId;
}
if (iosAppId) {
  config.plugins.AdMob.iosAppId = iosAppId;
}
config.plugins.AdMob.isTesting = testMode;

writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log('[sync-capacitor-admob] Updated AdMob plugin config (isTesting=%s)', testMode);
