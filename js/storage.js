// Storage-Modul für localStorage-Operationen

import { defaultBumblebees } from './constants.js';

// Hummel-Daten speichern und laden
export function saveBumblebeesToStorage(bumblebees) {
    try {
        localStorage.setItem('bumblebees', JSON.stringify(bumblebees));
    } catch (error) {
        console.error('Fehler beim Speichern im localStorage:', error);
    }
}

export function loadBumblebeesFromStorage() {
    try {
        const savedBumblebees = localStorage.getItem('bumblebees');
        if (savedBumblebees) {
            const savedData = JSON.parse(savedBumblebees);
            
            // Starte immer mit den Standard-Arten
            let bumblebees = [...defaultBumblebees];
            
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
            
            return bumblebees;
        }
    } catch (error) {
        console.error('Fehler beim Laden aus dem localStorage:', error);
    }
    
    // Bei Fehler oder wenn keine Daten vorhanden: Verwende Standard-Arten
    return [...defaultBumblebees];
}

// Umweltdaten werden jetzt sessionspezifisch verwaltet
// Die alten globalen Umweltdaten-Funktionen sind nicht mehr nötig

// Session-Verwaltung - Neue strukturierte Implementierung
const SESSIONS_STORAGE_KEY = 'hummel_sessions';
const CURRENT_SESSION_KEY = 'current_session';

// Alle Sessions als Array laden
export function getAllSessionsFromStorage() {
    try {
        const sessionsData = localStorage.getItem(SESSIONS_STORAGE_KEY);
        if (sessionsData) {
            const sessions = JSON.parse(sessionsData);
            // Sortiere nach Startzeit (neueste zuerst)
            return sessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        }
    } catch (error) {
        console.error('Fehler beim Laden aller Sessions:', error);
    }
    return [];
}

// Alle Sessions als Array speichern
function saveAllSessionsToStorage(sessions) {
    try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
        return true;
    } catch (error) {
        console.error('Fehler beim Speichern aller Sessions:', error);
        return false;
    }
}

// Einzelne Session speichern oder aktualisieren
export function saveSessionToStorage(sessionKey, sessionData) {
    try {
        const sessions = getAllSessionsFromStorage();
        const existingIndex = sessions.findIndex(s => s.id === sessionKey);
        
        if (existingIndex !== -1) {
            // Bestehende Session aktualisieren
            sessions[existingIndex] = sessionData;
        } else {
            // Neue Session hinzufügen
            sessions.unshift(sessionData);
        }
        
        return saveAllSessionsToStorage(sessions);
    } catch (error) {
        console.error('Fehler beim Speichern der Session:', error);
        return false;
    }
}

// Einzelne Session laden
export function loadSessionFromStorage(sessionKey) {
    try {
        const sessions = getAllSessionsFromStorage();
        return sessions.find(s => s.id === sessionKey) || null;
    } catch (error) {
        console.error('Fehler beim Laden der Session:', sessionKey, error);
        return null;
    }
}

// Session löschen
export function deleteSessionFromStorage(sessionId) {
    try {
        const sessions = getAllSessionsFromStorage();
        const filteredSessions = sessions.filter(s => s.id !== sessionId);
        
        const success = saveAllSessionsToStorage(filteredSessions);
        if (success) {
            console.log('Session gelöscht:', sessionId);
        }
        return success;
    } catch (error) {
        console.error('Fehler beim Löschen der Session:', error);
        return false;
    }
}

// Aktuelle Session-Verwaltung
export function saveCurrentSession(sessionData) {
    try {
        localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(sessionData));
        return true;
    } catch (error) {
        console.error('Fehler beim Speichern der aktuellen Session:', error);
        return false;
    }
}

export function loadCurrentSession() {
    try {
        const sessionData = localStorage.getItem(CURRENT_SESSION_KEY);
        if (sessionData) {
            return JSON.parse(sessionData);
        }
    } catch (error) {
        console.error('Fehler beim Laden der aktuellen Session:', error);
    }
    return null;
}

export function clearCurrentSession() {
    try {
        localStorage.removeItem(CURRENT_SESSION_KEY);
        return true;
    } catch (error) {
        console.error('Fehler beim Löschen der aktuellen Session:', error);
        return false;
    }
}

// Letzte Session für Umweltdaten-Vorausfüllung
export function getLastSessionEnvironmentalData() {
    try {
        const sessions = getAllSessionsFromStorage();
        if (sessions.length > 0) {
            const lastSession = sessions[0]; // Neueste Session
            return lastSession.environmental || null;
        }
    } catch (error) {
        console.error('Fehler beim Laden der letzten Umweltdaten:', error);
    }
    return null;
}

// Update-Check Zeitstempel
export function saveLastUpdateCheck(timestamp) {
    if (timestamp) {
        localStorage.setItem('lastUpdateCheck', timestamp.toISOString());
    }
}

export function loadLastUpdateCheck() {
    try {
        const saved = localStorage.getItem('lastUpdateCheck');
        if (saved) {
            return new Date(saved);
        }
    } catch (error) {
        console.error('Fehler beim Laden des letzten Update-Checks:', error);
    }
    return null;
}