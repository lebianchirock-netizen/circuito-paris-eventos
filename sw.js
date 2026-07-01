const CACHE_NAME = 'circuito-cache-v17';
const ASSETS = [
  './',
  './index.html',
  './painel-publico.html',
  './css/style.css',
  './js/storage.js',
  './js/app.js',
  './js/painel.js',
  './js/supabase-config.js',
  './js/admin-config.js',
  './js/auth-gate.js',
  './manifest.json',
  './icons/icon.svg',
  './assets/paris-eventos-logo.png',
  './assets/enjoy-picture-logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
