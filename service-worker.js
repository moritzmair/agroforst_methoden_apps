// Cache-Name wird dynamisch aus manifest.json geladen
let APP_VERSION = null;

// Alle Ressourcen, die für die Offline-Funktionalität benötigt werden
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon.svg'
];

// Lade Version aus manifest.json
async function loadVersionFromManifest() {
  try {
    const response = await fetch('./manifest.json');
    if (response.ok) {
      const manifest = await response.json();
      APP_VERSION = manifest.version;
      CACHE_NAME = `hummelzaehler-offline-v${APP_VERSION}`;
      console.log('[Service Worker] Version geladen:', APP_VERSION, 'Cache:', CACHE_NAME);
      return APP_VERSION;
    }
  } catch (error) {
    console.error('[Service Worker] Fehler beim Laden der Version:', error);
  }
  // Fallback
  APP_VERSION = '1.0.0';
  CACHE_NAME = `hummelzaehler-offline-v${APP_VERSION}`;
  return APP_VERSION;
}

/**
 * Service Worker Installation
 * Beim Installieren werden alle Ressourcen in den Cache geladen
 */
self.addEventListener('install', event => {
  console.log('[Service Worker] Installation');
  
  event.waitUntil(
    loadVersionFromManifest()
      .then(() => {
        console.log('[Service Worker] Öffne Cache:', CACHE_NAME);
        return caches.open(CACHE_NAME);
      })
      .then(cache => {
        console.log('[Service Worker] Alle Ressourcen werden gecacht');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[Service Worker] Installation abgeschlossen');
        // Nur skipWaiting wenn explizit angefordert
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Fehler beim Cachen:', error);
      })
  );
});

/**
 * Service Worker Aktivierung
 * Beim Aktivieren werden alte Caches gelöscht
 */
self.addEventListener('activate', event => {
  console.log('[Service Worker] Aktivierung');
  
  event.waitUntil(
    loadVersionFromManifest()
      .then(() => {
        return Promise.all([
          // Lösche alte Caches
          caches.keys().then(cacheNames => {
            return Promise.all(
              cacheNames.map(cacheName => {
                if (cacheName !== CACHE_NAME) {
                  console.log('[Service Worker] Alter Cache wird gelöscht:', cacheName);
                  return caches.delete(cacheName);
                }
              })
            );
          }),
          // Übernimm sofort die Kontrolle über alle Clients
          self.clients.claim()
        ]);
      })
      .then(() => {
        console.log('[Service Worker] Aktivierung abgeschlossen mit Cache:', CACHE_NAME);
        // Benachrichtige alle Clients über die Aktivierung
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_ACTIVATED',
              cacheName: CACHE_NAME,
              version: APP_VERSION
            });
          });
        });
      })
  );
});

/**
 * Fetch-Event-Handler für Netzwerkanfragen
 * Implementiert verschiedene Strategien je nach Ressourcentyp
 */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  console.log('[Service Worker] Fetch:', url.pathname);
  
  // Prüfe auf Cache-Busting Parameter (für Updates)
  const isCacheBusting = url.searchParams.has('_t') || url.searchParams.has('t');
  
  // Network First für HTML-Dateien und Cache-Busting Requests
  if (event.request.headers.get('accept')?.includes('text/html') || isCacheBusting) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Wenn Netzwerk verfügbar, speichere im Cache und gib zurück
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                // Bei Cache-Busting, verwende die ursprüngliche URL ohne Parameter
                const cacheRequest = isCacheBusting ?
                  new Request(url.origin + url.pathname) :
                  event.request;
                cache.put(cacheRequest, responseToCache);
                console.log('[Service Worker] Ressource aus Netzwerk gecacht:', cacheRequest.url);
              });
            return response;
          }
          return response;
        })
        .catch(() => {
          // Fallback auf Cache wenn Netzwerk nicht verfügbar
          console.log('[Service Worker] Netzwerk nicht verfügbar, verwende Cache');
          const cacheRequest = isCacheBusting ?
            new Request(url.origin + url.pathname) :
            event.request;
          return caches.match(cacheRequest)
            .then(cachedResponse => {
              return cachedResponse || caches.match('./index.html');
            });
        })
    );
  } else {
    // Stale While Revalidate für kritische App-Dateien (JS, CSS)
    const isCriticalFile = url.pathname.endsWith('.js') ||
                          url.pathname.endsWith('.css') ||
                          url.pathname.endsWith('.json');
    
    if (isCriticalFile) {
      event.respondWith(
        caches.match(event.request)
          .then(cachedResponse => {
            // Starte Netzwerk-Request im Hintergrund
            const fetchPromise = fetch(event.request)
              .then(response => {
                if (response && response.status === 200) {
                  const responseToCache = response.clone();
                  caches.open(CACHE_NAME)
                    .then(cache => {
                      cache.put(event.request, responseToCache);
                      console.log('[Service Worker] Kritische Datei aktualisiert:', event.request.url);
                    });
                }
                return response;
              })
              .catch(error => {
                console.log('[Service Worker] Netzwerk-Update fehlgeschlagen:', error);
                return null;
              });
            
            // Gib Cache-Version zurück falls vorhanden, sonst warte auf Netzwerk
            if (cachedResponse) {
              console.log('[Service Worker] Liefere aus Cache (wird im Hintergrund aktualisiert):', event.request.url);
              return cachedResponse;
            } else {
              console.log('[Service Worker] Nicht im Cache, warte auf Netzwerk:', event.request.url);
              return fetchPromise;
            }
          })
      );
    } else {
      // Cache First für andere Ressourcen (Bilder, Icons, etc.)
      event.respondWith(
        caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              console.log('[Service Worker] Liefere aus Cache:', event.request.url);
              return cachedResponse;
            }
            
            console.log('[Service Worker] Nicht im Cache, versuche Netzwerk:', event.request.url);
            return fetch(event.request)
              .then(response => {
                if (!response || response.status !== 200) {
                  return response;
                }
                
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                  .then(cache => {
                    cache.put(event.request, responseToCache);
                    console.log('[Service Worker] Neue Ressource gecacht:', event.request.url);
                  });
                  
                return response;
              })
              .catch(error => {
                console.error('[Service Worker] Fetch fehlgeschlagen:', error);
                return new Response('Offline: Ressource nicht verfügbar', {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: new Headers({
                    'Content-Type': 'text/plain'
                  })
                });
              });
          })
      );
    }
  }
});

/**
 * Message-Handler für Kommunikation mit der App
 */
self.addEventListener('message', event => {
  console.log('[Service Worker] Message erhalten:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] SKIP_WAITING angefordert');
    self.skipWaiting();
  }
  
  // Antwort an Client senden
  if (event.ports && event.ports[0]) {
    event.ports[0].postMessage({
      type: 'SW_MESSAGE_RECEIVED',
      originalType: event.data?.type
    });
  }
});