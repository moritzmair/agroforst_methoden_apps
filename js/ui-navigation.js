// UI-Navigation und Event-Handler-Modul

import { APP_PAGES } from './constants.js';

export class UINavigation {
    constructor() {
        this.currentPage = APP_PAGES.HOME;
        this.onPageChange = null;
        this.elements = {};
    }

    // DOM-Elemente registrieren
    setElements(elements) {
        this.elements = { ...this.elements, ...elements };
    }

    // Event-Handler setzen
    setOnPageChange(callback) {
        this.onPageChange = callback;
    }

    // Zur Startseite wechseln
    showHomePage() {
        this.currentPage = APP_PAGES.HOME;
        
        if (this.elements.homePage && this.elements.countingPage) {
            this.elements.homePage.classList.remove('hidden');
            this.elements.countingPage.classList.add('hidden');
        }
        
        if (this.onPageChange) {
            this.onPageChange(this.currentPage);
        }
    }

    // Zur Zählungsseite wechseln
    showCountingPage() {
        this.currentPage = APP_PAGES.COUNTING;
        
        if (this.elements.homePage && this.elements.countingPage) {
            this.elements.homePage.classList.add('hidden');
            this.elements.countingPage.classList.remove('hidden');
        }
        
        if (this.onPageChange) {
            this.onPageChange(this.currentPage);
        }
    }

    // Aktuelle Seite abrufen
    getCurrentPage() {
        return this.currentPage;
    }

    // Prüfen ob auf bestimmter Seite
    isOnPage(page) {
        return this.currentPage === page;
    }

    // Zählungs-Status aktualisieren
    updateCountingStatus(status) {
        if (this.elements.countingStatus) {
            this.elements.countingStatus.textContent = status;
        }
    }

    // Button-Sichtbarkeit für Zählungsseite verwalten
    updateCountingButtons(state, isEditingSession = false) {
        const { startCountingButton, pauseButton, cancelButton, saveButton } = this.elements;
        const startButton = startCountingButton; // Alias für Kompatibilität
        
        if (isEditingSession) {
            // Bei Session-Bearbeitung: Speichern-Button immer anzeigen
            if (state === 'finished') {
                this.hideElements([startButton, pauseButton]);
                this.showElements([saveButton, cancelButton]);
                this.updateCountingStatus('Session bearbeiten - Zählung war bereits beendet');
            } else if (state === 'running') {
                // Timer läuft: Pausieren-Button anzeigen
                this.hideElements([startButton, saveButton]);
                this.showElements([pauseButton, cancelButton]);
                this.updateCountingStatus('Session bearbeiten - Zählung läuft');
                if (pauseButton) pauseButton.textContent = 'Pausieren';
            } else if (state === 'paused') {
                // Timer pausiert: Fortsetzen-Button (pauseButton) anzeigen
                this.hideElements([startButton]);
                this.showElements([pauseButton, cancelButton, saveButton]);
                this.updateCountingStatus('Session bearbeiten - Zählung pausiert');
                if (pauseButton) pauseButton.textContent = 'Fortsetzen';
            } else {
                // Timer gestoppt: Start-Button anzeigen
                this.showElements([startButton, saveButton, cancelButton]);
                this.hideElements([pauseButton]);
                if (startButton) startButton.textContent = 'Fortsetzen';
                this.updateCountingStatus('Session bearbeiten - Zählung kann fortgesetzt werden');
            }
            return;
        }
        
        switch (state) {
            case 'ready':
                this.showElements([startButton]);
                this.hideElements([pauseButton, saveButton]);
                if (startButton) startButton.textContent = 'Zählung starten';
                this.updateCountingStatus('Bereit zum Zählen');
                break;
                
            case 'running':
                this.hideElements([startButton, saveButton]);
                this.showElements([pauseButton, cancelButton]);
                this.updateCountingStatus('Zählung läuft');
                if (pauseButton) pauseButton.textContent = 'Pausieren';
                break;
                
            case 'paused':
                this.hideElements([startButton]);
                this.showElements([pauseButton, cancelButton, saveButton]);
                this.updateCountingStatus('Zählung pausiert - Speichern möglich');
                if (pauseButton) pauseButton.textContent = 'Fortsetzen';
                break;
                
            case 'finished':
                this.hideElements([startButton, pauseButton, cancelButton]);
                this.showElements([saveButton]);
                this.updateCountingStatus('Zählung beendet - Speichern möglich');
                break;
        }
    }

    // Elemente anzeigen
    showElements(elements) {
        elements.forEach(element => {
            if (element) {
                element.classList.remove('hidden');
            }
        });
    }

    // Elemente verstecken
    hideElements(elements) {
        elements.forEach(element => {
            if (element) {
                element.classList.add('hidden');
            }
        });
    }

    // Tab-Switching für Installationsanleitung initialisieren
    initTabSwitching() {
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
                const targetTab = document.getElementById(tabId);
                if (targetTab) {
                    targetTab.classList.add('active');
                }
            });
        });
    }

    // Umweltdaten-Feedback anzeigen
    showEnvironmentalDataFeedback() {
        alert('Umweltdaten wurden erfolgreich gespeichert.');
    }

    // Bestätigungsdialog anzeigen
    showConfirmDialog(message) {
        return confirm(message);
    }

    // Einfache Nachricht anzeigen
    showMessage(message) {
        alert(message);
    }

    // Eingabedialog anzeigen
    showInputDialog(message, defaultValue = '') {
        return prompt(message, defaultValue);
    }
}

// Utility-Funktionen für DOM-Manipulation
export function getElementById(id) {
    return document.getElementById(id);
}

export function getElementsByClassName(className) {
    return document.getElementsByClassName(className);
}

export function querySelector(selector) {
    return document.querySelector(selector);
}

export function querySelectorAll(selector) {
    return document.querySelectorAll(selector);
}

// Event-Listener-Hilfsfunktionen
export function addEventListener(element, event, handler) {
    if (element) {
        element.addEventListener(event, handler);
    }
}

export function removeEventListener(element, event, handler) {
    if (element) {
        element.removeEventListener(event, handler);
    }
}

// DOM-Ready-Hilfsfunktion
export function onDOMReady(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        callback();
    }
}

// CSS-Klassen-Hilfsfunktionen
export function addClass(element, className) {
    if (element) {
        element.classList.add(className);
    }
}

export function removeClass(element, className) {
    if (element) {
        element.classList.remove(className);
    }
}

export function toggleClass(element, className) {
    if (element) {
        element.classList.toggle(className);
    }
}

export function hasClass(element, className) {
    return element ? element.classList.contains(className) : false;
}