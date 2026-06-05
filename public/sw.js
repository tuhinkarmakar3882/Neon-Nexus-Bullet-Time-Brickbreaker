/** Stale-while-revalidate asset cache + network-first shell documents. */
const BUILD_STAMP = '__SW_BUILD__';
const FALLBACK_CACHE = 'neon-nexus-fallback-v1';
const PRECACHE_MANIFEST = '/sw-precache.json';
const MANIFEST_CHECK_MS = 5 * 60 * 1000;

let activeCache = FALLBACK_CACHE;
let lastManifestCheck = 0;
const MIN_SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(FALLBACK_CACHE);
      await cache.addAll(MIN_SHELL).catch(() => {});
      await refreshPrecache();
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch {
          /* unsupported or disabled */
        }
      }
      await refreshPrecache();
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== activeCache).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'neon-warm-cache' && Array.isArray(data.urls)) {
    event.waitUntil(warmUrls(data.urls));
  }
  if (data.type === 'neon-check-precache') {
    event.waitUntil(refreshPrecache(true));
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (shouldBypass(request, url)) return;

  event.waitUntil(maybeRefreshPrecache());

  if (request.mode === 'navigate' || isShellDocument(request, url)) {
    event.respondWith(handleDocument(request, event));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'neon-save-push') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'neon-save-push' }));
      }),
    );
  }
});

function shouldBypass(request, url) {
  if (url.pathname.startsWith('/api/')) return true;
  if (url.pathname === '/sw.js' || url.pathname === '/sw-precache.json') return true;
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return true;
  return false;
}

function isShellDocument(request, url) {
  const path = url.pathname;
  if (path.startsWith('/_next/') || path.startsWith('/api/')) return false;
  if (path.includes('.')) return false;

  const accept = request.headers.get('accept') || '';
  if (accept.includes('text/html')) return true;

  // Hub prefetch uses fetch() with Accept: */* — still shell HTML.
  return path === '/' || path.endsWith('/');
}

async function openActiveCache() {
  return caches.open(activeCache);
}

async function maybeRefreshPrecache() {
  const now = Date.now();
  if (now - lastManifestCheck < MANIFEST_CHECK_MS) return;
  lastManifestCheck = now;
  await refreshPrecache();
}

async function refreshPrecache(force = false) {
  try {
    const res = await fetch(PRECACHE_MANIFEST, { cache: 'no-store' });
    if (!res.ok) return;
    const manifest = await res.json();
    if (!manifest?.version || !Array.isArray(manifest.urls)) return;

    const nextCache = `neon-nexus-${manifest.version}`;
    if (!force && nextCache === activeCache) {
      const existing = await caches.has(nextCache);
      if (existing) return;
    }

    const cache = await caches.open(nextCache);
    await cacheUrls(cache, manifest.urls);
    activeCache = nextCache;
  } catch {
    /* manifest optional in dev / first deploy */
  }
}

async function cacheUrls(cache, urls) {
  const batchSize = 24;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (path) => {
        try {
          const res = await fetch(path, { credentials: 'same-origin' });
          if (res.ok) await cache.put(path, res);
        } catch {
          /* skip unreachable asset */
        }
      }),
    );
  }
}

async function warmUrls(urls) {
  const cache = await openActiveCache();
  const unique = [...new Set(urls.filter((u) => typeof u === 'string' && u.startsWith('/')))];
  await cacheUrls(cache, unique);
}

function readPreloadResponse(event) {
  if (!event?.preloadResponse) return Promise.resolve(null);
  return event.preloadResponse
    .then((response) => (response?.ok ? response : null))
    .catch(() => null);
}

async function networkFromPreloadOrFetch(request, event) {
  const preloaded = await readPreloadResponse(event);
  if (preloaded) return preloaded;
  try {
    const response = await fetch(request);
    return response?.ok ? response : null;
  } catch {
    return null;
  }
}

/** Network-first for shell HTML — fresh deploys win; cache is offline fallback only. */
async function handleDocument(request, event) {
  const cache = await openActiveCache();

  const fresh = await networkFromPreloadOrFetch(request, event);
  if (fresh) {
    await cache.put(request, fresh.clone());
    return fresh;
  }

  const cached = await matchCached(cache, request);
  if (cached) return cached;

  return (
    (await matchCached(cache, '/index.html')) ??
    (await caches.match('/index.html')) ??
    (await caches.match('/')) ??
    Response.error()
  );
}

async function staleWhileRevalidate(request) {
  const cache = await openActiveCache();
  const cached = await cache.match(request);

  const revalidate = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    void revalidate;
    return cached;
  }

  const fresh = await revalidate;
  if (fresh) return fresh;

  return Response.error();
}

async function matchCached(cache, request) {
  const direct = await cache.match(request);
  if (direct) return direct;

  const url = new URL(typeof request === 'string' ? request : request.url);
  let path = url.pathname;
  if (!path.endsWith('/')) path = `${path}/`;

  const alt = await cache.match(path);
  if (alt) return alt;

  if (path !== '/') {
    const indexPath = `${path}index.html`.replace(/\/{2,}/g, '/');
    return cache.match(indexPath);
  }

  return undefined;
}
