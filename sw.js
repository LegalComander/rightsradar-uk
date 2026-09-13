const CACHE_VERSION = 'rightsradar-pwa-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const SAVED_CACHE = `${CACHE_VERSION}-saved`;

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/quick-help.html',
  '/saved.html',
  '/assets/styles.css',
  '/assets/app.js',
  '/assets/pwa.js',
  '/assets/pwa-settings.js',
  '/assets/pwa-experience.css',
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
      keys.filter(key => key.startsWith('rightsradar-pwa-') && ![STATIC_CACHE, RUNTIME_CACHE, SAVED_CACHE].includes(key))
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'CACHE_PAGE' && data.url) {
    event.waitUntil((async () => {
      try {
        const url = new URL(data.url, self.location.origin);
        if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
        const request = new Request(url.toString(), { credentials: 'same-origin' });
        const response = await fetch(request);
        if (response.ok) await (await caches.open(SAVED_CACHE)).put(request, response.clone());
      } catch {}
    })());
  }
  if (data.type === 'REMOVE_PAGE' && data.url) {
    event.waitUntil((async () => {
      try {
        const url = new URL(data.url, self.location.origin).toString();
        const cache = await caches.open(SAVED_CACHE);
        await cache.delete(url);
      } catch {}
    })());
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API/account responses. Legal/account data from APIs should stay live.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const saved = await caches.open(SAVED_CACHE);
      const savedResponse = await saved.match(request);
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      } catch {
        if (savedResponse) return savedResponse;
        const cached = await caches.match(request);
        return cached || caches.match('/offline.html');
      }
    })());
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

// Web-push display support is ready for Phase 2. Subscriptions are not requested until the notification backend is enabled.
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text?.() || '' }; }
  const title = data.title || 'RightsRadar UK';
  const options = {
    body: data.body || 'A legal-information update is available.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: data.url || '/new-laws.html' },
    tag: data.tag || 'rightsradar-law-update',
    renotify: Boolean(data.renotify)
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/new-laws.html', self.location.origin).toString();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.navigate(target).catch(() => {});
        return client.focus();
      }
    }
    return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
  })());
});
