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

// Umweltdaten speichern und laden
export function saveEnvironmentalDataToStorage(environmentalData) {
    try {
        localStorage.setItem('environmentalData', JSON.stringify(environmentalData));
    } catch (error) {
        console.error('Fehler beim Speichern der Umweltdaten:', error);
    }
}

export function loadEnvironmentalDataFromStorage() {
    try {
        const savedData = localStorage.getItem('environmentalData');
        if (savedData) {
            return JSON.parse(savedData);
        }
    } catch (error) {
        console.error('Fehler beim Laden der Umweltdaten:', error);
    }
    
    return {
        windStrength: 0,
        temperature: null,
        cloudCover: 0
    };
}

// Session-Verwaltung
export function saveSessionToStorage(sessionKey, sessionData) {
    try {
        localStorage.setItem(sessionKey, JSON.stringify(sessionData));
        updateSessionsList(sessionKey);
        return true;
    } catch (error) {
        console.error('Fehler beim Speichern der Session:', error);
        return false;
    }
}

export function loadSessionFromStorage(sessionKey) {
    try {
        const sessionData = localStorage.getItem(sessionKey);
        if (sessionData) {
            return JSON.parse(sessionData);
        }
    } catch (error) {
        console.error('Fehler beim Laden der Session:', sessionKey, error);
    }
    return null;
}

export function deleteSessionFromStorage(sessionId) {
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

export function getAllSessionsFromStorage() {
    try {
        const sessionsList = JSON.parse(localStorage.getItem('sessionsList') || '[]');
        const sessions = [];
        
        sessionsList.forEach(sessionKey => {
            const sessionData = loadSessionFromStorage(sessionKey);
            if (sessionData) {
                sessions.push(sessionData);
            }
        });
        
        return sessions;
    } catch (error) {
        console.error('Fehler beim Laden aller Sessions:', error);
        return [];
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