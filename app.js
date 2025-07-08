// Datenstruktur für die Hummeln
let bumblebees = [
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

// Timer-Variablen
let timerInterval;
let timeLeft = 5 * 60; // 5 Minuten in Sekunden
let isTimerRunning = false;
let isPaused = false;
let sessionStartTime = null; // Zeitpunkt des Zählungsbeginns

// GPS-Tracking-Variablen
let startPosition = null;
let currentPosition = null;
let distanceInterval = null;
let totalDistance = 50; // Zieldistanz in Metern

// Karten-Variablen
let map = null;
let userMarker = null;
let currentPath = null;
let allPaths = []; // Speichert alle gezeichneten Pfade
let isTracking = false;
let trackingPoints = []; // Aktuelle Tracking-Punkte

// DOM-Elemente
const timerElement = document.getElementById('timer');
const startButton = document.getElementById('start-button');
const stopSaveButton = document.getElementById('stop-save-button');
const resetButton = document.getElementById('reset-button');
const bumblebeeList = document.getElementById('bumblebee-list');
const addBumblebeeButton = document.getElementById('add-bumblebee');
const distanceTrackingElement = document.getElementById('distance-tracking');
const currentDistanceElement = document.getElementById('current-distance');
const speedFeedbackElement = document.getElementById('speed-feedback');
const targetPositionElement = document.getElementById('target-position');
const currentPositionElement = document.getElementById('current-position');
const showSessionsButton = document.getElementById('show-sessions');
const sessionsListElement = document.getElementById('sessions-list');

// Event-Listener
document.addEventListener('DOMContentLoaded', () => {
    // Daten aus dem lokalen Speicher laden
    loadFromLocalStorage();
    
    // UI initialisieren
    renderBumblebeeList();
    renderSessionsList();
    initTabSwitching();
    initMap();
    
    // Event-Listener für Buttons
    startButton.addEventListener('click', toggleTimer);
    stopSaveButton.addEventListener('click', stopAndSaveTimer);
    resetButton.addEventListener('click', confirmReset);
    addBumblebeeButton.addEventListener('click', addNewBumblebee);
    showSessionsButton.addEventListener('click', showSessionsOverview);
});

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
        saveToLocalStorage();
    }
}

// Timer-Funktionen
function toggleTimer() {
    if (!isTimerRunning) {
        startTimer();
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
    
    // Startzeitpunkt speichern
    sessionStartTime = new Date();
    
    // Timer starten
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            stopTimer();
            saveCountingSession();
            alert('Zeit abgelaufen! Die Zählung ist beendet und wurde gespeichert.');
        }
    }, 1000);
    
    isTimerRunning = true;
    isPaused = false;
    startButton.textContent = 'Zählung pausieren';
    stopSaveButton.classList.remove('hidden');
    timerElement.classList.add('timer-active');
    
    // Zähler zurücksetzen
    bumblebees.forEach(bee => {
        bee.count = 0;
    });
    renderBumblebeeList();
    saveToLocalStorage();
    
    // GPS-Tracking starten
    startGPSTracking();
    
    // Karten-Tracking starten
    startMapTracking();
}

function pauseTimer() {
    clearInterval(timerInterval);
    clearInterval(distanceInterval);
    isPaused = true;
    startButton.textContent = 'Zählung fortsetzen';
    timerElement.classList.add('timer-paused');
}

function resumeTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            stopTimer();
            alert('Zeit abgelaufen! Die Zählung ist beendet.');
        }
    }, 1000);
    
    // GPS-Tracking fortsetzen
    if (startPosition) {
        startDistanceTracking();
    }
    
    isPaused = false;
    startButton.textContent = 'Zählung pausieren';
    timerElement.classList.remove('timer-paused');
}

function stopTimer() {
    clearInterval(timerInterval);
    clearInterval(distanceInterval);
    isTimerRunning = false;
    isPaused = false;
    startButton.textContent = 'Zählung starten';
    stopSaveButton.classList.add('hidden');
    timerElement.classList.remove('timer-active');
    timerElement.classList.remove('timer-paused');
    
    // GPS-Tracking stoppen
    stopGPSTracking();
    
    // Karten-Tracking stoppen
    stopMapTracking();
}

function stopAndSaveTimer() {
    if (isTimerRunning && sessionStartTime) {
        if (confirm('Möchtest du die aktuelle Zählung speichern?')) {
            saveCountingSession();
            alert('Zählung wurde gespeichert.');
        }
    }
    
    stopTimer();
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

function loadFromLocalStorage() {
    try {
        const savedBumblebees = localStorage.getItem('bumblebees');
        if (savedBumblebees) {
            bumblebees = JSON.parse(savedBumblebees);
        }
    } catch (error) {
        console.error('Fehler beim Laden aus dem localStorage:', error);
    }
}

// Funktion zum Bestätigen des Neustarts
function confirmReset() {
    if (isTimerRunning) {
        if (confirm('Möchtest du die Zählung wirklich neu starten? Alle aktuellen Daten werden zurückgesetzt.')) {
            resetCounting();
        }
    } else {
        resetCounting();
    }
}

// Funktion zum Zurücksetzen der Zählung
function resetCounting() {
    // Timer stoppen und zurücksetzen
    stopTimer();
    timeLeft = 5 * 60;
    updateTimerDisplay();
    sessionStartTime = null;
    
    // Zähler zurücksetzen
    bumblebees.forEach(bee => {
        bee.count = 0;
    });
    renderBumblebeeList();
    saveToLocalStorage();
    
    // GPS-Tracking zurücksetzen
    stopGPSTracking();
    
    // Karten-Pfade zurücksetzen
    resetMapPaths();
}

// GPS-Tracking-Funktionen
function startGPSTracking() {
        if ('geolocation' in navigator) {
            // Zeige das Tracking-Element an
            distanceTrackingElement.classList.remove('hidden');
            
            // Startposition erfassen
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    startPosition = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    currentPosition = startPosition;
                    
                    // Distanz-Tracking starten
                    startDistanceTracking();
                },
                (error) => {
                    console.error('Fehler bei der Geolokalisierung:', error);
                    alert('GPS-Tracking konnte nicht gestartet werden. Bitte erlaube den Zugriff auf deinen Standort.');
                    distanceTrackingElement.classList.add('hidden');
                },
                { enableHighAccuracy: true }
            );
        } else {
            console.error('Geolocation wird von diesem Browser nicht unterstützt.');
            alert('Dein Browser unterstützt kein GPS-Tracking.');
            distanceTrackingElement.classList.add('hidden');
        }
    }
    
    function startDistanceTracking() {
        // Aktualisiere die Position jede Sekunde
        distanceInterval = setInterval(() => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    currentPosition = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    // Berechne die zurückgelegte Distanz
                    const distance = calculateDistance(startPosition, currentPosition);
                    currentDistanceElement.textContent = distance.toFixed(1);
                    
                    // Aktualisiere die Visualisierung
                    updateDistanceVisualization(distance);
                    
                    // Gib Feedback zur Geschwindigkeit
                    updateSpeedFeedback(distance);
                    
                    // Aktualisiere die Kartenposition
                    updateMapPosition(currentPosition.lat, currentPosition.lng);
                },
                (error) => {
                    console.error('Fehler bei der Geolokalisierung:', error);
                },
                { enableHighAccuracy: true }
            );
        }, 1000);
    }
    
    function stopGPSTracking() {
        clearInterval(distanceInterval);
        startPosition = null;
        currentPosition = null;
        distanceTrackingElement.classList.add('hidden');
        currentDistanceElement.textContent = '0';
        speedFeedbackElement.textContent = '-';
        speedFeedbackElement.className = '';
        targetPositionElement.style.width = '0%';
        currentPositionElement.style.left = '0%';
    }
    
    // Berechnet die Distanz zwischen zwei GPS-Punkten in Metern (Haversine-Formel)
    function calculateDistance(pos1, pos2) {
        const R = 6371e3; // Erdradius in Metern
        const φ1 = pos1.lat * Math.PI / 180;
        const φ2 = pos2.lat * Math.PI / 180;
        const Δφ = (pos2.lat - pos1.lat) * Math.PI / 180;
        const Δλ = (pos2.lng - pos1.lng) * Math.PI / 180;
    
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
        return R * c; // in Metern
    }
    
    // Aktualisiert die Visualisierung der Distanz
    function updateDistanceVisualization(distance) {
        // Berechne, wo man sein sollte (basierend auf der verstrichenen Zeit)
        const elapsedTime = (5 * 60) - timeLeft;
        const targetDistance = (elapsedTime / (5 * 60)) * totalDistance;
        
        // Aktualisiere die Positionsanzeigen (in Prozent)
        const targetPercent = (targetDistance / totalDistance) * 100;
        const currentPercent = (distance / totalDistance) * 100;
        
        targetPositionElement.style.width = `${Math.min(targetPercent, 100)}%`;
        currentPositionElement.style.left = `${Math.min(currentPercent, 100)}%`;
    }
    
    // Gibt Feedback zur Geschwindigkeit
    function updateSpeedFeedback(distance) {
        // Berechne, wo man sein sollte (basierend auf der verstrichenen Zeit)
        const elapsedTime = (5 * 60) - timeLeft;
        const targetDistance = (elapsedTime / (5 * 60)) * totalDistance;
        
        // Berechne die Abweichung
        const deviation = distance - targetDistance;
        
        // Entferne alle Klassen
        speedFeedbackElement.classList.remove('too-slow', 'too-fast', 'good-pace');
        
        // Setze das Feedback basierend auf der Abweichung
        if (deviation < -5) {
            speedFeedbackElement.textContent = 'Zu langsam';
            speedFeedbackElement.classList.add('too-slow');
        } else if (deviation > 5) {
            speedFeedbackElement.textContent = 'Zu schnell';
            speedFeedbackElement.classList.add('too-fast');
        } else {
            speedFeedbackElement.textContent = 'Gutes Tempo';
            speedFeedbackElement.classList.add('good-pace');
        }
    }

// Karten-Funktionen
function initMap() {
    // Karte mit Standardposition initialisieren (Deutschland)
    map = L.map('map').setView([51.1657, 10.4515], 6);
    
    // OpenStreetMap Tiles hinzufügen
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Benutzerstandort ermitteln und Karte zentrieren
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Karte auf Benutzerstandort zentrieren
                map.setView([lat, lng], 16);
                
                // Benutzer-Marker hinzufügen
                userMarker = L.marker([lat, lng], {
                    icon: L.divIcon({
                        className: 'user-marker',
                        html: '<div style="background-color: #4CAF50; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>',
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                    })
                }).addTo(map);
            },
            (error) => {
                console.error('Fehler bei der Geolokalisierung für Karte:', error);
            },
            { enableHighAccuracy: true }
        );
    }
}

function startMapTracking() {
    if (!map) return;
    
    isTracking = true;
    trackingPoints = [];
    
    // Neue Pfad-Farbe für jede Messung
    const colors = ['#FF0000', '#0000FF', '#FF8C00', '#8A2BE2', '#00CED1', '#32CD32'];
    const pathColor = colors[allPaths.length % colors.length];
    
    // Neuen Pfad erstellen
    currentPath = L.polyline([], {
        color: pathColor,
        weight: 3,
        opacity: 0.8
    }).addTo(map);
}

function updateMapPosition(lat, lng) {
    if (!map || !isTracking) return;
    
    // Benutzer-Marker aktualisieren
    if (userMarker) {
        userMarker.setLatLng([lat, lng]);
    }
    
    // Punkt zum aktuellen Pfad hinzufügen
    if (currentPath) {
        trackingPoints.push([lat, lng]);
        currentPath.setLatLngs(trackingPoints);
    }
    
    // Karte sanft zum neuen Standort bewegen
    map.panTo([lat, lng]);
}

function stopMapTracking() {
    if (!isTracking || !currentPath) return;
    
    isTracking = false;
    
    // Aktuellen Pfad zu den gespeicherten Pfaden hinzufügen
    if (trackingPoints.length > 1) {
        allPaths.push({
            path: currentPath,
            points: [...trackingPoints]
        });
    }
    
    currentPath = null;
    trackingPoints = [];
}

function resetMapPaths() {
    if (!map) return;
    
    // Alle gespeicherten Pfade von der Karte entfernen
    allPaths.forEach(pathData => {
        if (pathData.path) {
            map.removeLayer(pathData.path);
        }
    });
    
    // Aktuellen Pfad entfernen
    if (currentPath) {
        map.removeLayer(currentPath);
        currentPath = null;
    }
    
    // Arrays zurücksetzen
    allPaths = [];
    trackingPoints = [];
    isTracking = false;
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
    
    // Erstelle das Session-Objekt
    const sessionData = {
        id: sessionKey,
        startTime: sessionStartTime.toISOString(),
        displayDate: displayDate,
        bumblebees: JSON.parse(JSON.stringify(bumblebees)), // Deep copy
        totalCount: totalCount,
        gpsData: {
            startPosition: startPosition,
            finalDistance: (startPosition && currentPosition) ? calculateDistance(startPosition, currentPosition) : 0
        }
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
        overview += `   Distanz: ${session.gpsData.finalDistance.toFixed(1)}m\n\n`;
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
        
        // Erstelle CSV-ähnliche Daten
        let csvData = `Zählung vom ${session.displayDate}\n\n`;
        csvData += 'Art,Anzahl\n';
        
        session.bumblebees.forEach(bee => {
            if (bee.count > 0) {
                csvData += `${bee.name},${bee.count}\n`;
            }
        });
        
        csvData += `\nGesamtanzahl,${session.totalCount}\n`;
        csvData += `Zurückgelegte Distanz,${session.gpsData.finalDistance.toFixed(1)}m\n`;
        
        // Erstelle einen Download-Link
        const blob = new Blob([csvData], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hummelzaehlung_${session.startTime.split('T')[0]}.txt`;
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
                    Distanz: ${session.gpsData.finalDistance.toFixed(1)}m
                </div>
            </div>
            <div class="session-actions">
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

// Erweiterte showSessionsOverview Funktion für bessere Darstellung
function showSessionsOverview() {
    const sessions = getAllSessions();
    
    if (sessions.length === 0) {
        alert('Keine gespeicherten Zählungen vorhanden.');
        return;
    }
    
    // Erstelle eine detaillierte Übersicht
    let overview = `Gespeicherte Zählungen (${sessions.length}):\n\n`;
    
    sessions.forEach((session, index) => {
        overview += `${index + 1}. ${session.displayDate}\n`;
        overview += `   Gesamt: ${session.totalCount} Tiere\n`;
        overview += `   Distanz: ${session.gpsData.finalDistance.toFixed(1)}m\n`;
        
        // Zeige die häufigsten Arten
        const sortedBees = session.bumblebees
            .filter(bee => bee.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
        
        if (sortedBees.length > 0) {
            overview += '   Häufigste: ';
            overview += sortedBees.map(bee => `${bee.name} (${bee.count})`).join(', ');
            overview += '\n';
        }
        
        overview += '\n';
    });
    
    alert(overview);
}

// App-Update-Funktionalität
function initAppUpdate() {
    const updateButton = document.getElementById('update-app-button');
    
    if (updateButton) {
        updateButton.addEventListener('click', updateApp);
    }
    
    // Prüfe auf Service Worker Updates
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            // Neue Version ist verfügbar, zeige Hinweis
            showUpdateNotification();
        });
        
        // Prüfe regelmäßig auf Updates
        setInterval(checkForUpdates, 60000); // Alle 60 Sekunden
    }
}

async function updateApp() {
    const updateButton = document.getElementById('update-app-button');
    
    try {
        // Zeige Loading-Animation
        updateButton.classList.add('updating');
        updateButton.disabled = true;
        
        // Lösche alle Caches
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
            console.log('Alle Caches wurden gelöscht');
        }
        
        // Unregistriere Service Worker und registriere neu
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(
                registrations.map(registration => registration.unregister())
            );
            console.log('Service Worker wurde deregistriert');
            
            // Kurz warten und dann neu registrieren
            setTimeout(() => {
                navigator.serviceWorker.register('service-worker.js')
                    .then(registration => {
                        console.log('Service Worker neu registriert');
                        // Seite neu laden
                        window.location.reload(true);
                    })
                    .catch(error => {
                        console.error('Fehler beim Neuregistrieren:', error);
                        // Fallback: Einfach neu laden
                        window.location.reload(true);
                    });
            }, 500);
        } else {
            // Fallback: Einfach neu laden
            window.location.reload(true);
        }
        
    } catch (error) {
        console.error('Fehler beim App-Update:', error);
        
        // Entferne Loading-Animation
        updateButton.classList.remove('updating');
        updateButton.disabled = false;
        
        // Fallback: Einfach neu laden
        if (confirm('Fehler beim Cache-Update. Soll die Seite neu geladen werden?')) {
            window.location.reload(true);
        }
    }
}

async function checkForUpdates() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                await registration.update();
            }
        } catch (error) {
            console.log('Update-Check fehlgeschlagen:', error);
        }
    }
}

function showUpdateNotification() {
    const updateButton = document.getElementById('update-app-button');
    if (updateButton) {
        // Zeige visuellen Hinweis auf verfügbares Update
        updateButton.style.background = '#FF9800';
        updateButton.title = 'Update verfügbar! Klicken zum Aktualisieren';
        
        // Kurze Animation
        updateButton.style.animation = 'pulse 2s infinite';
    }
}

// CSS für Pulse-Animation hinzufügen
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);

// Update-Funktionalität beim Laden initialisieren
document.addEventListener('DOMContentLoaded', () => {
    initAppUpdate();
});