#!/usr/bin/env node
/**
 * Validate .env.production before shipping.
 * Usage: node scripts/validate-ship-env.mjs [--web] [--android] [--all]
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFiles } from './load-env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const mode = args.includes('--all')
  ? 'all'
  : args.includes('--web')
    ? 'web'
    : args.includes('--android')
      ? 'android'
      : 'all';

loadEnvFiles({ production: true });

const errors = [];
const warnings = [];

function need(key, label = key) {
  const v = process.env[key];
  if (!v || !String(v).trim()) errors.push(`Missing ${label} (${key})`);
}

function warnIfMissing(key, msg) {
  if (!process.env[key]?.trim()) warnings.push(msg);
}

if (!existsSync(join(root, '.env.production'))) {
  errors.push('Create .env.production from .env.production.example');
}

need('VITE_GAME_URL');

const iapOn = (process.env.VITE_IAP_ENABLED ?? 'false').toLowerCase() === 'true';

const url = process.env.VITE_GAME_URL || '';
if (url.endsWith('/')) errors.push('VITE_GAME_URL must not have a trailing slash');
if (url && !/^https:\/\//.test(url)) warnings.push('VITE_GAME_URL should use https:// for production');

if (mode === 'web' || mode === 'all') {
  if (process.env.VITE_AD_PROVIDER !== 'google') {
    warnings.push('VITE_AD_PROVIDER should be "google" for production web');
  }
  if (process.env.VITE_AD_TEST_MODE !== 'false') {
    warnings.push('Set VITE_AD_TEST_MODE=false for production web');
  }
  need('VITE_ADSENSE_CLIENT');
  need('VITE_ADSENSE_BANNER_SLOT');
  if (iapOn) {
    need('VITE_STRIPE_CHECKOUT_URL');
    warnIfMissing('STRIPE_SECRET_KEY', 'STRIPE_SECRET_KEY unset — set in Vercel/Netlify for webhooks');
    warnIfMissing('STRIPE_WEBHOOK_SECRET', 'STRIPE_WEBHOOK_SECRET unset — set in Vercel/Netlify for webhooks');
  }
}

if (mode === 'android' || mode === 'all') {
  if (process.env.VITE_AD_PROVIDER !== 'google') {
    warnings.push('VITE_AD_PROVIDER should be "google" for production Android');
  }
  need('VITE_ADMOB_APP_ID_ANDROID');
  need('VITE_ADMOB_BANNER_ANDROID');
  need('VITE_ADMOB_INTERSTITIAL_ANDROID');
  need('VITE_ADMOB_REWARDED_ANDROID');
  need('VITE_ADMOB_PUBLISHER_ID', 'VITE_ADMOB_PUBLISHER_ID (for app-ads.txt)');
  if (iapOn) need('VITE_REVENUECAT_ANDROID_KEY');
}

for (const w of warnings) console.warn('[ship:check] warn:', w);
for (const e of errors) console.error('[ship:check] error:', e);

if (errors.length) {
  console.error('\n[ship:check] Fix .env.production then re-run.');
  process.exit(1);
}

console.log('[ship:check] OK (%s)', mode);
