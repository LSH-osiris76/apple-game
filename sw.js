const CACHE = 'apple-game-v7';
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
      .then((c) => {
        // addAll(ASSETS)는 브라우저 HTTP 캐시를 그대로 쓴다. GitHub Pages가
        // 캐싱 헤더를 보내므로, 새 버전을 설치하면서도 옛 파일을 SW 캐시에
        // 담을 수 있다. cache:'reload'로 각 요청을 HTTP 캐시 우회해 받는다.
        const reqs = ASSETS.map((u) => new Request(u, { cache: 'reload' }));
        return c.addAll(reqs);
      })
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
