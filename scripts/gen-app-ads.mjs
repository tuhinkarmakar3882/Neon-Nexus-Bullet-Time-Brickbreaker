#!/usr/bin/env node
/** Write public/app-ads.txt for AdMob verification (served at /app-ads.txt). */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFiles } from './load-env.mjs';

loadEnvFiles({ production: true });

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = (process.env.VITE_ADMOB_PUBLISHER_ID || 'pub-XXXXXXXXXXXXXXXX').replace(/^ca-app-pub-/, 'pub-');
const line = `google.com, ${pub}, DIRECT, f08c47fec0942fa0`;
const out = join(root, 'public/app-ads.txt');

writeFileSync(out, `${line}\n`);
console.log('[gen-app-ads] wrote %s', out);
