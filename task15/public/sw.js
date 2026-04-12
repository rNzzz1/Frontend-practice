const APP_SHELL_CACHE = 'task15-app-shell-v1';
const DYNAMIC_CACHE = 'task15-dynamic-v1';

const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/offline.html',
  '/manifest.json',
  '/content/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== APP_SHELL_CACHE && key !== DYNAMIC_CACHE) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      )
    )
  );
  self.clients.claim();
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(APP_SHELL_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, fallbackPath) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return caches.match(fallbackPath);
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, '/index.html'));
    return;
  }

  if (url.pathname.startsWith('/content/')) {
    event.respondWith(networkFirst(request, '/content/offline.html'));
    return;
  }

  event.respondWith(
    cacheFirst(request).catch(() => caches.match('/offline.html'))
  );
});
