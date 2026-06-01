#!/usr/bin/env node
/**
 * Fail if git tracks secret files or obvious secret values in committed source.
 * Run in CI and before push: pnpm run check:secrets
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function gitTrackedFiles() {
  try {
    return execSync('git ls-files -z', { cwd: root, encoding: 'utf8' })
      .split('\0')
      .filter(Boolean);
  } catch {
    return [];
  }
}

const errors = [];
const tracked = gitTrackedFiles();

const allowedEnvTemplates = new Set(['.env.example', '.env.production.example']);

for (const file of tracked) {
  const base = file.split('/').pop();

  if (file.startsWith('.env') && !allowedEnvTemplates.has(file)) {
    errors.push(`Tracked env file (must be gitignored): ${file}`);
  }

  if (/keystore\.properties$/i.test(file) && !/\.example$/i.test(file)) {
    errors.push(`Tracked keystore config: ${file}`);
  }

  if (/\.(keystore|jks|p8|p12)$/i.test(file)) {
    errors.push(`Tracked signing key: ${file}`);
  }

  if (/google-services\.json$/i.test(file) || /GoogleService-Info\.plist$/i.test(file)) {
    errors.push(`Tracked mobile SDK secrets file: ${file}`);
  }

  if (/service-account/i.test(file) && file.endsWith('.json')) {
    errors.push(`Tracked service account JSON: ${file}`);
  }
}

/** Scan text files for live secret patterns (skip examples & docs with placeholders). */
const SECRET_PATTERNS = [
  { name: 'Stripe live secret', re: /\bsk_live_[a-zA-Z0-9]{16,}\b/ },
  { name: 'Stripe webhook secret', re: /\bwhsec_[a-zA-Z0-9]{16,}\b/ },
];

const SCAN_GLOB = /\.(js|mjs|ts|json|html|toml|md|env)$/i;
const SKIP_SCAN = [
  'node_modules/',
  'dist/',
  '.env.production.example',
  '.env.example',
  'docs/',
  'scripts/check-no-secrets.mjs',
];

for (const file of tracked) {
  if (!SCAN_GLOB.test(file)) continue;
  if (SKIP_SCAN.some((s) => file === s || file.startsWith(s))) continue;
  const path = join(root, file);
  if (!existsSync(path)) continue;
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    continue;
  }
  for (const { name, re } of SECRET_PATTERNS) {
    if (re.test(text)) {
      errors.push(`${name} pattern in tracked file: ${file}`);
    }
  }
}

if (existsSync(join(root, '.env.production'))) {
  const staged = tracked.includes('.env.production');
  if (staged) errors.push('.env.production is tracked — remove from git and keep only in .gitignore');
}

if (existsSync(join(root, '.env')) && tracked.includes('.env')) {
  errors.push('.env is tracked — remove from git history');
}

for (const e of errors) console.error('[check:secrets]', e);

if (errors.length) {
  console.error('\n[check:secrets] FAILED — do not commit secrets. Use .env.production (gitignored) or host env vars.');
  process.exit(1);
}

console.log('[check:secrets] OK — no tracked secret files detected');
