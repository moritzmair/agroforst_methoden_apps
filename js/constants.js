// Datenstrukturen und Konstanten für die Hummelzähler-App

// Standard-Datenstruktur für die Hummeln (diese Arten werden immer angezeigt)
export const defaultBumblebees = [
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

// App-Konfiguration
export const APP_CONFIG = {
    TIMER_DURATION: 5 * 60, // 5 Minuten in Sekunden
    TARGET_DISTANCE: 50, // Zieldistanz in Metern
    UPDATE_CHECK_INTERVAL: 5 * 60 * 1000, // 5 Minuten für automatische Update-Prüfung
    STARTUP_UPDATE_DELAY: 2000 // Verzögerung für Update-Check beim Start
};

// App-Status Enums
export const APP_PAGES = {
    HOME: 'home',
    ENVIRONMENTAL: 'environmental',
    COUNTING: 'counting'
};

export const TIMER_STATES = {
    STOPPED: 'stopped',
    RUNNING: 'running',
    PAUSED: 'paused',
    FINISHED: 'finished'
};