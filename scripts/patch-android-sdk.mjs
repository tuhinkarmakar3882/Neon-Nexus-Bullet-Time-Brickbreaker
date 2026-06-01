#!/usr/bin/env node
/**
 * Enforce current Play target API on the local Capacitor android/ project.
 * Play Protect blocks apps (APK / store builds) with targetSdk below platform requirements.
 *
 * Run after `cap add android` or before `cap sync` — see ship:android / cap:android scripts.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const variablesPath = join(root, 'android/variables.gradle');
const appGradlePath = join(root, 'android/app/build.gradle');

/** Play policy (2025): new apps/updates must target API 35. */
const TARGET_SDK = 35;
const COMPILE_SDK = 35;
const MIN_SDK = 24;

function patchVariables(content) {
  let next = content;
  const replaceOrInsert = (key, value) => {
    const re = new RegExp(`${key}\\s*=\\s*\\d+`);
    if (re.test(next)) {
      next = next.replace(re, `${key} = ${value}`);
    } else if (/ext\s*\{/.test(next)) {
      next = next.replace(/ext\s*\{/, `ext {\n    ${key} = ${value}`);
    }
  };
  replaceOrInsert('minSdkVersion', MIN_SDK);
  replaceOrInsert('compileSdkVersion', COMPILE_SDK);
  replaceOrInsert('targetSdkVersion', TARGET_SDK);
  return next;
}

function patchAppGradle(content) {
  let next = content;
  if (/targetSdkVersion\s+/.test(next)) {
    next = next.replace(/targetSdkVersion\s+\d+/, `targetSdkVersion ${TARGET_SDK}`);
  }
  if (/compileSdkVersion\s+/.test(next)) {
    next = next.replace(/compileSdkVersion\s+\d+/, `compileSdkVersion ${COMPILE_SDK}`);
  }
  if (/minSdkVersion\s+/.test(next)) {
    next = next.replace(/minSdkVersion\s+\d+/, `minSdkVersion ${MIN_SDK}`);
  }
  return next;
}

if (!existsSync(variablesPath)) {
  console.log('[patch-android-sdk] android/variables.gradle not found — run: pnpm run cap:add:android');
  process.exit(0);
}

let variables = readFileSync(variablesPath, 'utf8');
const varsBefore = variables;
variables = patchVariables(variables);
if (variables !== varsBefore) {
  writeFileSync(variablesPath, variables);
  console.log('[patch-android-sdk] variables.gradle → compile/target SDK %s, min %s', COMPILE_SDK, MIN_SDK);
} else {
  console.log('[patch-android-sdk] variables.gradle already at SDK %s', TARGET_SDK);
}

if (existsSync(appGradlePath)) {
  let appGradle = readFileSync(appGradlePath, 'utf8');
  const gradleBefore = appGradle;
  appGradle = patchAppGradle(appGradle);
  if (appGradle !== gradleBefore) {
    writeFileSync(appGradlePath, appGradle);
    console.log('[patch-android-sdk] app/build.gradle SDK values updated');
  }
}
