// Peace Mindset School - Service Worker
// Handles background push notifications on Android

const CACHE_NAME = 'peace-mindset-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/logo.webp',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first, fallback to cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return; // Don't cache API calls

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = JSON.parse(event.data?.text() || '{}');
  } catch {}

  const title = data.title || 'Peace Mindset School';
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/logo.webp',
    badge: '/logo.webp',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/', timestamp: data.timestamp || Date.now() },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Dismiss' },
    ],
    requireInteraction: false,
    tag: 'peace-mindset-notification',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification Click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ─── Background Sync (for offline messages) ──────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(
      // Notify all clients to retry sending queued messages
      clients.matchAll().then(clientList =>
        clientList.forEach(client => client.postMessage({ type: 'SYNC_MESSAGES' }))
      )
    );
  }
});
