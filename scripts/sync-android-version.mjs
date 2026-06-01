#!/usr/bin/env node
/** Sync versionName/versionCode in android/app/build.gradle from package.json. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gradlePath = join(root, 'android/app/build.gradle');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const versionName = pkg.version;

function versionCode(ver) {
  const [a = 0, b = 0, c = 0] = ver.split('.').map((n) => parseInt(n, 10) || 0);
  return a * 10000 + b * 100 + c;
}

if (!existsSync(gradlePath)) {
  console.log('[sync-android-version] android/app/build.gradle not found — skip');
  process.exit(0);
}

const code = versionCode(versionName);
let gradle = readFileSync(gradlePath, 'utf8');
const before = gradle;

gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`);
if (/versionCode\s+\d+/.test(gradle)) {
  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${code}`);
} else {
  gradle = gradle.replace(
    /versionName\s+"[^"]*"/,
    `versionCode ${code}\n        versionName "${versionName}"`,
  );
}

if (gradle !== before) {
  writeFileSync(gradlePath, gradle);
  console.log('[sync-android-version] %s (versionCode %s)', versionName, code);
} else {
  console.log('[sync-android-version] no changes needed');
}
