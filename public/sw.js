// RaTooL PWA Resilient Service Worker
const CACHE_NAME = 'ratool-cache-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Install: precache offline shell and skip waiting immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA precache error (non-fatal):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: purge all stale caches from previous versions and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Purging outdated PWA cache:', key);
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch handler: Network-First for HTML navigation, Stale-While-Revalidate for static assets
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Ignore non-http schemes (chrome-extension://, blob:, etc.)
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // Cross-origin requests (Firebase Auth, Cloud APIs, CDNs): bypass service worker
  if (url.origin !== self.location.origin) return;

  // Bypass API routes, Firebase Auth proxy, and Vite dev server internals
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/__') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src') ||
    url.pathname.startsWith('/node_modules') ||
    url.pathname.includes('hot-update') ||
    url.search.includes('vite')
  ) {
    return;
  }

  // 1. Navigation requests (HTML pages): NETWORK-FIRST
  // This prevents the PWA from ever being stuck on a stale index.html with obsolete JS hashes
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback: try cache for this URL, or root /index.html
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const rootCached = await caches.match('/index.html') || await caches.match('/');
          if (rootCached) return rootCached;
          
          // Last resort fallback HTML to avoid browser "Internal Error" screen
          return new Response(
            '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>RaTooL Offline</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="background:#0a0a0a;color:#fff;font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:40px 20px;"><div style="max-width:360px;margin:0 auto;background:#18181b;padding:24px;border-radius:16px;border:1px solid rgba(255,255,255,0.1);"><h3 style="margin-top:0;font-size:18px;">RaTooL is Offline</h3><p style="color:#a1a1aa;font-size:14px;">You seem to be offline or the network connection was interrupted.</p><button onclick="location.reload()" style="margin-top:12px;padding:10px 24px;border-radius:10px;background:#6366f1;color:#fff;font-weight:600;border:none;cursor:pointer;">Retry Connection</button></div></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 }
          );
        })
    );
    return;
  }

  // 2. Static Assets (JS, CSS, images, fonts): Cache-First / Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // If cached, return immediately and update cache in background
      if (cachedResponse) {
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      // Not in cache: fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        })
        .catch((err) => {
          console.warn('PWA asset fetch offline:', event.request.url);
          // CRITICAL: NEVER return undefined in respondWith to prevent Service Worker Internal Error
          return new Response('', { status: 503, statusText: 'Offline Resource Unavailable' });
        });
    })
  );
});

// Message listener for skipWaiting or manual cache purge from app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CLEAR_CACHES') {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    });
  }
});
