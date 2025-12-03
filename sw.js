const CACHE_NAME = 'allio-pro-v2.0.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Space+Grotesk:wght@400;700&display=swap'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Event - Cleanup old caches
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
});

// Fetch Event - Network First, fallback to Cache
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests like Google Analytics
  if (!event.request.url.startsWith(self.location.origin) &&
    !event.request.url.includes('cdnjs') &&
    !event.request.url.includes('fonts')) {
    return;
  }
  
  // Handle API requests (Network Only)
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
    .then((response) => {
      // Check if we received a valid response
      if (!response || response.status !== 200 || response.type !== 'basic') {
        return response;
      }
      
      // Clone the response
      const responseToCache = response.clone();
      
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, responseToCache);
      });
      
      return response;
    })
    .catch(() => {
      // If network fails, try cache
      return caches.match(event.request);
    })
  );
});