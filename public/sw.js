const CACHE_NAME = 'x-static-v2';

// Static assets to precache (never includes HTML with hashed JS references)
const STATIC_FILES = [
  '/offline.html',
  '/favicon/favicon.ico',
  '/favicon/favicon.svg',
  '/favicon/apple-touch-icon.png',
  '/favicon/favicon-96x96.png',
  '/favicon/web-app-manifest-192x192.png',
  '/favicon/web-app-manifest-512x512.png',
  '/favicon/site.webmanifest',
  '/logo.png',
  '/screenshot.webp',
];

// Install event - cache static files, then take control immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_FILES))
      .catch((error) => {
        console.error('Failed to cache static files:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up ALL old caches (including old HTML-caching versions)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache-first for static files, network-only for everything else
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Static files: cache-first (they rarely change, and we use versioned cache names)
  if (STATIC_FILES.includes(url.pathname)) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(request).then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
        })
    );
    return;
  }

  // Everything else (HTML, JS, CSS, etc.): network-only
  // NEVER cache HTML — it contains hashed JS/CSS references that change on every deploy
  event.respondWith(
    fetch(request).catch(() => {
      // If offline and requesting a page, serve the static offline fallback
      if (request.destination === 'document') {
        return caches.match('/offline.html');
      }
      throw new Error('Offline');
    })
  );
}); 
