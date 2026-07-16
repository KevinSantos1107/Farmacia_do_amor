const CACHE_NAME = 'kevin-iara-v2';

// Install event
self.addEventListener('install', (event) => {
    // The service worker is installed
    self.skipWaiting();
});

// Activate event
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

// Fetch event
self.addEventListener('fetch', (event) => {
    // Estratégia Network First, falling back to cache
    // Permite que o site funcione offline mas garanta as atualizações se houver internet
    event.respondWith(
        fetch(event.request).then((response) => {
            if (event.request.method === 'GET' && response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    if (event.request.url.startsWith('http')) {
                        cache.put(event.request, responseClone);
                    }
                });
            }
            return response;
        }).catch(() => {
            return caches.match(event.request);
        })
    );
});
