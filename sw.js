const CACHE_NAME = 'allio-pro-v2.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj53Rk8ZujNVQXwlX2DQUkrhYNukXM85qyqtaFWXYpeBDlBqNLIPb88wrMTj5yiiq02JMXDNePfFqtmW0ho1sBjFAQnr4uozum_EO2x1opzm3CLsmQq_4h5P3yUH_OqYhaGSZhnQ5wlMIk0M79dVX4l90sdFoZJ_d726LZd5mwxxaPI8za3pZhngNUJMfwq/s1024/IMG_20251124_121703.jpg'
];

// Install event - open a cache and add all the essential files to it
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
});

// Serve cached content when offline
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
    .then(function(response) {
      // Cache hit - return response
      if (response) {
        return response;
      }
      
      // Clone the request
      var fetchRequest = event.request.clone();
      
      return fetch(fetchRequest).then(
        function(response) {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          var responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }
      ).catch(function() {
        // If network fails, try to serve from cache
        return caches.match(event.request);
      });
    })
  );
});

// Activate event - remove old caches
self.addEventListener('activate', function(event) {
  var cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});