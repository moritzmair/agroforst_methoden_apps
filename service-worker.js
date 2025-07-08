const CACHE_NAME = 'hummelzaehler-offline-v2';

// Alle Ressourcen, die für die Offline-Funktionalität benötigt werden
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon.svg'
];

/**
 * Service Worker Installation
 * Beim Installieren werden alle Ressourcen in den Cache geladen
 */
self.addEventListener('install', event => {
  console.log('[Service Worker] Installation');
  
  // Sofort aktivieren, ohne auf das Schließen aller Tabs zu warten
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Alle Ressourcen werden gecacht');
        return cache.addAll(ASSETS_TO_CACHE);
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
  
  // Übernimm sofort die Kontrolle über alle Clients
  event.waitUntil(self.clients.claim());
  
  // Lösche alte Caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Alter Cache wird gelöscht:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

/**
 * Fetch-Event-Handler für Netzwerkanfragen
 * Implementiert verschiedene Strategien je nach Ressourcentyp
 */
self.addEventListener('fetch', event => {
  console.log('[Service Worker] Fetch:', event.request.url);
  
  // Network First für HTML-Dateien (für schnellere Updates)
  if (event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Wenn Netzwerk verfügbar, speichere im Cache und gib zurück
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
                console.log('[Service Worker] HTML aus Netzwerk gecacht:', event.request.url);
              });
            return response;
          }
          return response;
        })
        .catch(() => {
          // Fallback auf Cache wenn Netzwerk nicht verfügbar
          console.log('[Service Worker] Netzwerk nicht verfügbar, verwende Cache für HTML');
          return caches.match(event.request)
            .then(cachedResponse => {
              return cachedResponse || caches.match('./index.html');
            });
        })
    );
  } else {
    // Cache First für andere Ressourcen (CSS, JS, Bilder)
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          // Wenn die Ressource im Cache gefunden wurde, gib sie zurück
          if (cachedResponse) {
            console.log('[Service Worker] Liefere aus Cache:', event.request.url);
            return cachedResponse;
          }
          
          // Wenn nicht im Cache, versuche es über das Netzwerk
          console.log('[Service Worker] Nicht im Cache, versuche Netzwerk:', event.request.url);
          
          return fetch(event.request)
            .then(response => {
              // Prüfe, ob wir eine gültige Antwort erhalten haben
              if (!response || response.status !== 200) {
                return response;
              }
              
              // Speichere eine Kopie der Antwort im Cache
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
              
              // Für andere Ressourcen gib einen leeren Response zurück
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
});

/**
 * Message-Handler für Kommunikation mit der App
 */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});