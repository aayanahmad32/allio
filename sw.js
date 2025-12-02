const CACHE_NAME = 'allio-pro-premium-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json'
];

// Install Event: Cache Static Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: Cleanup Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Network First for APIs, Cache First for UI
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // 1. IGNORE API CALLS (Network Only)
  // Ensure we always get fresh data for downloads and searches
  if (url.includes('api.cobalt.tools') ||
    url.includes('vid.puffyan.us') ||
    url.includes('youtube.com') ||
    url.includes('googleapis.com') ||
    url.includes('picsum.photos') ||
    url.includes('highperformanceformat.com')) {
    return; // Go directly to network
  }
  
  // 2. Cache First, Fallback to Network for UI assets
  event.respondWith(
    caches.match(event.request)
    .then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request)
        .then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          // Clone and cache new static assets
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          return response;
        });
    })
  );
});