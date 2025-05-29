# Hummelzähler - Progressive Web App

Eine Progressive Web App (PWA) zum Zählen von Hummeln während einer Feldbegehung. Die App bietet einen 5-Minuten-Countdown und ermöglicht es, verschiedene Hummelarten zu zählen.

## Funktionen

- 5-Minuten-Countdown für die Zählung
- Zählen verschiedener Hummelarten mit + und - Buttons
- Hinzufügen neuer Hummelarten
- Vollständige Offline-Funktionalität
- Installierbar auf dem Homescreen (iOS und Android)
- Responsive Design für mobile Geräte

## Installation auf dem Homescreen

### Android

1. Öffne die Seite in Chrome
2. Tippe auf die drei Punkte (⋮) in der oberen rechten Ecke
3. Wähle "Zum Startbildschirm hinzufügen"
4. Bestätige mit "Hinzufügen"

### iPhone

1. Öffne die Seite in Safari
2. Tippe auf das Teilen-Symbol (□↑) unten in der Mitte
3. Scrolle nach unten und wähle "Zum Home-Bildschirm"
4. Tippe oben rechts auf "Hinzufügen"

## Lokale Entwicklung

Um die App lokal zu entwickeln und zu testen:

1. Klone das Repository
2. Starte einen lokalen Webserver, z.B. mit Python:
   ```
   python -m http.server 8000
   ```
   oder mit Node.js:
   ```
   npx serve
   ```
3. Öffne die App im Browser unter `http://localhost:8000` oder der entsprechenden URL

## Icon-Generierung

Die App enthält einen Icon-Generator, mit dem du die benötigten App-Icons erstellen kannst:

1. Öffne `icon-generator.html` in deinem Browser
2. Klicke auf "Alle Icons generieren"
3. Lade jedes Icon herunter und speichere es im `icons`-Verzeichnis
4. Aktualisiere bei Bedarf die Pfade in `manifest.json` und `service-worker.js`

## Hosting auf einer Domain

Um die App auf einer Domain zu hosten:

1. Lade alle Dateien auf deinen Webserver hoch
2. Stelle sicher, dass der Server HTTPS unterstützt (erforderlich für PWAs)
3. Konfiguriere den Server so, dass er die richtigen MIME-Typen für die Dateien sendet:
   - `manifest.json`: `application/manifest+json`
   - `service-worker.js`: `application/javascript`

### Hosting-Optionen

- **GitHub Pages**: Kostenlos und einfach einzurichten
- **Netlify**: Bietet kostenloses Hosting mit automatischem HTTPS
- **Vercel**: Ähnlich wie Netlify, mit guter Integration für Frontend-Projekte
- **Firebase Hosting**: Einfach einzurichten und bietet zusätzliche Backend-Dienste

## Anpassung

Du kannst die App nach deinen Bedürfnissen anpassen:

- Ändere die Farben in `styles.css` (CSS-Variablen am Anfang der Datei)
- Passe die Countdown-Zeit in `app.js` an (Variable `timeLeft`)
- Füge weitere Funktionen hinzu, z.B. Export der Zähldaten als CSV

## Lizenz

Frei zur Verwendung und Anpassung.