const CACHE_VERSION = 'rightsradar-pwa-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/assets/styles.css',
  '/assets/app.js',
  '/assets/pwa.js',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/new-laws.html',
  '/alerts.html',
  '/scotland-rights.html',
  '/england-wales-rights.html',
  '/northern-ireland-rights.html',
  '/protest-rights.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async cache => {
      await Promise.allSettled(CORE_ASSETS.map(url => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('rightsradar-pwa-') && ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Keep API and account/member data live rather than serving stale legal/account responses.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match('/offline.html');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached);

      return cached || networkFetch;
    })
  );
});
