
// Peace Mindset School - Service Worker v3
// Fast loading + Full Offline Support

const CACHE_NAME = 'peace-mindset-v3';
const VOICE_CACHE = 'peace-mindset-voice-v1';
const IMG_CACHE   = 'peace-mindset-img-v1';

const STATIC_ASSETS = [
  '/', '/index.html', '/logo.webp', '/manifest.json',
];

// Install — cache everything
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS).catch(()=>{}))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => ![CACHE_NAME,VOICE_CACHE,IMG_CACHE].includes(k)).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;

  // Voice messages — cache-first (works offline!)
  if (url.includes('/voice/') || url.includes('audio') || url.match(/\.(webm|mp3|ogg|m4a)$/)) {
    e.respondWith(
      caches.open(VOICE_CACHE).then(async cache => {
        const hit = await cache.match(e.request);
        if (hit) return hit;
        try {
          const res = await fetch(e.request);
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        } catch { return hit || new Response('', { status: 503 }); }
      })
    );
    return;
  }

  // Images — cache-first
  if (url.match(/\.(jpg|jpeg|png|webp|gif|svg)$/) || url.includes('cloudinary')) {
    e.respondWith(
      caches.open(IMG_CACHE).then(async cache => {
        const hit = await cache.match(e.request);
        if (hit) return hit;
        try {
          const res = await fetch(e.request);
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        } catch { return hit || new Response('', { status: 503 }); }
      })
    );
    return;
  }

  // API — network only (no cache for fresh data)
  if (url.includes('/api/') || url.includes('socket.io')) return;

  // JS/CSS assets — cache-first for instant load
  if (url.includes('/assets/')) {
    e.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const hit = await cache.match(e.request);
        if (hit) return hit;
        try {
          const res = await fetch(e.request);
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        } catch { return hit || new Response('', { status: 503 }); }
      })
    );
    return;
  }

  // Everything else — network first, cache fallback
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match('/')))
  );
});

// Push notifications
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data?.json() || {}; } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'Peace Mindset', {
      body: data.body || '',
      icon: '/logo.webp',
      badge: '/logo.webp',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || '/'));
});
