// Session-Management und Export-Funktionalität

import { APP_CONFIG } from './constants.js';
import {
    saveSessionToStorage,
    getAllSessionsFromStorage,
    deleteSessionFromStorage,
    loadSessionFromStorage,
    saveCurrentSession,
    loadCurrentSession,
    clearCurrentSession,
    getLastSessionEnvironmentalData
} from './storage.js';

export class SessionManager {
    constructor() {
        this.onSessionsUpdate = null;
        this.currentSession = null;
    }

    // Event-Handler setzen
    setOnSessionsUpdate(callback) {
        this.onSessionsUpdate = callback;
    }

    // Aktuelle Session-Verwaltung
    createNewSession(sessionStartTime, environmentalData) {
        if (!sessionStartTime) {
            throw new Error('Keine Startzeit der Session gefunden.');
        }
        
        // Erstelle einen eindeutigen Schlüssel basierend auf dem Startzeitpunkt
        const sessionKey = `session_${sessionStartTime.getTime()}`;
        
        // Formatiere das Datum für die Anzeige
        const displayDate = this.formatSessionDate(sessionStartTime);
        
        // Erstelle das Session-Objekt
        const sessionData = {
            id: sessionKey,
            startTime: sessionStartTime.toISOString(),
            displayDate: displayDate,
            bumblebees: [], // Wird später mit Arten gefüllt
            totalCount: 0,
            finalDistance: 0,
            isComplete: false,
            elapsedTime: 0,
            remainingTime: APP_CONFIG.TIMER_DURATION * 1000,
            environmental: environmentalData || {}
        };
        
        // Als aktuelle Session setzen
        this.currentSession = sessionData;
        saveCurrentSession(sessionData);
        
        console.log('Neue Session erstellt:', sessionKey);
        return sessionData;
    }

    // Aktuelle Session laden
    loadCurrentSession() {
        this.currentSession = loadCurrentSession();
        return this.currentSession;
    }

    // Aktuelle Session abrufen
    getCurrentSession() {
        return this.currentSession;
    }

    // Aktuelle Session aktualisieren
    updateCurrentSession(speciesData, elapsedTime, isComplete = false) {
        if (!this.currentSession) {
            throw new Error('Keine aktuelle Session vorhanden.');
        }

        // Berechne die Gesamtanzahl der gezählten Tiere
        const totalCount = speciesData.reduce((sum, bee) => sum + bee.count, 0);
        
        // Berechne die tatsächliche Distanz basierend auf der verstrichenen Zeit
        let actualDistance = APP_CONFIG.TARGET_DISTANCE;
        if (elapsedTime !== null) {
            const timeRatio = elapsedTime / (APP_CONFIG.TIMER_DURATION * 1000);
            actualDistance = APP_CONFIG.TARGET_DISTANCE * timeRatio;
        }
        
        // Berechne verbleibende Zeit
        let remainingTime = 0;
        if (elapsedTime !== null) {
            remainingTime = (APP_CONFIG.TIMER_DURATION * 1000) - elapsedTime;
            remainingTime = Math.max(0, remainingTime);
        }

        // Session-Daten aktualisieren
        this.currentSession.bumblebees = JSON.parse(JSON.stringify(speciesData)); // Deep copy
        this.currentSession.totalCount = totalCount;
        this.currentSession.finalDistance = actualDistance;
        this.currentSession.isComplete = isComplete;
        this.currentSession.elapsedTime = elapsedTime;
        this.currentSession.remainingTime = remainingTime;

        // In localStorage speichern
        saveCurrentSession(this.currentSession);
        
        console.log('Aktuelle Session aktualisiert:', this.currentSession.id);
        return this.currentSession;
    }

    // Aktuelle Session mit Umweltdaten aktualisieren
    updateCurrentSessionEnvironmental(environmentalData) {
        if (!this.currentSession) {
            throw new Error('Keine aktuelle Session vorhanden.');
        }

        this.currentSession.environmental = { ...environmentalData };
        saveCurrentSession(this.currentSession);
        
        console.log('Umweltdaten der aktuellen Session aktualisiert:', this.currentSession.id);
        return this.currentSession;
    }

    // Aktuelle Session als abgeschlossen speichern
    saveCurrentSession() {
        if (!this.currentSession) {
            throw new Error('Keine aktuelle Session vorhanden.');
        }

        const success = saveSessionToStorage(this.currentSession.id, this.currentSession);
        
        if (success) {
            console.log('Aktuelle Session gespeichert:', this.currentSession.id);
            clearCurrentSession();
            this.currentSession = null;
            this.notifySessionsUpdate();
            return true;
        } else {
            throw new Error('Fehler beim Speichern der Session. Möglicherweise ist der Speicher voll.');
        }
    }

    // Aktuelle Session verwerfen
    discardCurrentSession() {
        if (this.currentSession) {
            clearCurrentSession();
            this.currentSession = null;
            console.log('Aktuelle Session verworfen');
        }
    }

    // Letzte Umweltdaten für Vorausfüllung abrufen
    getLastEnvironmentalData() {
        return getLastSessionEnvironmentalData();
    }

    // Neue Zählsession speichern (Legacy-Kompatibilität)
    saveCountingSession(speciesData, sessionStartTime, environmentalData, isComplete = true, elapsedTime = null) {
        // Falls eine aktuelle Session existiert, aktualisiere sie
        if (this.currentSession) {
            this.updateCurrentSession(speciesData, elapsedTime, isComplete);
            if (environmentalData) {
                this.updateCurrentSessionEnvironmental(environmentalData);
            }
            return this.saveCurrentSession();
        }
        
        // Fallback: Erstelle neue Session direkt (für Legacy-Code)
        if (!sessionStartTime) {
            throw new Error('Keine Startzeit der Session gefunden.');
        }
        
        const sessionKey = `session_${sessionStartTime.getTime()}`;
        const displayDate = this.formatSessionDate(sessionStartTime);
        const totalCount = speciesData.reduce((sum, bee) => sum + bee.count, 0);
        
        let actualDistance = APP_CONFIG.TARGET_DISTANCE;
        if (elapsedTime !== null) {
            const timeRatio = elapsedTime / (APP_CONFIG.TIMER_DURATION * 1000);
            actualDistance = APP_CONFIG.TARGET_DISTANCE * timeRatio;
        }
        
        let remainingTime = 0;
        if (elapsedTime !== null) {
            remainingTime = (APP_CONFIG.TIMER_DURATION * 1000) - elapsedTime;
            remainingTime = Math.max(0, remainingTime);
        }

        const sessionData = {
            id: sessionKey,
            startTime: sessionStartTime.toISOString(),
            displayDate: displayDate,
            bumblebees: JSON.parse(JSON.stringify(speciesData)),
            totalCount: totalCount,
            finalDistance: actualDistance,
            isComplete: isComplete,
            elapsedTime: elapsedTime,
            remainingTime: remainingTime,
            environmental: environmentalData || {}
        };
        
        const success = saveSessionToStorage(sessionKey, sessionData);
        
        if (success) {
            console.log('Zählsession gespeichert:', sessionKey);
            this.notifySessionsUpdate();
            return sessionData;
        } else {
            throw new Error('Fehler beim Speichern der Session. Möglicherweise ist der Speicher voll.');
        }
    }

    // Alle Sessions abrufen
    getAllSessions() {
        return getAllSessionsFromStorage();
    }

    // Session löschen
    deleteSession(sessionId) {
        const success = deleteSessionFromStorage(sessionId);
        if (success) {
            this.notifySessionsUpdate();
        }
        return success;
    }

    // Session aktualisieren
    updateSession(sessionId, sessionData) {
        const success = saveSessionToStorage(sessionId, sessionData);
        if (success) {
            this.notifySessionsUpdate();
        }
        return success;
    }

    // Session-Details abrufen
    getSessionDetails(sessionId) {
        return loadSessionFromStorage(sessionId);
    }

    // Datum formatieren
    formatSessionDate(date) {
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

    // Sessions-Update-Event auslösen
    notifySessionsUpdate() {
        if (this.onSessionsUpdate) {
            this.onSessionsUpdate();
        }
    }


    // Alle Sessions als CSV exportieren
    exportAllSessionsAsCSV() {
        const sessions = this.getAllSessions();
        
        if (sessions.length === 0) {
            throw new Error('Keine gespeicherten Zählungen vorhanden.');
        }
        
        try {
            let csvContent = '';
            
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

            // Zeitpunkt-Zeile
            csvContent += 'Zeitpunkt';
            sessions.forEach((session, index) => {
                const sessionDate = new Date(session.startTime);
                const dateStr = sessionDate.toLocaleDateString('de-DE');
                const timeStr = sessionDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                csvContent += `,"${dateStr} ${timeStr}"`;
            });
            csvContent += '\n';
            
            // Umweltdaten-Zeilen
            csvContent += 'Windstärke';
            sessions.forEach(session => {
                const environmental = session.environmental || {};
                const windStrength = environmental.windStrength || '';
                csvContent += `,${windStrength}`;
            });
            csvContent += '\n';
            
            csvContent += 'Temperatur (°C)';
            sessions.forEach(session => {
                const environmental = session.environmental || {};
                const temperature = environmental.temperature !== null ? environmental.temperature : '';
                csvContent += `,${temperature}`;
            });
            csvContent += '\n';
            
            csvContent += 'Wolkenbedeckung (0-8)';
            sessions.forEach(session => {
                const environmental = session.environmental || {};
                const cloudCover = environmental.cloudCover || '';
                csvContent += `,${cloudCover}`;
            });
            csvContent += '\n';
            
            csvContent += 'Häufigste Blüte';
            sessions.forEach(session => {
                const environmental = session.environmental || {};
                const mostVisitedFlower = environmental.mostVisitedFlower || '';
                csvContent += `,"${mostVisitedFlower}"`;
            });
            csvContent += '\n';
            
            csvContent += '2. häufigste Blüte';
            sessions.forEach(session => {
                const environmental = session.environmental || {};
                const secondVisitedFlower = environmental.secondVisitedFlower || '';
                csvContent += `,"${secondVisitedFlower}"`;
            });
            csvContent += '\n';
            
            csvContent += '3. häufigste Blüte';
            sessions.forEach(session => {
                const environmental = session.environmental || {};
                const thirdVisitedFlower = environmental.thirdVisitedFlower || '';
                csvContent += `,"${thirdVisitedFlower}"`;
            });
            csvContent += '\n';
            
            csvContent += 'Bereich';
            sessions.forEach(session => {
                const environmental = session.environmental || {};
                const areaType = environmental.areaType || '';
                csvContent += `,"${areaType}"`;
            });
            csvContent += '\n';
            
            // Leerzeile zur Trennung
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
            
            // Dateiname mit aktuellem Datum
            const now = new Date();
            const filename = `hummelzaehlungen_alle_${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}.csv`;
            
            this.downloadCSV(csvContent, filename);
            
            return `CSV-Datei mit ${sessions.length} Zählungen wurde heruntergeladen.`;
            
        } catch (error) {
            console.error('Fehler beim Erstellen der CSV-Datei:', error);
            throw new Error('Fehler beim Erstellen der CSV-Datei.');
        }
    }

    // CSV-Download-Hilfsfunktion
    downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Session-Details als Text formatieren
    formatSessionDetails(sessionId) {
        try {
            const session = this.getSessionDetails(sessionId);
            if (!session) {
                return 'Zählung nicht gefunden.';
            }
            
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
            
            return detail;
            
        } catch (error) {
            console.error('Fehler beim Anzeigen der Session-Details:', error);
            return 'Fehler beim Laden der Zählungsdetails.';
        }
    }
}

// UI-Rendering-Funktionen
export function renderSessionsList(container, sessionManager) {
    if (!container) return;

    const sessions = sessionManager.getAllSessions();
    container.innerHTML = '';
    
    if (sessions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 1rem;">Keine gespeicherten Zählungen vorhanden.</p>';
        return;
    }
    
    sessions.forEach(session => {
        const sessionItem = document.createElement('div');
        sessionItem.className = 'session-item';
        // Status-Anzeige für vollständige vs. vorzeitig beendete Zählungen
        const statusText = session.isComplete !== false ? 'Vollständig' : 'Vorzeitig beendet';
        const statusClass = session.isComplete !== false ? 'status-complete' : 'status-incomplete';
        
        // Zeitanzeige für vorzeitig beendete Zählungen
        let timeInfo = '';
        if (session.isComplete === false) {
            if (session.elapsedTime) {
                const elapsedMinutes = Math.floor(session.elapsedTime / 60000);
                const elapsedSeconds = Math.floor((session.elapsedTime % 60000) / 1000);
                timeInfo = ` | Gelaufen: ${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')}`;
            }
            
            if (session.remainingTime && session.remainingTime > 0) {
                const remainingMinutes = Math.floor(session.remainingTime / 60000);
                const remainingSeconds = Math.floor((session.remainingTime % 60000) / 1000);
                timeInfo += ` | Verbleibend: ${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;
            }
        }
        
        sessionItem.innerHTML = `
            <div class="session-info">
                <div class="session-date">${session.displayDate}</div>
                <div class="session-details">
                    Gesamt: ${session.totalCount} Tiere |
                    Distanz: ${session.finalDistance.toFixed(1)}m${timeInfo}
                </div>
                <div class="session-status ${statusClass}">${statusText}</div>
            </div>
            <div class="session-actions">
                <button class="session-button edit-button" data-session-id="${session.id}">
                    Bearbeiten
                </button>
                <button class="session-button detail-button" data-session-id="${session.id}">
                    Details
                </button>
                <button class="session-button delete-button" data-session-id="${session.id}" data-display-date="${session.displayDate}">
                    Löschen
                </button>
            </div>
        `;
        
        container.appendChild(sessionItem);
    });
}