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

// GPS-Tracking-Variablen
let startPosition = null;
let currentPosition = null;
let distanceInterval = null;
let totalDistance = 50; // Zieldistanz in Metern

// DOM-Elemente
const timerElement = document.getElementById('timer');
const startButton = document.getElementById('start-button');
const resetButton = document.getElementById('reset-button');
const bumblebeeList = document.getElementById('bumblebee-list');
const addBumblebeeButton = document.getElementById('add-bumblebee');
const distanceTrackingElement = document.getElementById('distance-tracking');
const currentDistanceElement = document.getElementById('current-distance');
const speedFeedbackElement = document.getElementById('speed-feedback');
const targetPositionElement = document.getElementById('target-position');
const currentPositionElement = document.getElementById('current-position');

// Event-Listener
document.addEventListener('DOMContentLoaded', () => {
    // Daten aus dem lokalen Speicher laden
    loadFromLocalStorage();
    
    // UI initialisieren
    renderBumblebeeList();
    initTabSwitching();
    
    // Event-Listener für Buttons
    startButton.addEventListener('click', toggleTimer);
    resetButton.addEventListener('click', confirmReset);
    addBumblebeeButton.addEventListener('click', addNewBumblebee);
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
    
    // Timer starten
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            stopTimer();
            alert('Zeit abgelaufen! Die Zählung ist beendet.');
        }
    }, 1000);
    
    isTimerRunning = true;
    isPaused = false;
    startButton.textContent = 'Zählung pausieren';
    timerElement.classList.add('timer-active');
    
    // Zähler zurücksetzen
    bumblebees.forEach(bee => {
        bee.count = 0;
    });
    renderBumblebeeList();
    saveToLocalStorage();
    
    // GPS-Tracking starten
    startGPSTracking();
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
    timerElement.classList.remove('timer-active');
    timerElement.classList.remove('timer-paused');
    
    // GPS-Tracking stoppen
    stopGPSTracking();
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
    
    // Zähler zurücksetzen
    bumblebees.forEach(bee => {
        bee.count = 0;
    });
    renderBumblebeeList();
    saveToLocalStorage();
    
    // GPS-Tracking zurücksetzen
    stopGPSTracking();
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