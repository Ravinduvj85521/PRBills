const CACHE_NAME = 'billparser';

// Install event: Skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event: Claim clients to control them immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Fetch event: Network first, fall back to cache for app shell; Cache first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache First strategy for CDN assets (React, Tailwind, Icons, etc.)
  if (url.hostname.includes('esm.sh') || url.hostname.includes('cdn.tailwindcss.com') || url.hostname.includes('flaticon.com')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          // Check if we received a valid response
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
  } 
  // Network First strategy for everything else (API calls, main document)
  else {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }
});