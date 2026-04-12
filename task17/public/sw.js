const CACHE_NAME = 'task17-shell-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/content/home.html',
  '/content/about.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.pathname.startsWith('/socket.io/') || url.pathname.startsWith('/api/') || url.pathname === '/snooze') {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'Новое уведомление',
    body: 'У вас есть новое событие.',
    reminderId: null,
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (_error) {
      data = {
        title: 'Новое уведомление',
        body: event.data.text() || 'У вас есть новое событие.',
        reminderId: null,
      };
    }
  }

  const title = data.title || 'Напоминание';
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {
      reminderId: data.reminderId || null,
    },
    // Keep notification visible longer so user can notice it.
    requireInteraction: true,
    renotify: true,
    tag: data.reminderId ? `reminder-${data.reminderId}` : `push-${Date.now()}`,
  };

  if (data.reminderId) {
    options.actions = [{
      action: 'snooze',
      title: 'Отложить на 5 минут',
    }];
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'push-received',
            title,
            body: data.body || '',
            reminderId: data.reminderId || null,
          });
        });
      }),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  const reminderId = event.notification && event.notification.data
    ? event.notification.data.reminderId
    : null;

  if (event.action === 'snooze' && reminderId) {
    event.waitUntil(
      fetch(`/snooze?reminderId=${encodeURIComponent(reminderId)}`, { method: 'POST' })
        .catch((error) => {
          console.error('Snooze failed:', error);
        })
        .finally(() => {
          event.notification.close();
        })
    );
    return;
  }

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }

        return clients.openWindow('/');
      })
      .finally(() => {
        event.notification.close();
      })
  );
});
