// Haupt-App-Datei - Orchestrator für alle Module
// Hummelzähler Progressive Web App

// Module importieren
import { defaultBumblebees, APP_CONFIG, APP_PAGES, TIMER_STATES } from './js/constants.js';
import { 
    loadBumblebeesFromStorage, 
    loadEnvironmentalDataFromStorage,
    saveEnvironmentalDataToStorage 
} from './js/storage.js';
import { Timer, updateTimerDisplay } from './js/timer.js';
import { SpeciesManager, renderSpeciesList, renderCustomSpeciesSelect, updateDeleteButton } from './js/species-manager.js';
import { SessionManager, renderSessionsList } from './js/session-manager.js';
import { AppUpdater } from './js/app-updater.js';
import { DistanceTracker, updateDistanceVisualization } from './js/distance-tracker.js';
import { UINavigation, getElementById, addEventListener, onDOMReady } from './js/ui-navigation.js';

// App-Klasse als Hauptorchestrator
class HummelzaehlerApp {
    constructor() {
        // Module initialisieren
        this.timer = new Timer();
        this.speciesManager = new SpeciesManager();
        this.sessionManager = new SessionManager();
        this.appUpdater = new AppUpdater();
        this.distanceTracker = new DistanceTracker();
        this.uiNavigation = new UINavigation();
        
        // DOM-Elemente
        this.elements = {};
        
        // App-Status
        this.environmentalData = {
            windStrength: 0,
            temperature: null,
            cloudCover: 0
        };
        
        // Session-Bearbeitung
        this.editingSession = null;
    }

    // App initialisieren
    async init() {
        try {
            // DOM-Elemente sammeln
            this.collectDOMElements();
            
            // Module konfigurieren
            this.setupModules();
            
            // Event-Listener registrieren
            this.setupEventListeners();
            
            // Daten laden
            await this.loadData();
            
            // UI initialisieren
            this.initializeUI();
            
            // App-Update-System starten
            await this.appUpdater.init();
            
            console.log('Hummelzähler-App erfolgreich initialisiert');
            
        } catch (error) {
            console.error('Fehler beim Initialisieren der App:', error);
        }
    }

    // DOM-Elemente sammeln
    collectDOMElements() {
        this.elements = {
            // Seiten
            homePage: getElementById('home-page'),
            countingPage: getElementById('counting-page'),
            
            // Navigation
            newCountingButton: getElementById('new-counting-button'),
            
            // Timer und Zählung
            timerElement: getElementById('timer'),
            startCountingButton: getElementById('start-counting-button'),
            pauseButton: getElementById('pause-button'),
            cancelButton: getElementById('cancel-button'),
            saveButton: getElementById('save-button'),
            countingStatus: getElementById('counting-status'),
            
            // Arten-Verwaltung
            bumblebeeList: getElementById('bumblebee-list'),
            addBumblebeeButton: getElementById('add-bumblebee'),
            customSpeciesSelect: getElementById('custom-species-select'),
            deleteSpeciesButton: getElementById('delete-species-button'),
            
            // Umweltdaten
            windStrengthInput: getElementById('wind-strength'),
            temperatureInput: getElementById('temperature'),
            cloudCoverInput: getElementById('cloud-cover'),
            saveEnvironmentalDataButton: getElementById('save-environmental-data'),
            
            // Sessions
            showSessionsButton: getElementById('show-sessions'),
            sessionsListElement: getElementById('sessions-list'),
            
            // Distanz-Tracking
            distanceTrackingElement: getElementById('distance-tracking'),
            targetDistanceElement: getElementById('target-distance'),
            targetPositionElement: getElementById('target-position'),
            
            // App-Version und Cache
            appVersion: getElementById('app-version'),
            clearCacheButton: getElementById('clear-cache-button')
        };
        
        // Elemente an UI-Navigation übergeben
        this.uiNavigation.setElements(this.elements);
    }

    // Module konfigurieren
    setupModules() {
        // DistanceTracker mit Timer-Referenz konfigurieren
        this.distanceTracker.setTimer(this.timer);
        
        // DistanceTracker Update-Callback setzen
        this.distanceTracker.setOnUpdate((distance, progress) => {
            updateDistanceVisualization(
                this.elements.targetDistanceElement,
                this.elements.targetPositionElement,
                distance,
                progress
            );
        });
        
        // Timer-Events
        this.timer.setOnTick((timeLeft) => {
            updateTimerDisplay(this.elements.timerElement, this.timer);
            // Distanz-Tracking wird jetzt automatisch vom DistanceTracker selbst aktualisiert
        });
        
        this.timer.setOnFinish(() => {
            this.handleTimerFinished();
        });
        
        this.timer.setOnStateChange((state) => {
            this.handleTimerStateChange(state);
        });
        
        // Arten-Manager-Events
        this.speciesManager.setOnUpdate(() => {
            this.updateSpeciesUI();
        });
        
        // Session-Manager-Events
        this.sessionManager.setOnSessionsUpdate(() => {
            renderSessionsList(this.elements.sessionsListElement, this.sessionManager);
        });
        
        // UI-Navigation-Events
        this.uiNavigation.setOnPageChange((page) => {
            this.handlePageChange(page);
        });
        
        // App-Updater-Events (nur für Versionsanzeige)
        this.appUpdater.setOnStatusChange((status) => {
            this.handleVersionUpdate(status);
        });
    }

    // Event-Listener registrieren
    setupEventListeners() {
        // Navigation
        addEventListener(this.elements.newCountingButton, 'click', () => {
            this.uiNavigation.showCountingPage();
        });
        
        // Timer-Steuerung
        addEventListener(this.elements.startCountingButton, 'click', () => {
            this.handleStartButtonClick();
        });
        
        addEventListener(this.elements.pauseButton, 'click', () => {
            this.timer.toggle();
        });
        
        addEventListener(this.elements.cancelButton, 'click', () => {
            this.cancelCounting();
        });
        
        addEventListener(this.elements.saveButton, 'click', () => {
            this.saveCounting();
        });
        
        // Arten-Verwaltung
        addEventListener(this.elements.addBumblebeeButton, 'click', () => {
            this.addNewSpecies();
        });
        
        addEventListener(this.elements.customSpeciesSelect, 'change', () => {
            updateDeleteButton(this.elements.deleteSpeciesButton, this.elements.customSpeciesSelect);
        });
        
        addEventListener(this.elements.deleteSpeciesButton, 'click', () => {
            this.deleteCustomSpecies();
        });
        
        // Umweltdaten
        addEventListener(this.elements.windStrengthInput, 'change', () => {
            this.saveEnvironmentalData();
        });
        
        addEventListener(this.elements.temperatureInput, 'change', () => {
            this.saveEnvironmentalData();
        });
        
        addEventListener(this.elements.cloudCoverInput, 'change', () => {
            this.saveEnvironmentalData();
        });
        
        addEventListener(this.elements.saveEnvironmentalDataButton, 'click', () => {
            this.saveEnvironmentalDataWithFeedback();
        });
        
        // Sessions
        addEventListener(this.elements.showSessionsButton, 'click', () => {
            this.showSessionsOverview();
        });
        
        
        // Session-Liste Event-Delegation
        addEventListener(this.elements.sessionsListElement, 'click', (event) => {
            this.handleSessionListClick(event);
        });
        
        // Cache leeren
        addEventListener(this.elements.clearCacheButton, 'click', () => {
            this.handleClearCacheClick();
        });
    }

    // Daten laden
    async loadData() {
        // Arten aus Storage laden
        const savedSpecies = loadBumblebeesFromStorage();
        this.speciesManager.setSpecies(savedSpecies);
        
        // Umweltdaten laden
        this.environmentalData = loadEnvironmentalDataFromStorage();
        this.updateEnvironmentalDataUI();
    }

    // UI initialisieren
    initializeUI() {
        // Startseite anzeigen
        this.uiNavigation.showHomePage();
        
        // Sessions-Liste rendern
        renderSessionsList(this.elements.sessionsListElement, this.sessionManager);
        
        // Arten-Dropdown aktualisieren
        renderCustomSpeciesSelect(this.elements.customSpeciesSelect, this.speciesManager);
        updateDeleteButton(this.elements.deleteSpeciesButton, this.elements.customSpeciesSelect);
        
        // Tab-Switching initialisieren
        this.uiNavigation.initTabSwitching();
        
        // Timer-Display initialisieren
        updateTimerDisplay(this.elements.timerElement, this.timer);
    }

    // Timer-Zustandsänderung behandeln
    handleTimerStateChange(state) {
        switch (state) {
            case TIMER_STATES.RUNNING:
                this.uiNavigation.updateCountingButtons('running', this.editingSession !== null);
                this.distanceTracker.start();
                break;
                
            case TIMER_STATES.PAUSED:
                this.uiNavigation.updateCountingButtons('paused', this.editingSession !== null);
                break;
                
            case TIMER_STATES.STOPPED:
                this.uiNavigation.updateCountingButtons('ready', this.editingSession !== null);
                this.distanceTracker.stop();
                break;
                
            case TIMER_STATES.FINISHED:
                this.uiNavigation.updateCountingButtons('finished', this.editingSession !== null);
                this.distanceTracker.stop();
                break;
        }
        
        updateTimerDisplay(this.elements.timerElement, this.timer);
    }

    // Timer beendet
    handleTimerFinished() {
        this.uiNavigation.showMessage('Zeit abgelaufen! Du kannst jetzt noch Arten nachtragen und dann speichern.');
    }

    // Seitenwechsel behandeln
    handlePageChange(page) {
        if (page === APP_PAGES.HOME) {
            // Timer stoppen falls läuft
            if (this.timer.isRunning()) {
                this.timer.stop();
            }
            this.resetCountingState();
            this.editingSession = null; // Bearbeitungsmodus beenden
        } else if (page === APP_PAGES.COUNTING) {
            this.prepareCountingPage();
        }
    }

    // Start-Button-Klick behandeln (unterscheidet zwischen neuer Zählung und Fortsetzen)
    handleStartButtonClick() {
        if (this.editingSession) {
            // Bei Session-Bearbeitung: Timer fortsetzen ohne Zähler zurückzusetzen
            this.resumeCounting();
        } else {
            // Neue Zählung starten
            this.startCounting();
        }
    }

    // Zählung starten (neue Zählung)
    startCounting() {
        // Arten-Zähler zurücksetzen
        this.speciesManager.resetAllCounts();
        
        // Timer starten
        this.timer.start();
        
        // Arten-Liste neu rendern
        this.updateSpeciesUI();
    }

    // Zählung fortsetzen (bei Session-Bearbeitung)
    resumeCounting() {
        // Timer fortsetzen ohne Zähler zurückzusetzen
        // Bei Session-Bearbeitung ist der Timer immer im PAUSED Status
        this.timer.resume();
        
        // Arten-Liste neu rendern (ohne Zähler zurückzusetzen)
        this.updateSpeciesUI();
    }

    // Zählung abbrechen
    cancelCounting() {
        let confirmMessage = 'Möchtest du die Zählung wirklich abbrechen? Alle Daten gehen verloren.';
        
        if (this.editingSession) {
            confirmMessage = 'Möchtest du die Bearbeitung wirklich abbrechen? Alle Änderungen gehen verloren.';
        }
        
        if (this.timer.isRunning() || this.timer.isFinished() || this.editingSession) {
            if (this.uiNavigation.showConfirmDialog(confirmMessage)) {
                this.editingSession = null; // Bearbeitungsmodus beenden
                this.uiNavigation.showHomePage();
            }
        } else {
            this.editingSession = null; // Bearbeitungsmodus beenden
            this.uiNavigation.showHomePage();
        }
    }

    // Zählung speichern
    saveCounting() {
        try {
            if (this.editingSession) {
                // Session-Bearbeitung speichern
                this.updateExistingSession();
            } else if (this.timer.isFinished() || this.timer.isPaused() || this.timer.isRunning()) {
                // Neue Zählung speichern (auch bei pausiert/laufend)
                const isComplete = this.timer.isFinished();
                const elapsedTime = this.timer.getElapsedTime();
                
                const sessionData = this.sessionManager.saveCountingSession(
                    this.speciesManager.getSpeciesCopy(),
                    this.timer.getSessionStartTime(),
                    this.environmentalData,
                    isComplete,
                    elapsedTime
                );
            }
            
            this.uiNavigation.showMessage('Zählung wurde gespeichert.');
            this.editingSession = null; // Bearbeitungsmodus beenden
            this.uiNavigation.showHomePage();
            
        } catch (error) {
            console.error('Fehler beim Speichern:', error);
            this.uiNavigation.showMessage('Fehler beim Speichern der Zählung: ' + error.message);
        }
    }

    // Zählungsseite vorbereiten
    prepareCountingPage() {
        if (!this.editingSession) {
            this.resetCountingState();
        } else {
            // Bei Session-Bearbeitung: Buttons entsprechend setzen
            this.uiNavigation.updateCountingButtons('ready', true);
        }
        this.updateSpeciesUI();
    }

    // Zählungsstatus zurücksetzen
    resetCountingState() {
        this.timer.stop();
        this.speciesManager.resetAllCounts();
        this.uiNavigation.updateCountingButtons('ready');
    }

    // Neue Art hinzufügen
    addNewSpecies() {
        const newName = this.uiNavigation.showInputDialog('Name der neuen Hummelart:');
        if (newName && newName.trim() !== '') {
            const newSpecies = this.speciesManager.addNewSpecies(newName.trim());
            if (newSpecies) {
                this.updateSpeciesUI();
                renderCustomSpeciesSelect(this.elements.customSpeciesSelect, this.speciesManager);
            }
        }
    }

    // Benutzerdefinierte Art löschen
    deleteCustomSpecies() {
        const selectedId = parseInt(this.elements.customSpeciesSelect.value);
        if (!selectedId) return;
        
        const species = this.speciesManager.getSpeciesById(selectedId);
        if (!species) return;
        
        if (this.uiNavigation.showConfirmDialog(`Möchtest du die Art "${species.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
            const deleted = this.speciesManager.deleteSpecies(selectedId);
            if (deleted) {
                this.updateSpeciesUI();
                renderCustomSpeciesSelect(this.elements.customSpeciesSelect, this.speciesManager);
                this.uiNavigation.showMessage(`Die Art "${deleted.name}" wurde erfolgreich gelöscht.`);
            }
        }
    }

    // Arten-UI aktualisieren
    updateSpeciesUI() {
        renderSpeciesList(this.elements.bumblebeeList, this.speciesManager);
    }

    // Umweltdaten speichern
    saveEnvironmentalData() {
        this.environmentalData = {
            windStrength: parseInt(this.elements.windStrengthInput.value) || 0,
            temperature: parseFloat(this.elements.temperatureInput.value) || null,
            cloudCover: parseInt(this.elements.cloudCoverInput.value) || 0
        };
        saveEnvironmentalDataToStorage(this.environmentalData);
    }

    // Umweltdaten mit Feedback speichern
    saveEnvironmentalDataWithFeedback() {
        this.saveEnvironmentalData();
        this.uiNavigation.showEnvironmentalDataFeedback();
    }

    // Umweltdaten-UI aktualisieren
    updateEnvironmentalDataUI() {
        if (this.elements.windStrengthInput) {
            this.elements.windStrengthInput.value = this.environmentalData.windStrength || 0;
        }
        if (this.elements.temperatureInput) {
            this.elements.temperatureInput.value = this.environmentalData.temperature || '';
        }
        if (this.elements.cloudCoverInput) {
            this.elements.cloudCoverInput.value = this.environmentalData.cloudCover || 0;
        }
    }

    // Sessions-Übersicht anzeigen
    showSessionsOverview() {
        try {
            const message = this.sessionManager.exportAllSessionsAsCSV();
            this.uiNavigation.showMessage(message);
        } catch (error) {
            this.uiNavigation.showMessage(error.message);
        }
    }

    // Session-Liste-Klick behandeln
    handleSessionListClick(event) {
        const target = event.target;
        const sessionId = target.dataset.sessionId;
        
        if (!sessionId) return;
        
        if (target.classList.contains('edit-button')) {
            this.editSession(sessionId);
            
        } else if (target.classList.contains('detail-button')) {
            const details = this.sessionManager.formatSessionDetails(sessionId);
            this.uiNavigation.showMessage(details);
            
        } else if (target.classList.contains('delete-button')) {
            const displayDate = target.dataset.displayDate;
            if (this.uiNavigation.showConfirmDialog(`Möchtest du die Zählung vom ${displayDate} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
                if (this.sessionManager.deleteSession(sessionId)) {
                    this.uiNavigation.showMessage('Zählung erfolgreich gelöscht.');
                } else {
                    this.uiNavigation.showMessage('Fehler beim Löschen der Zählung.');
                }
            }
        }
    }

    // Session bearbeiten
    editSession(sessionId) {
        try {
            const session = this.sessionManager.getSessionDetails(sessionId);
            if (!session) {
                this.uiNavigation.showMessage('Zählung nicht gefunden.');
                return;
            }

            // Timer pausieren falls er läuft
            if (this.timer.isRunning()) {
                this.timer.pause();
            }

            // Session für Bearbeitung setzen
            this.editingSession = session;

            // Timer mit verbleibender Zeit setzen (falls vorhanden)
            if (session.remainingTime !== undefined && session.remainingTime > 0) {
                // Timer stoppen und verbleibende Zeit manuell setzen
                this.timer.stop();
                this.timer.timeLeft = Math.ceil(session.remainingTime / 1000); // Millisekunden zu Sekunden
                this.timer.state = TIMER_STATES.PAUSED; // Als pausiert markieren, damit resume() funktioniert
                // Session-Startzeit für Distanz-Tracking setzen
                this.timer.sessionStartTime = new Date(session.startTime);
                
                // Timer-State-Change-Event auslösen für korrekte Button-Anzeige
                if (this.timer.onStateChange) {
                    this.timer.onStateChange(this.timer.state);
                }
            } else if (session.isComplete === false) {
                // Fallback für ältere Sessions ohne remainingTime - als beendet markieren
                this.timer.stop();
                this.timer.timeLeft = 0;
                this.timer.state = TIMER_STATES.FINISHED;
                this.timer.sessionStartTime = new Date(session.startTime);
                
                if (this.timer.onStateChange) {
                    this.timer.onStateChange(this.timer.state);
                }
            } else {
                // Vollständige Session - Timer zurücksetzen
                this.timer.stop();
                this.timer.sessionStartTime = new Date(session.startTime);
            }
            
            // Timer-Display aktualisieren
            updateTimerDisplay(this.elements.timerElement, this.timer);
            
            // Distanz-Tracking für bearbeitete Session aktualisieren
            if (session.elapsedTime) {
                const distance = this.distanceTracker.getCurrentDistance(session.elapsedTime);
                const progress = this.distanceTracker.getCurrentProgress(session.elapsedTime);
                updateDistanceVisualization(
                    this.elements.targetDistanceElement,
                    this.elements.targetPositionElement,
                    distance,
                    progress
                );
            }

            // Arten-Daten aus der Session laden
            this.speciesManager.setSpecies(session.bumblebees);

            // Zur Zählungsseite wechseln
            this.uiNavigation.showCountingPage();

        } catch (error) {
            console.error('Fehler beim Laden der Session:', error);
            this.uiNavigation.showMessage('Fehler beim Laden der Zählung: ' + error.message);
        }
    }

    // Bestehende Session aktualisieren
    updateExistingSession() {
        if (!this.editingSession) return;

        // Aktualisierte Arten-Daten
        const updatedSpecies = this.speciesManager.getSpeciesCopy();
        
        // Gesamtanzahl neu berechnen
        const totalCount = updatedSpecies.reduce((sum, bee) => sum + bee.count, 0);

        // Timer-Daten aktualisieren
        const currentElapsedTime = this.timer.getElapsedTime();
        const currentRemainingTime = this.timer.getTimeLeft() * 1000; // Sekunden zu Millisekunden
        const isComplete = this.timer.isFinished();

        // Session-Daten aktualisieren
        this.editingSession.bumblebees = updatedSpecies;
        this.editingSession.totalCount = totalCount;
        this.editingSession.elapsedTime = currentElapsedTime;
        this.editingSession.remainingTime = currentRemainingTime;
        this.editingSession.isComplete = isComplete;

        // In Storage speichern
        const success = this.sessionManager.updateSession(this.editingSession.id, this.editingSession);
        
        if (!success) {
            throw new Error('Fehler beim Aktualisieren der Session.');
        }
    }

    // Versions-Update behandeln (nur Anzeige)
    handleVersionUpdate(status) {
        // Nur die Version anzeigen
        if (this.elements.appVersion && status.appVersion) {
            this.elements.appVersion.textContent = status.appVersion;
        }
    }

    // Cache-Löschen-Button behandeln
    async handleClearCacheClick() {
        const button = this.elements.clearCacheButton;
        
        // Button deaktivieren und Loading-Status anzeigen
        button.disabled = true;
        button.innerHTML = '⏳ Cache wird geleert...';
        
        try {
            // Service Worker über Cache-Löschung informieren
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'CLEAR_CACHE'
                });
                console.log('Cache-Löschung an Service Worker gesendet');
            }
            
            // Zusätzlich direkt alle Caches löschen
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                console.log('Lösche Caches direkt:', cacheNames);
                await Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
                console.log('Alle Caches wurden direkt gelöscht');
            }
            
            // Service Worker neu registrieren für frischen Start
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    await registration.unregister();
                    console.log('Service Worker deregistriert');
                    
                    // Neu registrieren
                    await navigator.serviceWorker.register('service-worker.js', {
                        scope: './'
                    });
                    console.log('Service Worker neu registriert');
                }
            }
            
            // Erfolgs-Feedback
            button.innerHTML = '✅ Cache geleert!';
            this.uiNavigation.showMessage('Cache wurde erfolgreich geleert. Die Seite wird neu geladen.');
            
            // Nach kurzer Zeit Seite neu laden mit Hard Refresh
            setTimeout(() => {
                window.location.reload(true);
            }, 1500);
            
        } catch (error) {
            console.error('Fehler beim Cache leeren:', error);
            button.innerHTML = '❌ Fehler!';
            this.uiNavigation.showMessage('Fehler beim Leeren des Caches: ' + error.message);
            
            // Button nach Fehler zurücksetzen
            setTimeout(() => {
                button.disabled = false;
                button.innerHTML = '🗑️ Cache leeren';
            }, 2000);
        }
    }
}

// App-Instanz erstellen und starten
const app = new HummelzaehlerApp();

// App beim DOM-Ready starten
onDOMReady(async () => {
    await app.init();
});

// App-Instanz global verfügbar machen für Debugging
window.hummelzaehlerApp = app;
