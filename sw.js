const CACHE_NAME = 'gymtrack-v19';
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
  './js/recommend.js',
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

  // The page itself is network-first. It carries the ?v= query strings that
  // point at every other asset, so serving it from cache pins the whole app to
  // an old build and no amount of version bumping can ever reach the device.
  // Falls back to the cached copy when offline, which is the case that matters.
  //
  // `cache: 'no-store'` is the important part: a plain fetch() still reads the
  // browser's HTTP cache, so a Cache-Control max-age on index.html would keep
  // replaying the old build here even though this handler asks the network.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(new Request(e.request.url, { cache: 'no-store', credentials: 'same-origin' }))
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then(c => c || caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
