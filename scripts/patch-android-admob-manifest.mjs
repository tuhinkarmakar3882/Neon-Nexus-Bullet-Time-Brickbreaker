#!/usr/bin/env node
/** Inject AdMob APPLICATION_ID into android/app/src/main/AndroidManifest.xml */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFiles } from './load-env.mjs';

loadEnvFiles({ production: true });

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'android/app/src/main/AndroidManifest.xml');
const appId = process.env.VITE_ADMOB_APP_ID_ANDROID;

if (!existsSync(manifestPath)) {
  console.log('[patch-android-admob] android/ not found — run: pnpm run cap:add:android');
  process.exit(0);
}

if (!appId) {
  console.log('[patch-android-admob] VITE_ADMOB_APP_ID_ANDROID unset — skipping manifest patch');
  process.exit(0);
}

const metaBlock = `        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="${appId}"/>`;

let xml = readFileSync(manifestPath, 'utf8');
const existing = /<meta-data\s+[^>]*android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"[^/]*\/>/;

if (existing.test(xml)) {
  xml = xml.replace(existing, metaBlock.trim());
} else if (xml.includes('<application')) {
  xml = xml.replace(/<application([^>]*)>/, `<application$1>\n${metaBlock}`);
} else {
  console.warn('[patch-android-admob] Could not find <application> in manifest');
  process.exit(1);
}

writeFileSync(manifestPath, xml);
console.log('[patch-android-admob] APPLICATION_ID set in AndroidManifest.xml');
