const CACHE = 'apple-game-v5';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './js/main.js',
  './js/board.js',
  './js/rules.js',
  './js/layout.js',
  './js/render.js',
  './js/drag.js',
  './js/intro.js',
  './assets/intro1.jpg',
  './assets/intro2.jpg',
  './assets/intro3.jpg',
  './assets/intro4.jpg',
  './assets/ending.jpg',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .catch((err) => {
        console.error('[SW] Cache install failed:', err.message);
        throw err;
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET') return;

  if (ev.request.mode === 'navigate') {
    ev.respondWith(
      caches.match(ev.request).then((hit) =>
        hit || fetch(ev.request).catch(() => caches.match('./index.html'))
      )
    );
    return;
  }

  ev.respondWith(
    caches.match(ev.request).then((hit) => hit || fetch(ev.request))
  );
});
