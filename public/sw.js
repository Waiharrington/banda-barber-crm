// Service Worker para la PWA de Panda Barber Studio con Soporte Offline e IndexedDB

const CACHE_NAME = 'panda-barber-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/admin.html',
  '/manifest.json',
  '/favicon.png',
  '/favicon.svg',
  '/pwa-icon.png'
];

// Instalar cache de recursos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activar y limpiar caches antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Interceptar peticiones para soporte offline e IndexedDB Sync
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Interceptar peticiones POST/PATCH a Supabase cuando esté offline
  if (url.hostname.includes('supabase.co') && (event.request.method === 'POST' || event.request.method === 'PATCH' || event.request.method === 'PUT')) {
    event.respondWith(
      fetch(event.request.clone()).catch(async () => {
        // Si falla la red (offline), guardamos la petición en IndexedDB
        const requestClone = event.request.clone();
        const bodyText = await requestClone.text();
        
        await saveOfflineRequest({
          url: requestClone.url,
          method: requestClone.method,
          headers: Array.from(requestClone.headers.entries()).reduce((h, [k, v]) => ({ ...h, [k]: v }), {}),
          body: bodyText,
          timestamp: Date.now()
        });

        // Retornamos un mock JSON exitoso para evitar errores fatales en el cliente
        return new Response(JSON.stringify({ offline: true, success: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Caching estándar: Network first falling back to cache
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Guardar petición en IndexedDB
function saveOfflineRequest(requestData) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('panda_offline_db', 1);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline_requests')) {
        db.createObjectStore('offline_requests', { keyPath: 'id', autoIncrement: true });
      }
    };
    
    request.onsuccess = event => {
      const db = event.target.result;
      const tx = db.transaction('offline_requests', 'readwrite');
      const store = tx.objectStore('offline_requests');
      store.add(requestData);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Sincronización en segundo plano al recuperar la conexión
self.addEventListener('sync', event => {
  if (event.tag === 'sync-offline-requests') {
    event.waitUntil(replayOfflineRequests());
  }
});

// Escuchar mensaje del cliente indicando que volvió a estar "online"
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'sync') {
    event.waitUntil(replayOfflineRequests());
  }
});

async function replayOfflineRequests() {
  const requests = await getOfflineRequests();
  if (requests.length === 0) return;

  for (const req of requests) {
    try {
      const response = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body
      });
      if (response.ok || response.status === 409) { // 409 is conflict (already processed)
        await deleteOfflineRequest(req.id);
      }
    } catch (e) {
      console.error('[SW Sync] Error replaying request:', e);
      break; // Detener re-ejecución para preservar el orden FIFO si falla la red nuevamente
    }
  }
}

function getOfflineRequests() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('panda_offline_db', 1);
    
    request.onsuccess = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline_requests')) {
        resolve([]);
        return;
      }
      const tx = db.transaction('offline_requests', 'readonly');
      const store = tx.objectStore('offline_requests');
      const getAllReq = store.getAll();
      getAllReq.onsuccess = () => resolve(getAllReq.result || []);
      getAllReq.onerror = () => reject(getAllReq.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

function deleteOfflineRequest(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('panda_offline_db', 1);
    
    request.onsuccess = event => {
      const db = event.target.result;
      const tx = db.transaction('offline_requests', 'readwrite');
      const store = tx.objectStore('offline_requests');
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Push Notifications
self.addEventListener('push', event => {
  let data = { title: 'Panda Barber Studio', body: 'Nueva notificación recibida.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Panda Barber Studio', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/pwa-icon.png',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      { action: 'explore', title: 'Ver CRM', icon: '/favicon.svg' },
      { action: 'close', title: 'Cerrar', icon: '/favicon.svg' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action !== 'close') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
