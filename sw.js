/* sw.js — offline support, so the oracle still speaks on the train.
 *
 * Strategy: NETWORK FIRST for the app's own files, cache as the fallback.
 * The obvious alternative (cache first) makes updates land a reload late and,
 * worse, can pin a stale file forever if the browser's HTTP cache was serving
 * one at install time. Correctness beats a few saved milliseconds; the cache
 * is still there the moment the network isn't.
 */
const VERSION = 'orbital-oracle-v3';
const SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/chart.js',
  './js/interpretations.js',
  './js/lore.js',
  './js/satellites.js',
  './js/horoscope.js',
  './js/share.js',
  './js/app.js',
  './js/vendor/astronomy.browser.min.js',
  './js/vendor/satellite.min.js',
  './js/vendor/tz.js',
  './data/tle-fallback.js',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // `cache: 'reload'` bypasses the browser's HTTP cache, so install can
    // never store a stale copy of a file we just shipped.
    await Promise.allSettled(
      SHELL.map(url => cache.add(new Request(url, { cache: 'reload' })))
    );
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Cross-origin (CelesTrak, Nominatim, fonts): straight to the network,
  // with whatever we cached as a last resort.
  if (url.origin !== location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok && url.hostname.indexOf('fonts.') === 0) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Icons barely change and are the largest files: cache first.
  if (url.pathname.indexOf('/icons/') !== -1) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }

  // Everything else of ours: network first, cache fallback when offline.
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    } catch (err) {
      const hit = await caches.match(req);
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
