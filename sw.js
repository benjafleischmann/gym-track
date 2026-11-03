const CACHE_NAME = 'gymtrack-v12';
const IMG_CACHE  = 'gymtrack-exercise-images';
const IMG_HOST   = 'cdn.jsdelivr.net';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './js/data.js',
  './js/exercises.js',
  './js/exercise-library.js',
  './js/firebase.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME && k !== IMG_CACHE)
        .map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Exercise reference photos: too large to precache (~66MB for the full set),
  // so they are fetched on first view and kept in their own cache, which
  // survives app-shell version bumps.
  if (url.hostname === IMG_HOST && url.pathname.includes('free-exercise-db')) {
    e.respondWith(
      caches.open(IMG_CACHE).then(cache =>
        cache.match(e.request).then(cached =>
          cached || fetch(e.request).then(res => {
            // <img> fetches are no-cors, so a successful CDN response comes
            // back opaque with status 0 — ok is false. Opaque responses are
            // still storable and replayable, so cache those too.
            if (res.ok || res.type === 'opaque') cache.put(e.request, res.clone());
            return res;
          }).catch(() => cached)
        )
      )
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
