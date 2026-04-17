const CACHE_VERSION = 'pm-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  console.log('[SW] Installing...');
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then(c => c.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', e => {
  console.log('[SW] Activating...');
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET, API calls, socket connections
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/socket.io/')) return;
  if (url.protocol === 'chrome-extension:') return;

  // Static assets - cache first
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // HTML pages - network first, fallback to cache then offline
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(DYNAMIC_CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request)
          .then(cached => cached || caches.match(OFFLINE_URL))
      )
  );
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', e => {
  let data = { title: 'Peace Mindset School', body: 'New notification', url: '/' };
  try { data = { ...data, ...e.data.json() }; } catch {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: data.tag || 'pm-notif',
      data: { url: data.url },
      requireInteraction: data.requireInteraction || false,
      vibrate: [200, 100, 200, 100, 200],
      renotify: true,
      actions: data.actions || [],
    })
  );
});

// ── Notification Click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(cls => {
        const win = cls.find(c => c.url.includes(self.location.origin));
        if (win) { win.focus(); win.navigate(url); return; }
        clients.openWindow(url);
      })
  );
});

// ── Background Sync ───────────────────────────────────────────────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'sync-messages') {
    e.waitUntil(syncOfflineMessages());
  }
});

async function syncOfflineMessages() {
  try {
    const db = await openDB();
    const msgs = await getAllOfflineMsgs(db);
    for (const msg of msgs) {
      try {
        await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${msg.token}` },
          body: JSON.stringify(msg.data)
        });
        await deleteOfflineMsg(db, msg.id);
      } catch {}
    }
  } catch {}
}

// Simple IndexedDB helpers for offline messages
function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open('pm-offline', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
    req.onsuccess = e => res(e.target.result);
    req.onerror = rej;
  });
}
function getAllOfflineMsgs(db) {
  return new Promise((res, rej) => {
    const req = db.transaction('messages').objectStore('messages').getAll();
    req.onsuccess = e => res(e.target.result);
    req.onerror = rej;
  });
}
function deleteOfflineMsg(db, id) {
  return new Promise((res, rej) => {
    const req = db.transaction('messages','readwrite').objectStore('messages').delete(id);
    req.onsuccess = res; req.onerror = rej;
  });
}

// ── Auto-update check ─────────────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
  if (e.data === 'CHECK_UPDATE') self.registration.update();
});
