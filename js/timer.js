// Timer-Modul für die Zählungsfunktionalität

import { APP_CONFIG, TIMER_STATES } from './constants.js';

export class Timer {
    constructor() {
        this.timeLeft = APP_CONFIG.TIMER_DURATION;
        this.state = TIMER_STATES.STOPPED;
        this.interval = null;
        this.sessionStartTime = null;
        this.onTick = null;
        this.onFinish = null;
        this.onStateChange = null;
    }

    // Event-Handler setzen
    setOnTick(callback) {
        this.onTick = callback;
    }

    setOnFinish(callback) {
        this.onFinish = callback;
    }

    setOnStateChange(callback) {
        this.onStateChange = callback;
    }

    // Timer starten
    start() {
        if (this.state === TIMER_STATES.RUNNING) {
            return;
        }

        // Timer zurücksetzen wenn gestoppt
        if (this.state === TIMER_STATES.STOPPED) {
            this.timeLeft = APP_CONFIG.TIMER_DURATION;
            this.sessionStartTime = new Date();
        }

        this.interval = setInterval(() => {
            this.timeLeft--;
            
            if (this.onTick) {
                this.onTick(this.timeLeft);
            }
            
            if (this.timeLeft <= 0) {
                this.finish();
            }
        }, 1000);

        this.state = TIMER_STATES.RUNNING;
        
        if (this.onStateChange) {
            this.onStateChange(this.state);
        }
    }

    // Timer pausieren
    pause() {
        if (this.state !== TIMER_STATES.RUNNING) {
            return;
        }

        clearInterval(this.interval);
        this.state = TIMER_STATES.PAUSED;
        
        if (this.onStateChange) {
            this.onStateChange(this.state);
        }
    }

    // Timer fortsetzen
    resume() {
        if (this.state !== TIMER_STATES.PAUSED) {
            return;
        }

        this.start(); // Verwendet die gleiche Logik wie start()
    }

    // Timer stoppen
    stop() {
        clearInterval(this.interval);
        this.state = TIMER_STATES.STOPPED;
        this.timeLeft = APP_CONFIG.TIMER_DURATION;
        this.sessionStartTime = null;
        
        if (this.onStateChange) {
            this.onStateChange(this.state);
        }
    }

    // Timer beenden (Zeit abgelaufen)
    finish() {
        clearInterval(this.interval);
        this.state = TIMER_STATES.FINISHED;
        
        if (this.onStateChange) {
            this.onStateChange(this.state);
        }
        
        if (this.onFinish) {
            this.onFinish();
        }
    }

    // Timer umschalten (pausieren/fortsetzen)
    toggle() {
        if (this.state === TIMER_STATES.RUNNING) {
            this.pause();
        } else if (this.state === TIMER_STATES.PAUSED) {
            this.resume();
        }
    }

    // Getter für aktuellen Status
    getTimeLeft() {
        return this.timeLeft;
    }

    getState() {
        return this.state;
    }

    getSessionStartTime() {
        return this.sessionStartTime;
    }

    isRunning() {
        return this.state === TIMER_STATES.RUNNING;
    }

    isPaused() {
        return this.state === TIMER_STATES.PAUSED;
    }

    isFinished() {
        return this.state === TIMER_STATES.FINISHED;
    }

    // Zeit formatieren für Anzeige
    getFormattedTime() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Verstrichene Zeit berechnen (in Millisekunden)
    getElapsedTime() {
        return (APP_CONFIG.TIMER_DURATION - this.timeLeft) * 1000;
    }

    // Fortschritt in Prozent
    getProgress() {
        return (this.getElapsedTime() / APP_CONFIG.TIMER_DURATION) * 100;
    }

    // Timer mit spezifischer verbleibender Zeit setzen (für Session-Bearbeitung)
    setRemainingTime(remainingTimeMs) {
        if (remainingTimeMs <= 0) {
            this.timeLeft = 0;
            this.state = TIMER_STATES.FINISHED;
        } else {
            this.timeLeft = Math.ceil(remainingTimeMs / 1000); // Millisekunden zu Sekunden
            this.state = TIMER_STATES.STOPPED;
        }
        
        if (this.onStateChange) {
            this.onStateChange(this.state);
        }
    }
}

// Utility-Funktionen für Timer-Display
export function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function updateTimerDisplay(timerElement, timer) {
    if (timerElement) {
        timerElement.textContent = timer.getFormattedTime();
        
        // CSS-Klassen basierend auf Timer-Status
        timerElement.classList.remove('timer-active', 'timer-paused');
        
        if (timer.isRunning()) {
            timerElement.classList.add('timer-active');
        } else if (timer.isPaused()) {
            timerElement.classList.add('timer-paused');
        }
    }
}