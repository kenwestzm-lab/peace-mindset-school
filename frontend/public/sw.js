const CACHE_VERSION = 'pm-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMG_CACHE = `${CACHE_VERSION}-images`;
const OFFLINE_URL = '/offline.html';

// Cache limits to save storage
const MAX_DYNAMIC = 50;
const MAX_IMAGES = 30;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then(c => c.addAll(['/', '/offline.html', '/manifest.json']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !k.startsWith(CACHE_VERSION)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Limit cache size
async function limitCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) {
    await Promise.all(keys.slice(0, keys.length - max).map(k => cache.delete(k)));
  }
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never intercept these
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/socket.io/')) return;
  if (url.protocol === 'chrome-extension:') return;
  if (url.hostname.includes('cloudinary')) {
    // Cache images aggressively - they never change
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res.ok) {
            caches.open(IMG_CACHE).then(c => {
              c.put(e.request, res.clone());
              limitCache(IMG_CACHE, MAX_IMAGES);
            });
          }
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Static assets (JS/CSS) - cache first, very long lived
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res.ok) caches.open(STATIC_CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        });
      })
    );
    return;
  }

  // HTML - network first, fast fallback
  e.respondWith(
    fetch(e.request, { signal: AbortSignal.timeout(5000) })
      .then(res => {
        if (res.ok) {
          caches.open(DYNAMIC_CACHE).then(c => {
            c.put(e.request, res.clone());
            limitCache(DYNAMIC_CACHE, MAX_DYNAMIC);
          });
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(c => c || caches.match(OFFLINE_URL)))
  );
});

// Push notifications
self.addEventListener('push', e => {
  let data = { title:'Peace Mindset School', body:'New notification', url:'/' };
  try { data = {...data, ...e.data.json()}; } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: data.tag || 'pm',
      data: { url: data.url },
      requireInteraction: data.requireInteraction || false,
      vibrate: [200,100,200],
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(cls => {
      const w = cls.find(c => c.url.includes(self.location.origin));
      if (w) { w.focus(); w.navigate(url); }
      else clients.openWindow(url);
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
