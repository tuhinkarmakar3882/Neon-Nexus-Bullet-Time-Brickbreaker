/**
 * Load .env then .env.production into process.env (production wins).
 * Used by native sync / ship scripts. Vite loads these automatically on `vite build`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const eq = trimmed.indexOf('=');
  if (eq <= 0) return null;
  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"'))
    || (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  return { key, val };
}

/**
 * @param {{ production?: boolean }} [opts]
 */
export function loadEnvFiles(opts = {}) {
  const files = opts.production
    ? ['.env', '.env.production', '.env.production.local']
    : ['.env', '.env.local'];
  for (const name of files) {
    const path = join(root, name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const parsed = parseLine(line);
      if (parsed) process.env[parsed.key] = parsed.val;
    }
  }
}

if (process.argv[1]?.endsWith('load-env.mjs')) {
  const production = process.argv.includes('--production');
  loadEnvFiles({ production });
}
