// Arten-Verwaltungsmodul für Hummeln und andere Insekten

import { defaultBumblebees } from './constants.js';
import { saveBumblebeesToStorage } from './storage.js';

export class SpeciesManager {
    constructor() {
        this.bumblebees = [...defaultBumblebees];
        this.onUpdate = null;
    }

    // Event-Handler setzen
    setOnUpdate(callback) {
        this.onUpdate = callback;
    }

    // Alle Arten abrufen
    getAllSpecies() {
        return this.bumblebees;
    }

    // Arten setzen (z.B. beim Laden aus Storage)
    setSpecies(species) {
        this.bumblebees = species;
        this.notifyUpdate();
    }

    // Zähler erhöhen
    incrementCount(id) {
        const beeIndex = this.bumblebees.findIndex(bee => bee.id == id);
        if (beeIndex !== -1) {
            this.bumblebees[beeIndex].count++;
            this.saveAndNotify();
            return this.bumblebees[beeIndex].count;
        }
        return 0;
    }

    // Zähler verringern
    decrementCount(id) {
        const beeIndex = this.bumblebees.findIndex(bee => bee.id == id);
        if (beeIndex !== -1 && this.bumblebees[beeIndex].count > 0) {
            this.bumblebees[beeIndex].count--;
            this.saveAndNotify();
            return this.bumblebees[beeIndex].count;
        }
        return 0;
    }

    // Neue Art hinzufügen
    addNewSpecies(name) {
        if (!name || name.trim() === '') {
            return false;
        }

        const newId = this.bumblebees.length > 0 ? Math.max(...this.bumblebees.map(bee => bee.id)) + 1 : 1;
        const newSpecies = { id: newId, name: name.trim(), count: 0 };
        
        this.bumblebees.push(newSpecies);
        this.saveAndNotify();
        return newSpecies;
    }

    // Art löschen (nur benutzerdefinierte Arten)
    deleteSpecies(id) {
        const speciesIndex = this.bumblebees.findIndex(bee => bee.id === id);
        if (speciesIndex === -1) {
            return false;
        }

        // Prüfe, ob es eine Standard-Art ist
        const isDefaultSpecies = defaultBumblebees.some(defaultBee => defaultBee.id === id);
        if (isDefaultSpecies) {
            console.warn('Standard-Arten können nicht gelöscht werden');
            return false;
        }

        const deletedSpecies = this.bumblebees[speciesIndex];
        this.bumblebees.splice(speciesIndex, 1);
        this.saveAndNotify();
        return deletedSpecies;
    }

    // Benutzerdefinierte Arten abrufen
    getCustomSpecies() {
        return this.bumblebees.filter(bee =>
            !defaultBumblebees.some(defaultBee => defaultBee.id === bee.id)
        );
    }

    // Art nach ID finden
    getSpeciesById(id) {
        return this.bumblebees.find(bee => bee.id === id);
    }

    // Alle Zähler zurücksetzen
    resetAllCounts() {
        this.bumblebees.forEach(bee => {
            bee.count = 0;
        });
        this.saveAndNotify();
    }

    // Gesamtanzahl aller gezählten Tiere
    getTotalCount() {
        return this.bumblebees.reduce((sum, bee) => sum + bee.count, 0);
    }

    // Arten mit Zählungen > 0
    getSpeciesWithCounts() {
        return this.bumblebees.filter(bee => bee.count > 0);
    }

    // Arten ohne Zählungen
    getSpeciesWithoutCounts() {
        return this.bumblebees.filter(bee => bee.count === 0);
    }

    // Deep Copy der aktuellen Arten für Session-Speicherung
    getSpeciesCopy() {
        return JSON.parse(JSON.stringify(this.bumblebees));
    }

    // Speichern und Update-Event auslösen
    saveAndNotify() {
        saveBumblebeesToStorage(this.bumblebees);
        this.notifyUpdate();
    }

    // Update-Event auslösen
    notifyUpdate() {
        if (this.onUpdate) {
            this.onUpdate(this.bumblebees);
        }
    }
}

// UI-Rendering-Funktionen
export function renderSpeciesList(container, speciesManager, onIncrement, onDecrement) {
    if (!container) return;

    container.innerHTML = '';
    const species = speciesManager.getAllSpecies();
    
    species.forEach(bee => {
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
        
        container.appendChild(beeItem);
    });
    
    // Event-Listener für die Zähler-Buttons
    container.querySelectorAll('.increment').forEach(button => {
        button.addEventListener('click', () => {
            const newCount = speciesManager.incrementCount(button.dataset.id);
            updateCounterDisplay(button.dataset.id, newCount);
            if (onIncrement) onIncrement(button.dataset.id, newCount);
        });
    });
    
    container.querySelectorAll('.decrement').forEach(button => {
        button.addEventListener('click', () => {
            const newCount = speciesManager.decrementCount(button.dataset.id);
            updateCounterDisplay(button.dataset.id, newCount);
            if (onDecrement) onDecrement(button.dataset.id, newCount);
        });
    });
}

export function updateCounterDisplay(id, count) {
    const counterElement = document.querySelector(`.counter-button[data-id="${id}"]`)
        ?.parentElement?.querySelector('.counter-value');
    if (counterElement) {
        counterElement.textContent = count;
    }
}

export function renderCustomSpeciesSelect(selectElement, speciesManager) {
    if (!selectElement) return;

    // Dropdown leeren
    selectElement.innerHTML = '<option value="">Wähle eine Art zum Löschen...</option>';
    
    // Benutzerdefinierte Arten hinzufügen
    const customSpecies = speciesManager.getCustomSpecies();
    customSpecies.forEach(bee => {
        const option = document.createElement('option');
        option.value = bee.id;
        option.textContent = bee.name;
        selectElement.appendChild(option);
    });
}

export function updateDeleteButton(deleteButton, selectElement) {
    if (deleteButton && selectElement) {
        deleteButton.disabled = !selectElement.value;
    }
}