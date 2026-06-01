#!/usr/bin/env node
/** Copy keystore.properties.example → android/keystore.properties if missing. */
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = join(root, 'android');
const dest = join(androidDir, 'keystore.properties');
const src = join(root, 'native/android/keystore.properties.example');

if (!existsSync(androidDir)) {
  console.log('[copy-android-keystore] android/ not found — skip');
  process.exit(0);
}
if (existsSync(dest)) {
  console.log('[copy-android-keystore] android/keystore.properties already exists');
  process.exit(0);
}
if (!existsSync(src)) process.exit(0);

copyFileSync(src, dest);
console.log('[copy-android-keystore] created android/keystore.properties — edit paths/passwords');
