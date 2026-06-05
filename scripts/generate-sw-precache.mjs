/**
 * Post-build: scan `out/` and emit `/sw-precache.json` for the service worker.
 * Run after `next build` so hub pages + hashed assets are warm on first visit.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, '../out');
const pkg = JSON.parse(readFileSync(join(root, '../package.json'), 'utf8'));

const ASSET_EXT = /\.(html?|js|css|json|png|jpe?g|webp|svg|ico|woff2?|txt|webmanifest)$/i;
const SKIP_DIRS = new Set(['.git', 'certs', 'windows11']);

function shouldIncludeAsset(path) {
  if (path.includes('/__next.') && path.endsWith('.txt')) return false;
  if (path.endsWith('.txt') && !path.endsWith('/robots.txt') && !path.endsWith('/app-ads.txt')) {
    return false;
  }
  return true;
}

function walkFiles(dir, base = '') {
  const urls = [];
  if (!existsSync(dir)) return urls;

  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const abs = join(dir, name);
    const rel = base ? `${base}/${name}` : `/${name}`;
    const st = statSync(abs);
    if (st.isDirectory()) {
      urls.push(...walkFiles(abs, rel));
      continue;
    }
    if (!ASSET_EXT.test(name)) continue;
    if (!shouldIncludeAsset(rel)) continue;
    urls.push(rel);
  }
  return urls;
}

function toRouteUrls(filePaths) {
  const routes = new Set();
  for (const file of filePaths) {
    if (file.endsWith('/index.html')) {
      const dir = file.slice(0, -'/index.html'.length) || '/';
      routes.add(dir === '/' ? '/' : `${dir}/`);
      routes.add(file);
      continue;
    }
    if (file === '/index.html') {
      routes.add('/');
      routes.add(file);
      continue;
    }
    routes.add(file);
  }
  return [...routes].sort();
}

function buildStamp() {
  try {
    const versionJs = readFileSync(join(root, '../src/config/Version.js'), 'utf8');
    const m = versionJs.match(/BUILD_STAMP = '([^']+)'/);
    return m?.[1] ?? 'dev';
  } catch {
    return 'dev';
  }
}

if (!existsSync(outDir)) {
  console.warn('[sw-precache] skip — out/ not found (run next build first)');
  process.exit(0);
}

const files = walkFiles(outDir);
const urls = toRouteUrls(files);

const manifest = {
  version: `${pkg.version}-${buildStamp()}`,
  generatedAt: new Date().toISOString(),
  urls,
};

const json = JSON.stringify(manifest);
const outPath = join(outDir, 'sw-precache.json');
writeFileSync(outPath, json);

const digest = createHash('sha256').update(json).digest('hex').slice(0, 12);
writeFileSync(join(outDir, 'sw-version.txt'), manifest.version);

console.log(`[sw-precache] ${urls.length} urls · cache ${manifest.version} · ${digest}`);
