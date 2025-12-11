const CACHE_NAME = 'allio-pro-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js'
];

// Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  // CRITICAL: Do NOT cache API calls (fixes 405/500 errors on retry)
  if (event.request.url.includes('/api/') || event.request.method === 'POST') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
    .then((response) => response || fetch(event.request))
  );
});