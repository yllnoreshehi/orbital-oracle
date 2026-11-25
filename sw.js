/* sw.js — offline support, so the oracle still speaks on the train.
 * App shell is cached on install; satellite data is fetched live when possible
 * and falls back to the bundled elements the page already ships with. */
const VERSION = 'orbital-oracle-v2';
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
  e.waitUntil(
    caches.open(VERSION)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Live data and fonts: network first, cache as a fallback.
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

  // Own files: cache first, refresh in the background.
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
