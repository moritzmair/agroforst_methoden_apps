// Distanz-Tracking-Modul

import { APP_CONFIG } from './constants.js';

export class DistanceTracker {
    constructor() {
        this.totalDistance = APP_CONFIG.TARGET_DISTANCE;
        this.interval = null;
        this.isTracking = false;
        this.onUpdate = null;
    }

    // Event-Handler setzen
    setOnUpdate(callback) {
        this.onUpdate = callback;
    }

    // Tracking starten
    start() {
        if (this.isTracking) return;

        this.isTracking = true;
        this.interval = setInterval(() => {
            if (this.onUpdate) {
                this.onUpdate(this.getCurrentDistance(), this.getCurrentProgress());
            }
        }, 1000);
    }

    // Tracking stoppen
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isTracking = false;
        
        // Reset der Anzeige
        if (this.onUpdate) {
            this.onUpdate(0, 0);
        }
    }

    // Aktuelle Sollposition berechnen (basierend auf verstrichener Zeit)
    getCurrentDistance(elapsedTime) {
        if (elapsedTime === undefined) {
            // Fallback falls keine Zeit übergeben wird
            return 0;
        }
        
        const targetDistance = (elapsedTime / APP_CONFIG.TIMER_DURATION) * this.totalDistance;
        return Math.min(targetDistance, this.totalDistance);
    }

    // Fortschritt in Prozent
    getCurrentProgress(elapsedTime) {
        const distance = this.getCurrentDistance(elapsedTime);
        return (distance / this.totalDistance) * 100;
    }

    // Getter
    getTotalDistance() {
        return this.totalDistance;
    }

    isActive() {
        return this.isTracking;
    }
}

// UI-Update-Funktionen
export function updateDistanceVisualization(targetDistanceElement, targetPositionElement, distance, progress) {
    if (targetDistanceElement) {
        targetDistanceElement.textContent = distance.toFixed(1);
    }
    
    if (targetPositionElement) {
        targetPositionElement.style.width = `${Math.min(progress, 100)}%`;
    }
}