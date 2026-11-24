/* Winit PWA worker: cache the public app shell only, never account/API responses. */
const CACHE_NAME = 'winit-shell-v4';
const PRECACHE_ASSETS = [
  '/offline.html',
  '/favicon.ico',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names
        .filter((name) => name.startsWith('winit-') && name !== CACHE_NAME)
        .map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Navigations are network-only to avoid serving a stale or previously
  // authenticated page to another person using this device offline.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () =>
      (await caches.match('/offline.html')) || new Response('Offline', { status: 503 }),
    ));
    return;
  }

  // Only cache fingerprinted Next assets and public app icons. Never cache
  // arbitrary HTML, user-specific responses, or API payloads.
  if (url.pathname.startsWith('/_next/static/') || /^\/(?:icon|favicon|apple-touch-icon)/.test(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    })));
  }
});
