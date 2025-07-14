// Service Worker für Hummelzähler PWA
const CACHE_NAME = 'hummelzaehler-v1.0.14';
const CACHE_VERSION = '1.0.14';

// Alle Ressourcen, die für die Offline-Funktionalität benötigt werden
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './js/constants.js',
  './js/storage.js',
  './js/timer.js',
  './js/species-manager.js',
  './js/session-manager.js',
  './js/distance-tracker.js',
  './js/ui-navigation.js',
  './js/app-updater.js'
];

/**
 * Service Worker Installation
 * Beim Installieren werden alle Ressourcen in den Cache geladen
 */
self.addEventListener('install', event => {
  console.log('[Service Worker] Installation gestartet');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cache geöffnet:', CACHE_NAME);
        console.log('[Service Worker] Caching assets:', ASSETS_TO_CACHE);
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[Service Worker] Alle Ressourcen erfolgreich gecacht');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Fehler beim Cachen:', error);
        throw error;
      })
  );
});

/**
 * Service Worker Aktivierung
 * Beim Aktivieren werden alte Caches gelöscht
 */
self.addEventListener('activate', event => {
  console.log('[Service Worker] Aktivierung gestartet');
  
  event.waitUntil(
    Promise.all([
      // Lösche alte Caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Lösche alten Cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Übernimm sofort die Kontrolle über alle Clients
      self.clients.claim()
    ]).then(() => {
      console.log('[Service Worker] Aktivierung abgeschlossen, Cache:', CACHE_NAME);
      // Benachrichtige alle Clients über die Aktivierung
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            cacheName: CACHE_NAME,
            version: CACHE_VERSION
          });
        });
      });
    })
  );
});

/**
 * Fetch-Event-Handler für Netzwerkanfragen
 * Implementiert Cache First Strategie für bessere Offline-Funktionalität
 */
self.addEventListener('fetch', event => {
  // Nur GET-Requests abfangen
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  
  // Nur Requests der eigenen Domain abfangen
  if (url.origin !== location.origin) {
    return;
  }

  console.log('[Service Worker] Fetch:', url.pathname);

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Cache Hit - gib gecachte Version zurück
        if (cachedResponse) {
          console.log('[Service Worker] Cache Hit:', url.pathname);
          return cachedResponse;
        }

        // Cache Miss - versuche Netzwerk
        console.log('[Service Worker] Cache Miss, versuche Netzwerk:', url.pathname);
        return fetch(event.request)
          .then(response => {
            // Prüfe ob Response gültig ist
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone Response für Cache
            const responseToCache = response.clone();
            
            // Füge zum Cache hinzu
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
                console.log('[Service Worker] Neue Ressource gecacht:', url.pathname);
              })
              .catch(error => {
                console.error('[Service Worker] Fehler beim Cachen:', error);
              });

            return response;
          })
          .catch(error => {
            console.error('[Service Worker] Netzwerk-Fehler:', error);
            
            // Fallback für HTML-Requests
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('./index.html');
            }
            
            // Für andere Requests, gib Fehler zurück
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
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[Service Worker] Cache-Löschung angefordert');
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log('[Service Worker] Lösche Cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('[Service Worker] Alle Caches gelöscht');
        // Benachrichtige Client über erfolgreiche Cache-Löschung
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'CACHE_CLEARED'
            });
          });
        });
      })
    );
  }
  
  // Antwort an Client senden
  if (event.ports && event.ports[0]) {
    event.ports[0].postMessage({
      type: 'SW_MESSAGE_RECEIVED',
      originalType: event.data?.type
    });
  }
});