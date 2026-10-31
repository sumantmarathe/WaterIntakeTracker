// Progressive Web App Service Worker — AquaPulse Water Intake Tracker
// Rule 6: Explicit versioned cache with skipWaiting() and clients.claim()
const CACHE_NAME = 'water-tracker-cache-v1.0.0';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './privacy.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/waterLogic.js',
  './js/storage.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(event.request).catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return null;
        })
      );
    })
  );
});
