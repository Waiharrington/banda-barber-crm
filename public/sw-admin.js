// Service Worker para la PWA Admin de Panda Barber CRM

const CACHE_NAME = 'panda-admin-cache-v1';
const ADMIN_BASE = '/admin';

const ASSETS_TO_CACHE = [
  '/admin.html',
  '/favicon.png',
  '/favicon.svg',
  '/pwa-icon.png',
  '/manifest-admin.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Offline support for Supabase POST/PATCH/PUT
  if (url.hostname.includes('supabase.co') && ['POST', 'PATCH', 'PUT'].includes(event.request.method)) {
    event.respondWith(
      fetch(event.request.clone()).catch(async () => {
        const requestClone = event.request.clone();
        const bodyText = await requestClone.text();

        await saveOfflineRequest({
          url: requestClone.url,
          method: requestClone.method,
          headers: Array.from(requestClone.headers.entries()).reduce((h, [k, v]) => ({ ...h, [k]: v }), {}),
          body: bodyText,
          timestamp: Date.now()
        });

        return new Response(JSON.stringify({ offline: true, success: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // SPA navigation fallback for admin routes
  if (event.request.mode === 'navigate' && url.pathname.startsWith(ADMIN_BASE)) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/admin.html'))
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ─── IndexedDB Offline Queue ────────────────────────────────────────────────

function saveOfflineRequest(requestData) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('panda_admin_offline_db', 1);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline_requests')) {
        db.createObjectStore('offline_requests', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = event => {
      const db = event.target.result;
      const tx = db.transaction('offline_requests', 'readwrite');
      tx.objectStore('offline_requests').add(requestData);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

self.addEventListener('sync', event => {
  if (event.tag === 'sync-admin-offline') event.waitUntil(replayOfflineRequests());
});

self.addEventListener('message', event => {
  if (event.data?.action === 'sync') event.waitUntil(replayOfflineRequests());
});

async function replayOfflineRequests() {
  const requests = await getOfflineRequests();
  for (const req of requests) {
    try {
      const response = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body });
      if (response.ok || response.status === 409) await deleteOfflineRequest(req.id);
    } catch (e) {
      console.error('[Admin SW Sync] Error:', e);
      break;
    }
  }
}

function getOfflineRequests() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('panda_admin_offline_db', 1);
    request.onsuccess = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline_requests')) { resolve([]); return; }
      const tx = db.transaction('offline_requests', 'readonly');
      const getAllReq = tx.objectStore('offline_requests').getAll();
      getAllReq.onsuccess = () => resolve(getAllReq.result || []);
      getAllReq.onerror = () => reject(getAllReq.error);
    };
    request.onerror = () => reject(request.error);
  });
}

function deleteOfflineRequest(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('panda_admin_offline_db', 1);
    request.onsuccess = event => {
      const db = event.target.result;
      const tx = db.transaction('offline_requests', 'readwrite');
      tx.objectStore('offline_requests').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

// ─── Push Notifications ─────────────────────────────────────────────────────

self.addEventListener('push', event => {
  let data = { title: 'Panda Admin', body: 'Nueva notificación.' };
  if (event.data) {
    try { data = event.data.json(); } catch (e) { data = { title: 'Panda Admin', body: event.data.text() }; }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-icon.png',
      badge: '/favicon.svg',
      vibrate: [100, 50, 100],
      data: { dateOfArrival: Date.now(), primaryKey: '1' },
      actions: [
        { action: 'open', title: 'Abrir Panel', icon: '/favicon.svg' },
        { action: 'close', title: 'Cerrar', icon: '/favicon.svg' }
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action !== 'close') {
    event.waitUntil(clients.openWindow('/admin'));
  }
});
