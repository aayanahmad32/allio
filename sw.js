const CACHE_NAME = 'allio-pro-v1.0.40';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // API calls: Network First
  if (e.request.url.includes('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response(JSON.stringify({ error: 'Offline' }), { headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }
  // Static files: Stale-While-Revalidate
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const networkFetch = fetch(e.request).then((resp) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resp.clone()));
        return resp;
      });
      return cached || networkFetch;
    })
  );
});