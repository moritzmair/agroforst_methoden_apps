// App-Update-Funktionalität

import { APP_CONFIG } from './constants.js';
import { saveLastUpdateCheck, loadLastUpdateCheck } from './storage.js';

export class AppUpdater {
    constructor() {
        this.isOnline = navigator.onLine;
        this.lastUpdateCheck = null;
        this.updateAvailable = false;
        this.appVersion = null;
        this.onStatusChange = null;
        this.updateCheckInterval = null;
    }

    // Event-Handler setzen
    setOnStatusChange(callback) {
        this.onStatusChange = callback;
    }

    // Initialisierung
    async init() {
        // App-Version laden
        await this.loadAppVersion();
        
        // Letzten Update-Check laden
        this.lastUpdateCheck = loadLastUpdateCheck();
        
        // Online/Offline Status überwachen
        window.addEventListener('online', () => this.handleOnlineStatus());
        window.addEventListener('offline', () => this.handleOfflineStatus());
        
        // Service Worker Updates überwachen
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                this.updateAvailable = true;
                this.notifyStatusChange();
            });
        }
        
        // Benachrichtigungserlaubnis anfordern
        await this.requestNotificationPermission();
        
        // Automatische Update-Prüfung starten
        setTimeout(() => this.checkForUpdatesOnStartup(), APP_CONFIG.STARTUP_UPDATE_DELAY);
        
        this.notifyStatusChange();
    }

    // App-Version aus manifest.json laden
    async loadAppVersion() {
        try {
            const response = await fetch('./manifest.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const manifest = await response.json();
            this.appVersion = manifest.version;
            console.log('App-Version geladen:', this.appVersion);
            return this.appVersion;
        } catch (error) {
            console.error('Fehler beim Laden der App-Version:', error);
            // Fallback-Version falls manifest.json nicht geladen werden kann
            this.appVersion = '1.0.0';
            return this.appVersion;
        }
    }

    // Benachrichtigungserlaubnis anfordern
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                const permission = await Notification.requestPermission();
                console.log('Benachrichtigungserlaubnis:', permission);
            } catch (error) {
                console.log('Fehler beim Anfordern der Benachrichtigungserlaubnis:', error);
            }
        }
    }

    // Online-Status-Handler
    handleOnlineStatus() {
        this.isOnline = true;
        this.notifyStatusChange();
    }

    // Offline-Status-Handler
    handleOfflineStatus() {
        this.isOnline = false;
        this.notifyStatusChange();
    }

    // Update-Check beim Start
    async checkForUpdatesOnStartup() {
        if (!this.isOnline) {
            this.notifyStatusChange();
            return;
        }
        
        await this.performUpdateCheck();
        
        // Starte automatische Update-Prüfung
        this.updateCheckInterval = setInterval(async () => {
            if (this.isOnline && !this.updateAvailable) {
                console.log('Automatische Update-Prüfung...');
                await this.performUpdateCheck();
            }
        }, APP_CONFIG.UPDATE_CHECK_INTERVAL);
    }


    // Update-Check durchführen
    async performUpdateCheck() {
        try {
            this.lastUpdateCheck = new Date();
            saveLastUpdateCheck(this.lastUpdateCheck);
            
            // Prüfe auf neue Version in der Manifest-Datei
            const manifestUpdateAvailable = await this.checkManifestVersion();
            
            // Prüfe auf Service Worker Updates
            let serviceWorkerUpdateAvailable = false;
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    await registration.update();
                    
                    // Prüfe, ob ein neuer Service Worker wartet
                    if (registration.waiting) {
                        serviceWorkerUpdateAvailable = true;
                    }
                }
            }
            
            // Update ist verfügbar, wenn entweder Manifest oder Service Worker aktualisiert wurden
            this.updateAvailable = manifestUpdateAvailable || serviceWorkerUpdateAvailable;
            
            // Automatisches Update durchführen wenn verfügbar
            if (this.updateAvailable) {
                console.log('Update verfügbar - starte automatisches Update...');
                await this.performAppUpdate();
            }
            
            this.notifyStatusChange();
            
        } catch (error) {
            console.log('Update-Check fehlgeschlagen:', error);
            this.notifyStatusChange();
        }
    }

    // Manifest-Version prüfen
    async checkManifestVersion() {
        try {
            // 1. Lade die gecachte Version (aus dem Service Worker Cache)
            let cachedVersion = null;
            if ('caches' in window) {
                try {
                    const cacheNames = await caches.keys();
                    for (const cacheName of cacheNames) {
                        const cache = await caches.open(cacheName);
                        const cachedResponse = await cache.match('./manifest.json');
                        if (cachedResponse) {
                            const cachedManifest = await cachedResponse.json();
                            cachedVersion = cachedManifest.version;
                            console.log('Gecachte Version gefunden:', cachedVersion);
                            break;
                        }
                    }
                } catch (error) {
                    console.log('Fehler beim Laden der gecachten Version:', error);
                }
            }
            
            // Fallback: Verwende appVersion falls keine gecachte Version gefunden
            if (!cachedVersion) {
                if (!this.appVersion) {
                    await this.loadAppVersion();
                }
                cachedVersion = this.appVersion;
                console.log('Verwende appVersion als gecachte Version:', cachedVersion);
            }
            
            // 2. Lade die aktuelle Manifest-Datei direkt vom Server (ohne Cache)
            const cacheBustParam = `t=${Date.now()}&_cache_bust=${Math.random().toString(36).substring(7)}`;
            const response = await fetch(`./manifest.json?${cacheBustParam}`, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            if (!response.ok) {
                console.log('Manifest konnte nicht vom Server geladen werden');
                return false;
            }
            
            const serverManifest = await response.json();
            const serverVersion = serverManifest.version;
            
            console.log(`Gecachte Version: ${cachedVersion}, Server Version: ${serverVersion}`);
            
            // 3. Vergleiche Versionen
            if (serverVersion && serverVersion !== cachedVersion) {
                console.log('Neue Version verfügbar! Gecacht:', cachedVersion, '-> Server:', serverVersion);
                return true;
            }
            
            console.log('Keine neue Version verfügbar');
            return false;
            
        } catch (error) {
            console.log('Fehler beim Prüfen der Manifest-Version:', error);
            return false;
        }
    }

    // App-Update durchführen
    async performAppUpdate() {
        try {
            console.log('Starte App-Update...');
            
            // 1. Lösche alle Caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                console.log('Lösche Caches:', cacheNames);
                await Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
                console.log('Alle Caches wurden gelöscht');
            }
            
            // 2. Service Worker Update handhaben
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    // Aktiviere wartenden Service Worker falls vorhanden
                    if (registration.waiting) {
                        console.log('Aktiviere wartenden Service Worker...');
                        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                        
                        // Warte auf Controller-Wechsel
                        await new Promise((resolve) => {
                            const handleControllerChange = () => {
                                navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
                                resolve();
                            };
                            navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
                            
                            // Fallback nach 2 Sekunden
                            setTimeout(resolve, 2000);
                        });
                    }
                    
                    // Forciere Service Worker Update
                    console.log('Forciere Service Worker Update...');
                    await registration.update();
                }
            }
            
            // 3. Update-Status zurücksetzen
            this.updateAvailable = false;
            this.lastUpdateCheck = new Date();
            saveLastUpdateCheck(this.lastUpdateCheck);
            
            console.log('Update abgeschlossen, lade Seite neu...');
            
            // 4. Seite mit starkem Cache-Bypass neu laden
            const url = new URL(window.location.href);
            url.searchParams.set('_t', Date.now());
            url.searchParams.set('_cache_bust', Math.random().toString(36).substring(7));
            
            console.log('Lade Seite neu mit URL:', url.toString());
            window.location.replace(url.toString());
            
            return { success: true, message: 'Update erfolgreich' };
            
        } catch (error) {
            console.error('Fehler beim App-Update:', error);
            return { success: false, message: 'Update fehlgeschlagen', error };
        }
    }

    // Status-Update-Event auslösen
    notifyStatusChange() {
        if (this.onStatusChange) {
            this.onStatusChange({
                isOnline: this.isOnline,
                updateAvailable: this.updateAvailable,
                lastUpdateCheck: this.lastUpdateCheck,
                appVersion: this.appVersion
            });
        }
    }


    // Getter
    getAppVersion() {
        return this.appVersion;
    }

    getUpdateStatus() {
        return {
            isOnline: this.isOnline,
            updateAvailable: this.updateAvailable,
            lastUpdateCheck: this.lastUpdateCheck,
            appVersion: this.appVersion
        };
    }

    // Cleanup
    destroy() {
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval);
        }
    }
}
