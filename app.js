// Standard-Datenstruktur für die Hummeln (diese Arten werden immer angezeigt)
const defaultBumblebees = [
    { id: 1, name: "Ackerhummel", count: 0 },
    { id: 2, name: "Steinhummel", count: 0 },
    { id: 3, name: "Erdhummel", count: 0 },
    { id: 4, name: "Gartenhummel", count: 0 },
    { id: 5, name: "Wiesenhummel", count: 0 },
    { id: 6, name: "Baumhummel", count: 0 },
    { id: 7, name: "Waldhummel", count: 0 },
    { id: 8, name: "andere_Hummel", count: 0 },
    { id: 9, name: "andere_Wildbiene", count: 0 },
    { id: 10, name: "Honigbiene", count: 0 },
    { id: 11, name: "Wespe", count: 0 },
    { id: 12, name: "Schwebfliege", count: 0 },
    { id: 13, name: "unbestimmt", count: 0 }
];

// Aktuelle Hummel-Liste (wird mit Standard-Arten initialisiert)
let bumblebees = [...defaultBumblebees];

// Timer-Variablen
let timerInterval;
let timeLeft = 5 * 60; // 5 Minuten in Sekunden
let isTimerRunning = false;
let isPaused = false;
let sessionStartTime = null; // Zeitpunkt des Zählungsbeginns

// Distanz-Tracking-Variablen
let distanceInterval = null;
let totalDistance = 50; // Zieldistanz in Metern

// DOM-Elemente
const timerElement = document.getElementById('timer');
const bumblebeeList = document.getElementById('bumblebee-list');
const addBumblebeeButton = document.getElementById('add-bumblebee');
const distanceTrackingElement = document.getElementById('distance-tracking');
const targetDistanceElement = document.getElementById('target-distance');
const targetPositionElement = document.getElementById('target-position');
const showSessionsButton = document.getElementById('show-sessions');
const sessionsListElement = document.getElementById('sessions-list');
const customSpeciesSelect = document.getElementById('custom-species-select');
const deleteSpeciesButton = document.getElementById('delete-species-button');

// Umweltdaten DOM-Elemente
const windStrengthInput = document.getElementById('wind-strength');
const temperatureInput = document.getElementById('temperature');
const cloudCoverInput = document.getElementById('cloud-cover');
const saveEnvironmentalDataButton = document.getElementById('save-environmental-data');

// Neue DOM-Elemente für die Seitennavigation
const homePage = document.getElementById('home-page');
const countingPage = document.getElementById('counting-page');
const newCountingButton = document.getElementById('new-counting-button');
const startCountingButton = document.getElementById('start-counting-button');
const pauseButton = document.getElementById('pause-button');
const cancelButton = document.getElementById('cancel-button');
const saveButton = document.getElementById('save-button');
const countingStatus = document.getElementById('counting-status');

// App-Status
let currentPage = 'home'; // 'home' oder 'counting'
let countingFinished = false; // Ob die 5 Minuten abgelaufen sind

// Update-Status
let isOnline = navigator.onLine;
let lastUpdateCheck = null;
let updateAvailable = false;
let APP_VERSION = null; // Wird dynamisch aus manifest.json geladen

// Zentrale Funktion zum Laden der App-Version aus manifest.json
async function loadAppVersion() {
    try {
        const response = await fetch('./manifest.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const manifest = await response.json();
        APP_VERSION = manifest.version;
        console.log('App-Version geladen:', APP_VERSION);
        return APP_VERSION;
    } catch (error) {
        console.error('Fehler beim Laden der App-Version:', error);
        // Fallback-Version falls manifest.json nicht geladen werden kann
        APP_VERSION = '1.0.0';
        return APP_VERSION;
    }
}

// Event-Listener
document.addEventListener('DOMContentLoaded', async () => {
    // App-Version aus manifest.json laden
    await loadAppVersion();
    
    // Daten aus dem lokalen Speicher laden
    loadFromLocalStorage();
    loadEnvironmentalDataFromLocalStorage();
    
    // UI initialisieren
    showHomePage();
    renderSessionsList();
    renderCustomSpeciesSelect();
    initTabSwitching();
    await initAppUpdate();
    
    // Event-Listener für Navigation
    newCountingButton.addEventListener('click', showCountingPage);
    
    // Event-Listener für Zählungsseite
    startCountingButton.addEventListener('click', startTimer);
    pauseButton.addEventListener('click', toggleTimer);
    cancelButton.addEventListener('click', cancelCounting);
    saveButton.addEventListener('click', saveCounting);
    addBumblebeeButton.addEventListener('click', addNewBumblebee);
    
    // Event-Listener für Startseite
    showSessionsButton.addEventListener('click', showSessionsOverview);
    
    // Event-Listener für Arten-Verwaltung
    customSpeciesSelect.addEventListener('change', updateDeleteButton);
    deleteSpeciesButton.addEventListener('click', deleteCustomSpecies);
    
    // Event-Listener für Umweltdaten (automatisches Speichern bei Änderung)
    windStrengthInput.addEventListener('change', saveEnvironmentalDataToLocalStorage);
    temperatureInput.addEventListener('change', saveEnvironmentalDataToLocalStorage);
    cloudCoverInput.addEventListener('change', saveEnvironmentalDataToLocalStorage);
    
    // Event-Listener für manuelles Speichern der Umweltdaten
    saveEnvironmentalDataButton.addEventListener('click', saveEnvironmentalDataWithFeedback);
    
    // Event-Listener für Update-Button
    const updateAppButton = document.getElementById('update-app-button');
    if (updateAppButton) {
        updateAppButton.addEventListener('click', () => {
            if (updateAvailable) {
                performAppUpdate();
            } else {
                manualUpdateCheck();
            }
        });
    }
    
    // Online/Offline Status überwachen
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);
    
    // Automatische Update-Prüfung beim Start
    setTimeout(checkForUpdatesOnStartup, 2000);
});

// Seitennavigation
function showHomePage() {
    currentPage = 'home';
    homePage.classList.remove('hidden');
    countingPage.classList.add('hidden');
    
    // Timer zurücksetzen falls nötig
    if (isTimerRunning) {
        stopTimer();
    }
    resetCountingState();
}

function showCountingPage() {
    currentPage = 'counting';
    homePage.classList.add('hidden');
    countingPage.classList.remove('hidden');
    
    // Zählungsseite vorbereiten
    resetCountingState();
    renderBumblebeeList();
    
    // UI für "bereit zum Zählen" Status
    countingStatus.textContent = 'Bereit zum Zählen';
    startCountingButton.classList.remove('hidden');
    pauseButton.classList.add('hidden');
    saveButton.classList.add('hidden');
}

function cancelCounting() {
    if (isTimerRunning || countingFinished) {
        if (confirm('Möchtest du die Zählung wirklich abbrechen? Alle Daten gehen verloren.')) {
            showHomePage();
        }
    } else {
        // Wenn noch nicht gestartet, direkt zurück
        showHomePage();
    }
}

function saveCounting() {
    if (countingFinished) {
        saveCountingSession();
        alert('Zählung wurde gespeichert.');
        showHomePage();
    }
}

function resetCountingState() {
    timeLeft = 5 * 60;
    updateTimerDisplay();
    sessionStartTime = null;
    countingFinished = false;
    
    // Zähler zurücksetzen
    bumblebees.forEach(bee => {
        bee.count = 0;
    });
    
    // Umweltdaten NICHT zurücksetzen, da sie auf der Startseite eingegeben werden
    // und für alle Zählungen gelten
    
    // UI-Elemente zurücksetzen
    pauseButton.textContent = 'Pausieren';
    pauseButton.classList.add('hidden');
    saveButton.classList.add('hidden');
    startCountingButton.classList.remove('hidden');
    timerElement.classList.remove('timer-active', 'timer-paused');
    
    // Distanz-Tracking verstecken
    stopDistanceTracking();
}

// Funktion zum Rendern der Hummel-Liste
function renderBumblebeeList() {
    bumblebeeList.innerHTML = '';
    
    bumblebees.forEach(bee => {
        const beeItem = document.createElement('div');
        beeItem.className = 'bumblebee-item';
        
        beeItem.innerHTML = `
            <div class="bumblebee-name">${bee.name}</div>
            <div class="counter-controls">
                <button class="counter-button decrement" data-id="${bee.id}">-</button>
                <span class="counter-value">${bee.count}</span>
                <button class="counter-button increment" data-id="${bee.id}">+</button>
            </div>
        `;
        
        bumblebeeList.appendChild(beeItem);
    });
    
    // Event-Listener für die Zähler-Buttons
    document.querySelectorAll('.increment').forEach(button => {
        button.addEventListener('click', () => incrementCount(button.dataset.id));
    });
    
    document.querySelectorAll('.decrement').forEach(button => {
        button.addEventListener('click', () => decrementCount(button.dataset.id));
    });
}

// Funktion zum Erhöhen des Zählers
function incrementCount(id) {
    const beeIndex = bumblebees.findIndex(bee => bee.id == id);
    if (beeIndex !== -1) {
        bumblebees[beeIndex].count++;
        updateCounterDisplay(id, bumblebees[beeIndex].count);
        saveToLocalStorage();
    }
}

// Funktion zum Verringern des Zählers
function decrementCount(id) {
    const beeIndex = bumblebees.findIndex(bee => bee.id == id);
    if (beeIndex !== -1 && bumblebees[beeIndex].count > 0) {
        bumblebees[beeIndex].count--;
        updateCounterDisplay(id, bumblebees[beeIndex].count);
        saveToLocalStorage();
    }
}

// Funktion zum Aktualisieren der Anzeige
function updateCounterDisplay(id, count) {
    const counterElement = document.querySelector(`.counter-button[data-id="${id}"]`)
        .parentElement.querySelector('.counter-value');
    counterElement.textContent = count;
}

// Funktion zum Hinzufügen einer neuen Hummelart
function addNewBumblebee() {
    const newName = prompt('Name der neuen Hummelart:');
    if (newName && newName.trim() !== '') {
        const newId = bumblebees.length > 0 ? Math.max(...bumblebees.map(bee => bee.id)) + 1 : 1;
        bumblebees.push({ id: newId, name: newName.trim(), count: 0 });
        renderBumblebeeList();
        renderCustomSpeciesSelect();
        saveToLocalStorage();
    }
}

// Funktionen für die Verwaltung benutzerdefinierter Arten
function renderCustomSpeciesSelect() {
    // Dropdown leeren
    customSpeciesSelect.innerHTML = '<option value="">Wähle eine Art zum Löschen...</option>';
    
    // Finde alle benutzerdefinierten Arten (nicht in den Standard-Arten enthalten)
    const customSpecies = bumblebees.filter(bee =>
        !defaultBumblebees.some(defaultBee => defaultBee.id === bee.id)
    );
    
    // Füge benutzerdefinierte Arten zum Dropdown hinzu
    customSpecies.forEach(bee => {
        const option = document.createElement('option');
        option.value = bee.id;
        option.textContent = bee.name;
        customSpeciesSelect.appendChild(option);
    });
    
    // Aktualisiere den Zustand des Löschen-Buttons
    updateDeleteButton();
}

function updateDeleteButton() {
    const selectedValue = customSpeciesSelect.value;
    deleteSpeciesButton.disabled = !selectedValue;
}

function deleteCustomSpecies() {
    const selectedId = parseInt(customSpeciesSelect.value);
    if (!selectedId) return;
    
    const beeToDelete = bumblebees.find(bee => bee.id === selectedId);
    if (!beeToDelete) return;
    
    // Bestätigung vom Benutzer
    if (confirm(`Möchtest du die Art "${beeToDelete.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
        // Entferne die Art aus dem Array
        bumblebees = bumblebees.filter(bee => bee.id !== selectedId);
        
        // Aktualisiere die UI
        renderBumblebeeList();
        renderCustomSpeciesSelect();
        saveToLocalStorage();
        
        alert(`Die Art "${beeToDelete.name}" wurde erfolgreich gelöscht.`);
    }
}

// Timer-Funktionen
function toggleTimer() {
    if (!isTimerRunning) {
        // Sollte nicht passieren, da Timer automatisch beim Seitenwechsel startet
        return;
    } else if (isPaused) {
        resumeTimer();
    } else {
        pauseTimer();
    }
}

function startTimer() {
    // Timer zurücksetzen
    timeLeft = 5 * 60;
    updateTimerDisplay();
    countingFinished = false;
    
    // Startzeitpunkt speichern
    sessionStartTime = new Date();
    
    // Zähler zurücksetzen
    bumblebees.forEach(bee => {
        bee.count = 0;
    });
    renderBumblebeeList();
    saveToLocalStorage();
    
    // Timer starten
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            finishTimer();
        }
    }, 1000);
    
    isTimerRunning = true;
    isPaused = false;
    
    // UI aktualisieren
    countingStatus.textContent = 'Zählung läuft';
    startCountingButton.classList.add('hidden');
    pauseButton.classList.remove('hidden');
    pauseButton.textContent = 'Pausieren';
    timerElement.classList.add('timer-active');
    
    // Distanz-Tracking starten
    startDistanceTracking();
}

function pauseTimer() {
    clearInterval(timerInterval);
    isPaused = true;
    countingStatus.textContent = 'Zählung pausiert';
    pauseButton.textContent = 'Fortsetzen';
    timerElement.classList.add('timer-paused');
    
    // Distanz-Tracking pausieren (aber Position beibehalten)
    clearInterval(distanceInterval);
}

function resumeTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            finishTimer();
        }
    }, 1000);
    
    isPaused = false;
    countingStatus.textContent = 'Zählung läuft';
    pauseButton.textContent = 'Pausieren';
    timerElement.classList.remove('timer-paused');
    
    // Distanz-Tracking fortsetzen
    startDistanceTracking();
}

function finishTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    isPaused = false;
    countingFinished = true;
    
    // UI aktualisieren
    countingStatus.textContent = 'Zählung beendet - Speichern möglich';
    pauseButton.classList.add('hidden');
    cancelButton.classList.add('hidden');
    saveButton.classList.remove('hidden');
    timerElement.classList.remove('timer-active', 'timer-paused');
    
    // Distanz-Tracking stoppen
    stopDistanceTracking();
    
    alert('Zeit abgelaufen! Du kannst jetzt noch Arten nachtragen und dann speichern.');
}

function stopTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    isPaused = false;
    countingFinished = false;
    
    // UI zurücksetzen
    pauseButton.classList.remove('hidden');
    cancelButton.classList.remove('hidden');
    saveButton.classList.add('hidden');
    pauseButton.textContent = 'Pausieren';
    timerElement.classList.remove('timer-active', 'timer-paused');
    
    // Distanz-Tracking stoppen
    stopDistanceTracking();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Tab-Wechsel für die Installationsanleitung
function initTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            
            // Aktive Klasse von allen Tabs entfernen
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Aktive Klasse zum ausgewählten Tab hinzufügen
            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Lokaler Speicher
function saveToLocalStorage() {
    try {
        localStorage.setItem('bumblebees', JSON.stringify(bumblebees));
    } catch (error) {
        console.error('Fehler beim Speichern im localStorage:', error);
    }
}

function saveEnvironmentalDataToLocalStorage() {
    try {
        const environmentalData = {
            windStrength: parseInt(windStrengthInput.value) || 0,
            temperature: parseFloat(temperatureInput.value) || null,
            cloudCover: parseInt(cloudCoverInput.value) || 0
        };
        localStorage.setItem('environmentalData', JSON.stringify(environmentalData));
    } catch (error) {
        console.error('Fehler beim Speichern der Umweltdaten:', error);
    }
}

function saveEnvironmentalDataWithFeedback() {
    try {
        saveEnvironmentalDataToLocalStorage();
        alert('Umweltdaten wurden erfolgreich gespeichert.');
    } catch (error) {
        console.error('Fehler beim Speichern der Umweltdaten:', error);
        alert('Fehler beim Speichern der Umweltdaten.');
    }
}

function loadEnvironmentalDataFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('environmentalData');
        if (savedData) {
            const environmentalData = JSON.parse(savedData);
            windStrengthInput.value = environmentalData.windStrength || 0;
            temperatureInput.value = environmentalData.temperature || '';
            cloudCoverInput.value = environmentalData.cloudCover || 0;
        }
    } catch (error) {
        console.error('Fehler beim Laden der Umweltdaten:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const savedBumblebees = localStorage.getItem('bumblebees');
        if (savedBumblebees) {
            const savedData = JSON.parse(savedBumblebees);
            
            // Starte immer mit den Standard-Arten
            bumblebees = [...defaultBumblebees];
            
            // Aktualisiere Zählerstände für Standard-Arten und füge zusätzliche Arten hinzu
            savedData.forEach(savedBee => {
                const existingBeeIndex = bumblebees.findIndex(bee => bee.id === savedBee.id);
                if (existingBeeIndex !== -1) {
                    // Aktualisiere Zählerstand für existierende Standard-Art
                    bumblebees[existingBeeIndex].count = savedBee.count;
                } else {
                    // Füge zusätzliche (benutzerdefinierte) Art hinzu
                    bumblebees.push(savedBee);
                }
            });
        }
    } catch (error) {
        console.error('Fehler beim Laden aus dem localStorage:', error);
        // Bei Fehler: Verwende Standard-Arten
        bumblebees = [...defaultBumblebees];
    }
}

// Distanz-Tracking-Funktionen
function startDistanceTracking() {
    // Zeige das Tracking-Element an (ist auf der Zählungsseite immer sichtbar)
    
    // Aktualisiere die Anzeige jede Sekunde
    distanceInterval = setInterval(() => {
        updateDistanceVisualization();
    }, 1000);
}

function stopDistanceTracking() {
    clearInterval(distanceInterval);
    targetDistanceElement.textContent = '0';
    targetPositionElement.style.width = '0%';
}

// Aktualisiert die Visualisierung der Sollposition
function updateDistanceVisualization() {
    // Berechne, wo man sein sollte (basierend auf der verstrichenen Zeit)
    const elapsedTime = (5 * 60) - timeLeft;
    const targetDistance = (elapsedTime / (5 * 60)) * totalDistance;
    
    // Aktualisiere die Anzeige
    targetDistanceElement.textContent = targetDistance.toFixed(1);
    
    // Aktualisiere die Positionsanzeige (in Prozent)
    const targetPercent = (targetDistance / totalDistance) * 100;
    targetPositionElement.style.width = `${Math.min(targetPercent, 100)}%`;
}


// Funktionen für Speicherstände
function saveCountingSession() {
    if (!sessionStartTime) {
        alert('Fehler: Keine Startzeit der Session gefunden.');
        return;
    }
    
    // Erstelle einen eindeutigen Schlüssel basierend auf dem Startzeitpunkt
    const sessionKey = `session_${sessionStartTime.getTime()}`;
    
    // Formatiere das Datum für die Anzeige
    const displayDate = formatSessionDate(sessionStartTime);
    
    // Berechne die Gesamtanzahl der gezählten Tiere
    const totalCount = bumblebees.reduce((sum, bee) => sum + bee.count, 0);
    
    // Erfasse Umweltdaten
    const environmentalData = {
        windStrength: parseInt(windStrengthInput.value) || 0,
        temperature: parseFloat(temperatureInput.value) || null,
        cloudCover: parseInt(cloudCoverInput.value) || 0
    };

    // Erstelle das Session-Objekt
    const sessionData = {
        id: sessionKey,
        startTime: sessionStartTime.toISOString(),
        displayDate: displayDate,
        bumblebees: JSON.parse(JSON.stringify(bumblebees)), // Deep copy
        totalCount: totalCount,
        finalDistance: totalDistance, // Immer die volle Zieldistanz, da zeitbasiert
        environmental: environmentalData
    };
    
    try {
        // Speichere die Session
        localStorage.setItem(sessionKey, JSON.stringify(sessionData));
        
        // Aktualisiere die Liste der Sessions
        updateSessionsList(sessionKey);
        
        // Aktualisiere die Anzeige
        renderSessionsList();
        
        console.log('Zählsession gespeichert:', sessionKey);
    } catch (error) {
        console.error('Fehler beim Speichern der Session:', error);
        alert('Fehler beim Speichern der Zählung. Möglicherweise ist der Speicher voll.');
    }
}

function updateSessionsList(newSessionKey) {
    try {
        let sessionsList = JSON.parse(localStorage.getItem('sessionsList') || '[]');
        
        // Füge die neue Session zur Liste hinzu (neueste zuerst)
        if (!sessionsList.includes(newSessionKey)) {
            sessionsList.unshift(newSessionKey);
        }
        
        localStorage.setItem('sessionsList', JSON.stringify(sessionsList));
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Sessions-Liste:', error);
    }
}

function formatSessionDate(date) {
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Berlin'
    };
    return date.toLocaleDateString('de-DE', options).replace(',', ' um');
}

function getAllSessions() {
    try {
        const sessionsList = JSON.parse(localStorage.getItem('sessionsList') || '[]');
        const sessions = [];
        
        sessionsList.forEach(sessionKey => {
            const sessionData = localStorage.getItem(sessionKey);
            if (sessionData) {
                try {
                    sessions.push(JSON.parse(sessionData));
                } catch (error) {
                    console.error('Fehler beim Laden der Session:', sessionKey, error);
                }
            }
        });
        
        return sessions;
    } catch (error) {
        console.error('Fehler beim Laden aller Sessions:', error);
        return [];
    }
}

function deleteSession(sessionId) {
    try {
        // Entferne die Session aus dem localStorage
        localStorage.removeItem(sessionId);
        
        // Entferne die Session aus der Liste
        let sessionsList = JSON.parse(localStorage.getItem('sessionsList') || '[]');
        sessionsList = sessionsList.filter(id => id !== sessionId);
        localStorage.setItem('sessionsList', JSON.stringify(sessionsList));
        
        console.log('Session gelöscht:', sessionId);
        return true;
    } catch (error) {
        console.error('Fehler beim Löschen der Session:', error);
        return false;
    }
}

function showSessionsOverview() {
    const sessions = getAllSessions();
    
    if (sessions.length === 0) {
        alert('Keine gespeicherten Zählungen vorhanden.');
        return;
    }
    
    // Erstelle eine Übersicht der Sessions
    let overview = 'Gespeicherte Zählungen:\n\n';
    sessions.forEach((session, index) => {
        overview += `${index + 1}. ${session.displayDate}\n`;
        overview += `   Gesamt: ${session.totalCount} Tiere\n`;
        overview += `   Distanz: ${session.finalDistance.toFixed(1)}m\n\n`;
    });
    
    alert(overview);
}

function exportSessionData(sessionId) {
    try {
        const sessionData = localStorage.getItem(sessionId);
        if (!sessionData) {
            alert('Session nicht gefunden.');
            return;
        }
        
        const session = JSON.parse(sessionData);
        const sessionDate = new Date(session.startTime);
        const dateStr = sessionDate.toLocaleDateString('de-DE');
        const timeStr = sessionDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        
        let csvContent = '';
        
        // Kopfzeile mit Umweltdaten
        const environmental = session.environmental || {};
        const windStrength = environmental.windStrength || 'n/a';
        const temperature = environmental.temperature !== null ? environmental.temperature : 'n/a';
        const cloudCover = environmental.cloudCover || 'n/a';
        
        csvContent += `# Zählung vom ${dateStr} ${timeStr}\n`;
        csvContent += `# Windstärke: ${windStrength}, Temperatur: ${temperature}°C, Wolkenbedeckung: ${cloudCover}/8\n`;
        csvContent += '#\n';
        
        // Sammle alle Arten mit Zählung > 0
        const speciesWithCounts = session.bumblebees.filter(bee => bee.count > 0);
        
        if (speciesWithCounts.length > 0) {
            // Header-Zeile: Art, Zaehlung_1
            csvContent += 'Art,Zaehlung_1\n';
            
            // Datenzeilen: Für jede Art eine Zeile
            speciesWithCounts.forEach(bee => {
                csvContent += `"${bee.name}",${bee.count}\n`;
            });
        } else {
            // Falls keine Tiere gezählt wurden
            csvContent += 'Art,Zaehlung_1\n';
            csvContent += '"Keine Zählung",0\n';
        }
        
        // CSV-Download erstellen
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Dateiname mit Session-Datum
        const filename = `hummelzaehlung_${dateStr.replace(/\./g, '-')}_${timeStr.replace(/:/g, '-')}.csv`;
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('Fehler beim Exportieren der Session:', error);
        alert('Fehler beim Exportieren der Daten.');
    }
}

// UI-Funktionen für Sessions-Verwaltung
function renderSessionsList() {
    const sessions = getAllSessions();
    sessionsListElement.innerHTML = '';
    
    if (sessions.length === 0) {
        sessionsListElement.innerHTML = '<p style="text-align: center; color: #666; padding: 1rem;">Keine gespeicherten Zählungen vorhanden.</p>';
        return;
    }
    
    sessions.forEach(session => {
        const sessionItem = document.createElement('div');
        sessionItem.className = 'session-item';
        sessionItem.innerHTML = `
            <div class="session-info">
                <div class="session-date">${session.displayDate}</div>
                <div class="session-details">
                    Gesamt: ${session.totalCount} Tiere |
                    Distanz: ${session.finalDistance.toFixed(1)}m
                </div>
            </div>
            <div class="session-actions">
                <button class="session-button detail-button" onclick="showSessionDetail('${session.id}')">
                    Details
                </button>
                <button class="session-button export-button" onclick="exportSessionData('${session.id}')">
                    Export
                </button>
                <button class="session-button delete-button" onclick="confirmDeleteSession('${session.id}', '${session.displayDate}')">
                    Löschen
                </button>
            </div>
        `;
        
        sessionsListElement.appendChild(sessionItem);
    });
}

function confirmDeleteSession(sessionId, displayDate) {
    if (confirm(`Möchtest du die Zählung vom ${displayDate} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
        if (deleteSession(sessionId)) {
            renderSessionsList();
            alert('Zählung erfolgreich gelöscht.');
        } else {
            alert('Fehler beim Löschen der Zählung.');
        }
    }
}

// Neue Funktion für Detailansicht einer einzelnen Zählung
function showSessionDetail(sessionId) {
    try {
        const sessionData = localStorage.getItem(sessionId);
        if (!sessionData) {
            alert('Zählung nicht gefunden.');
            return;
        }
        
        const session = JSON.parse(sessionData);
        
        // Erstelle detaillierte Übersicht
        let detail = `Zählung vom ${session.displayDate}\n\n`;
        detail += `Gesamtanzahl: ${session.totalCount} Tiere\n`;
        detail += `Zurückgelegte Distanz: ${session.finalDistance.toFixed(1)}m\n\n`;
        detail += 'Detaillierte Artenliste:\n';
        detail += '─'.repeat(30) + '\n';
        
        // Sortiere Arten nach Anzahl (absteigend)
        const sortedBees = session.bumblebees
            .filter(bee => bee.count > 0)
            .sort((a, b) => b.count - a.count);
        
        if (sortedBees.length > 0) {
            sortedBees.forEach(bee => {
                detail += `${bee.name}: ${bee.count}\n`;
            });
        } else {
            detail += 'Keine Tiere gezählt.\n';
        }
        
        // Zeige auch Arten mit 0 Zählungen
        const emptyBees = session.bumblebees.filter(bee => bee.count === 0);
        if (emptyBees.length > 0) {
            detail += '\nNicht gezählte Arten:\n';
            detail += '─'.repeat(20) + '\n';
            emptyBees.forEach(bee => {
                detail += `${bee.name}: 0\n`;
            });
        }
        
        alert(detail);
        
    } catch (error) {
        console.error('Fehler beim Anzeigen der Session-Details:', error);
        alert('Fehler beim Laden der Zählungsdetails.');
    }
}

// CSV-Download für alle Zählungen
function exportAllSessionsAsCSV() {
    const sessions = getAllSessions();
    
    if (sessions.length === 0) {
        alert('Keine gespeicherten Zählungen vorhanden.');
        return;
    }
    
    try {
        let csvContent = '';
        
        // Aktuelle Umweltdaten aus dem localStorage laden
        const currentEnvironmentalData = JSON.parse(localStorage.getItem('environmentalData') || '{}');
        
        // Kopfzeilen mit Umweltdaten
        csvContent += '# Umweltdaten (gelten für alle Zählungen):\n';
        const windStrength = currentEnvironmentalData.windStrength !== undefined ? currentEnvironmentalData.windStrength : 'nicht angegeben';
        const temperature = currentEnvironmentalData.temperature !== null && currentEnvironmentalData.temperature !== undefined ? currentEnvironmentalData.temperature : 'nicht angegeben';
        const cloudCover = currentEnvironmentalData.cloudCover !== undefined ? currentEnvironmentalData.cloudCover : 'nicht angegeben';
        
        csvContent += `# Windstärke: ${windStrength} Beaufort | Temperatur: ${temperature}°C | Wolkenbedeckung: ${cloudCover}/8 Achtel\n`;
        csvContent += '#\n';
        
        // Sammle alle vorkommenden Arten
        const allSpecies = new Set();
        sessions.forEach(session => {
            session.bumblebees.forEach(bee => {
                if (bee.count > 0) {
                    allSpecies.add(bee.name);
                }
            });
        });
        
        // Falls keine Arten gefunden wurden, füge "Keine Zählung" hinzu
        if (allSpecies.size === 0) {
            allSpecies.add('Keine Zählung');
        }
        
        const speciesArray = Array.from(allSpecies).sort();
        
        
        
        // Header-Zeile mit Zählungsnummern
        csvContent += 'Art';
        sessions.forEach((session, index) => {
            csvContent += `,Zaehlung_${index + 1}`;
        });
        csvContent += '\n';

        // Zeitpunkt-Zeile über den Arten
        csvContent += 'Zeitpunkt';
        sessions.forEach((session, index) => {
            const sessionDate = new Date(session.startTime);
            const dateStr = sessionDate.toLocaleDateString('de-DE');
            const timeStr = sessionDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            csvContent += `,"${dateStr} ${timeStr}"`;
        });
        csvContent += '\n';
        
        // Datenzeilen: Für jede Art eine Zeile mit den Zählungen
        speciesArray.forEach(speciesName => {
            csvContent += `"${speciesName}"`;
            
            sessions.forEach(session => {
                const bee = session.bumblebees.find(b => b.name === speciesName);
                const count = bee ? bee.count : 0;
                csvContent += `,${count}`;
            });
            
            csvContent += '\n';
        });
        
        // CSV-Download erstellen
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Dateiname mit aktuellem Datum
        const now = new Date();
        const filename = `hummelzaehlungen_alle_${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}.csv`;
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(`CSV-Datei mit ${sessions.length} Zählungen wurde heruntergeladen.`);
        
    } catch (error) {
        console.error('Fehler beim Erstellen der CSV-Datei:', error);
        alert('Fehler beim Erstellen der CSV-Datei.');
    }
}

// Erweiterte showSessionsOverview Funktion - jetzt für CSV-Download
function showSessionsOverview() {
    exportAllSessionsAsCSV();
}

// App-Update-Funktionalität
async function initAppUpdate() {
    const updateButton = document.getElementById('update-app-button');
    
    if (updateButton) {
        updateButton.addEventListener('click', manualUpdateCheck);
    }
    
    // Lade letzten Update-Check aus localStorage
    loadLastUpdateCheck();
    
    // Zeige aktuelle Version an
    await updateVersionDisplay();
    
    // Prüfe auf Service Worker Updates
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            // Neue Version ist verfügbar
            updateAvailable = true;
            updateUpdateStatus();
        });
    }
    
    // Frage nach Benachrichtigungserlaubnis
    requestNotificationPermission();
}

async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        try {
            const permission = await Notification.requestPermission();
            console.log('Benachrichtigungserlaubnis:', permission);
        } catch (error) {
            console.log('Fehler beim Anfordern der Benachrichtigungserlaubnis:', error);
        }
    }
}

async function updateVersionDisplay() {
    const versionElement = document.getElementById('app-version');
    if (versionElement) {
        // Stelle sicher, dass die Version geladen ist
        if (!APP_VERSION) {
            await loadAppVersion();
        }
        versionElement.textContent = APP_VERSION;
    }
}

function handleOnlineStatus() {
    isOnline = true;
    updateUpdateStatus();
}

function handleOfflineStatus() {
    isOnline = false;
    updateUpdateStatus();
}

async function checkForUpdatesOnStartup() {
    if (!isOnline) {
        updateUpdateStatus();
        return;
    }
    
    await performUpdateCheck();
    
    // Starte automatische Update-Prüfung alle 5 Minuten
    setInterval(async () => {
        if (isOnline && !updateAvailable) {
            console.log('Automatische Update-Prüfung...');
            await performUpdateCheck();
        }
    }, 5 * 60 * 1000); // 5 Minuten
}

async function manualUpdateCheck() {
    const updateButton = document.getElementById('update-app-button');
    
    if (!isOnline) {
        updateUpdateStatus();
        return;
    }
    
    // Zeige Loading-Status
    updateButton.disabled = true;
    updateButton.innerHTML = '<span class="update-icon">⏳</span><span class="update-text">Prüfe...</span>';
    
    if (updateAvailable) {
        // Update ist verfügbar, führe es aus
        await performAppUpdate();
    } else {
        // Prüfe auf neue Updates
        await performUpdateCheck();
        
        // Button zurücksetzen
        setTimeout(() => {
            updateButton.disabled = false;
            updateButton.innerHTML = '<span class="update-icon">🔄</span><span class="update-text">Nach Updates suchen</span>';
        }, 1000);
    }
}

async function performUpdateCheck() {
    try {
        lastUpdateCheck = new Date();
        saveLastUpdateCheck();
        
        // Prüfe auf neue Version in der Manifest-Datei
        const manifestUpdateAvailable = await checkManifestVersion();
        
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
        updateAvailable = manifestUpdateAvailable || serviceWorkerUpdateAvailable;
        
        updateUpdateStatus();
        
    } catch (error) {
        console.log('Update-Check fehlgeschlagen:', error);
        updateUpdateStatus();
    }
}

async function checkManifestVersion() {
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
        
        // Fallback: Verwende APP_VERSION falls keine gecachte Version gefunden
        if (!cachedVersion) {
            if (!APP_VERSION) {
                await loadAppVersion();
            }
            cachedVersion = APP_VERSION;
            console.log('Verwende APP_VERSION als gecachte Version:', cachedVersion);
        }
        
        // 2. Lade die aktuelle Manifest-Datei direkt vom Server (ohne Cache)
        const response = await fetch('./manifest.json?t=' + Date.now(), {
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

async function performAppUpdate() {
    const updateButton = document.getElementById('update-app-button');
    
    try {
        // Zeige Update-Status
        updateButton.innerHTML = '<span class="update-icon">⬇️</span><span class="update-text">Aktualisiere...</span>';
        updateButton.disabled = true;
        
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
        updateAvailable = false;
        lastUpdateCheck = new Date();
        saveLastUpdateCheck();
        
        console.log('Update abgeschlossen, lade Seite neu...');
        
        // 4. Seite mit starkem Cache-Bypass neu laden
        // Verwende window.location.replace mit Cache-Busting und zusätzlichen Parametern
        const url = new URL(window.location.href);
        url.searchParams.set('_t', Date.now());
        url.searchParams.set('_cache_bust', Math.random().toString(36).substring(7));
        
        // Zusätzlich: Versuche alle Browser-Caches zu umgehen
        console.log('Lade Seite neu mit URL:', url.toString());
        
        // Verwende location.replace statt location.href für stärkeren Cache-Bypass
        window.location.replace(url.toString());
        
    } catch (error) {
        console.error('Fehler beim App-Update:', error);
        
        // Button zurücksetzen
        updateButton.disabled = false;
        updateButton.innerHTML = '<span class="update-icon">❌</span><span class="update-text">Update fehlgeschlagen</span>';
        
        // Fallback: Einfach neu laden mit starkem Cache-Busting
        setTimeout(() => {
            if (confirm('Fehler beim Update. Soll die Seite neu geladen werden?')) {
                const url = new URL(window.location.href);
                url.searchParams.set('_t', Date.now());
                url.searchParams.set('_cache_bust', Math.random().toString(36).substring(7));
                window.location.replace(url.toString());
            } else {
                // Button zurücksetzen
                updateButton.innerHTML = '<span class="update-icon">🔄</span><span class="update-text">Nach Updates suchen</span>';
            }
        }, 2000);
    }
}

function updateUpdateStatus() {
    const statusElement = document.getElementById('update-status-text');
    const lastCheckElement = document.getElementById('last-check-time');
    const updateButton = document.getElementById('update-app-button');
    
    if (!statusElement || !lastCheckElement || !updateButton) return;
    
    // Aktualisiere letzten Check
    if (lastUpdateCheck) {
        const timeString = lastUpdateCheck.toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        lastCheckElement.textContent = `Letzter Check: ${timeString}`;
    } else {
        lastCheckElement.textContent = 'Letzter Check: Nie';
    }
    
    // Aktualisiere Status
    if (!isOnline) {
        statusElement.textContent = 'Offline - Keine Update-Prüfung möglich';
        statusElement.className = 'status-text offline';
        updateButton.innerHTML = '<span class="update-icon">📡</span><span class="update-text">Offline</span>';
        updateButton.disabled = true;
    } else if (updateAvailable) {
        statusElement.textContent = 'Neue Version verfügbar!';
        statusElement.className = 'status-text update-available';
        updateButton.innerHTML = '<span class="update-icon">⬇️</span><span class="update-text">Jetzt aktualisieren</span>';
        updateButton.disabled = false;
        
        // Zeige eine Benachrichtigung für verfügbare Updates
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Hummelzähler Update', {
                body: 'Eine neue Version der App ist verfügbar!',
                icon: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'512\' height=\'512\' viewBox=\'0 0 512 512\'%3E%3Crect width=\'512\' height=\'512\' fill=\'%234CAF50\' rx=\'128\' ry=\'128\'/%3E%3Ccircle cx=\'256\' cy=\'256\' r=\'200\' fill=\'%23FFC107\'/%3E%3Cellipse cx=\'256\' cy=\'200\' rx=\'160\' ry=\'80\' fill=\'%23333\'/%3E%3Cellipse cx=\'256\' cy=\'320\' rx=\'160\' ry=\'80\' fill=\'%23333\'/%3E%3Ccircle cx=\'180\' cy=\'180\' r=\'20\' fill=\'white\'/%3E%3Ccircle cx=\'332\' cy=\'180\' r=\'20\' fill=\'white\'/%3E%3C/svg%3E'
            });
        }
    } else {
        statusElement.textContent = 'App ist auf dem neuesten Stand';
        statusElement.className = 'status-text up-to-date';
        updateButton.innerHTML = '<span class="update-icon">🔄</span><span class="update-text">Nach Updates suchen</span>';
        updateButton.disabled = false;
    }
}

function saveLastUpdateCheck() {
    if (lastUpdateCheck) {
        localStorage.setItem('lastUpdateCheck', lastUpdateCheck.toISOString());
    }
}

function loadLastUpdateCheck() {
    try {
        const saved = localStorage.getItem('lastUpdateCheck');
        if (saved) {
            lastUpdateCheck = new Date(saved);
        }
    } catch (error) {
        console.error('Fehler beim Laden des letzten Update-Checks:', error);
    }
}
