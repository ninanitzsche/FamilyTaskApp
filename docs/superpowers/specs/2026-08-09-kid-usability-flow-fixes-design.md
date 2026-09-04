# Design: Kindgerechte Flow-Fixes (Identität, Kamera, Backlog-Schranke, Frei-Hinweis)

Datum: 2026-08-09
Status: Design genehmigt (2026-08-09)
Scope: 4 kleine UX-Anpassungen aus dem UX-Review. Bewusst AUSGESCHLOSSEN: alles rund um
Redeems/Streak-Save — dafür kommt ein separates Feature; das Feedback dazu ist notiert,
wird hier nicht angefasst.

## 1. Identität am Start (Login)

**Ziel:** Kind sieht auf dem Startbildschirm, wer dran ist. Kein echtes Wechseln, kein Auth-Umbau.

- **Cache:** localStorage-Key `familyboard:lastMember` mit `{ name, color, initial, familyName }`.
- **Setzen:** in `authStore.init()` sobald `member` geladen ist (nach erfolgreichem Member-Lookup).
- **Login.tsx:**
  - Cache vorhanden → Avatar (Farbe aus `color`, Initial aus `initial`) + „Hallo {Name}!" +
    Familienname unter dem Play-Button; Play-Button/`signInAsChild` unverändert.
  - Kein Cache → generischer Ninja wie bisher.
- **Details:** Cache bleibt nach Abmelden erhalten (Zeigt zuletzt aktives Kind). `initial` = erster
  Buchstabe des Namens (wie im Avatar überall üblich). Keine DB-Änderung.

## 2. Kamera-Erklärung (CameraCapture)

**Ziel:** Browser-Permission erscheint nicht mehr unvermittelt; Kind bekommt Kontext.

- **Start-Phase:** CameraCapture rendert initial (auf dem schwarzen Overlay):
  - 📸, Titel „Foto aufnehmen", Erklärtext „Wir brauchen die Kamera für dein Vorher-Foto."
  - Primär-Button **„Kamera starten"** (Vollbreite, `bg-gradient …`-Stil wie bestehende CTAs).
  - Sekundär-Button **„Aus Galerie wählen"** (öffnet `fileInputRef`).
- **Verhalten:** `getUserMedia` läuft nicht mehr bei Mount, sondern erst nach Tap auf „Kamera starten"
  (`status: 'start' | 'running' | 'error'`). Bei `error` → bestehender Fehler-Dialog mit Galerie-Fallback.
- **Unverändert:** Aufnahme-UI, Capture-Logik, Galerie-Handler, `aria-labelledby`, Schließen.

## 3. Backlog: Eltern-Schranke via Langdruck

**Ziel:** Bearbeiten/Löschen nicht mehr frei sichtbar; hinter Langdruck versteckt.

- **Karte (`SortableTask`):**
  - Pencil- und X-Buttons **entfernt**.
  - Drag-Handle bleibt (Umordnen für alle Kinder sichtbar und nutzbar).
  - Neuer `onPointerDown`-Timer (~500 ms) mit Abbruch bei `onPointerUp`/`onPointerLeave`/
    Bewegung > Schwellwert → lösen **Langdruck** aus.
  - Auslöser öffnet Bottom-Sheet statt direkter Aktion.
- **Bottom-Sheet „Aufgabe":**
  - [Bearbeiten] → öffnet den bestehenden Edit-Dialog (`handleEditStart`).
  - [Löschen] → wechselt im Sheet in Bestätigungszustand: „Wirklich löschen?" + [Ja, löschen]/[Abbrechen].
    Ja → `handleDelete`.
  - [Abbrechen] → schließt Sheet.
  - `role="dialog"` + `aria-modal` + `aria-labelledby` (Muster wie bestehende Dialogs).
- **Anlegen/Umordnen:** unverändert (Plus-Button, Vorschläge, Drag).

## 4. „Frei"-Hinweis (SessionSelect)

- Unter der Modus-Toggle-Gruppe, nur wenn `mode === 'free'`: kleines Label
  „So lange du magst – ohne Timer" (`text-[#72618F]`, ca. 11–12px).
- Kein zusätzlicher Text im Timer-Modus.

## Verifikation

- `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test` (82 Tests) grün.
- Manuell: Langdruck auf Backlog-Karte, Kamera-Start-Phase, Login-Cache nach Abmelden.

## Nicht in diesem Umfang

- Multi-Kind-Wechsel/Auth-Umbau, Eltern-Login/PIN, Redeem/Streak-Save-UX (kommendes Feature),
  Backlog-„Anlegen"-Schranke (bewusst offen gelassen).
