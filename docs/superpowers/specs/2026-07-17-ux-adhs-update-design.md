# FamilyBoard — UX/ADHS-Update Design-Spec

**Datum:** 2026-07-17
**Status:** Genehmigt
**Kontext:** Re-Evaluation nach UX-Designer + ADHS-Psychologe + User-Feedback

---

## 1. Streak-System — Grace Days + Belohnungen

### Grace Day (Streak-Schutz)
- **Button "Streak retten"** auf Dashboard (nach Streak-Card)
- Kinder: 1x pro Woche nutzbar
- Eltern: unbegrenzt (Urlaub, Krankheit, Oma-Tage)
- Speichert in `members.streak_saves_used` (Wochen-Reset) und `members.streak_save_available`
- Bei Nutzung: streak wird nicht zurückgesetzt, stattdessen "gestern" als aktiv markiert

### Streak-Belohnungen
| Streak | Abzeichen | Name |
|--------|-----------|------|
| 3 Tage | 🔥 | Feuer-Laune |
| 7 Tage | ⚡ | Blitz-Streak |
| 14 Tage | 💎 | Diamant-Fokus |
| 30 Tage | 👑 | Streak-König |

### Individuelle Task-Streaks
- Zählt pro Task wie viele Tage in Folge erledigt
- Speichert in `tasks.current_streak` und `tasks.longest_streak`
- Zeigt "🔥 3 Tage" neben dem Task in Session Active/Result

---

## 2. Timer-Logik — Stoppuhr statt Countdown

### Modus: Timer (Stoppuhr)
- Zeigt verstrichene Zeit, nicht Countdown
- Nach 5 Minuten: "Zeit! ⏰ Du hast X geschafft!"
- **Option:** "Weitermachen?" Button (automatisch nach 5 Min sichtbar)
- Bonus für Weitermachen:
  - +5 XP pro zusätzliche Minute
  - Ab 7 Min: "Fokus-Star" ⭐ Abzeichen
  - Ab 10 Min: "Hyperfocus" 🧠 Abzeichen
  - Ab 15 Min: "Meister-Fokus" 🏆 Abzeichen
- Timer läuft weiter, Kind kann jederzeit "Fertig" drücken

### Modus: Frei
- Kein Timer, nur Stoppuhr (verstrichene Zeit)
- Gleiche Bonus-Regeln wie Timer-Modus
- "Super Fokus! Das sind schon X Minuten!"-Feedback

### Technische Umsetzung
- `SessionActive.tsx`: Stoppuhr-Logik (elapsed zählt hoch, kein timeLeft)
- Timer-Option: Nach 5 Min automatisch "Weitermachen?"-Overlay
- XP-Berechnung: 10XP/Task + 5XP/Bonus + 5XP/min ab 5 Min

---

## 3. Session-State in localStorage

### Daten die gespeichert werden
```typescript
interface SessionState {
  tasks: TaskRow[]
  completedTaskIds: number[]
  elapsed: number
  mode: 'timer' | 'free'
  startedAt: string
}
```

### Logik
- Bei Session-Start: State in `localStorage.setItem('activeSession', JSON.stringify(state))`
- Bei App-Open: Prüfen ob aktive Session existiert → "Weitermachen?"-Dialog
- Bei Session-Ende (navigate zu Result): `localStorage.removeItem('activeSession')`
- Bei Browser-Crash/Refresh: State wiederherstellen

### UI
- Modal beim Dashboard-Laden: "Du hast eine unvollendete Session! Weitermachen?"
- Buttons: "Ja, weiter!" / "Nein, löschen"

---

## 4. Unerledigte Tasks — Mut machen

### Änderungen
- **Kein ❌** bei unerledigten Tasks in Session Active → grauer Kreis ○
- **Session Result:** "Du hast 2 von 3 geschafft! Super! Die 3. wartet auf dich morgen! 💪"
- **Retry-Button:** "Nochmal versuchen!" mit denselben Tasks
- **Progress-Historie:** "Letzte Woche: 5/15 → Diese Woche: 8/15! 📈"

### Texte
| Status | Text |
|--------|------|
| Alle geschafft | "Alles geschafft! 🎉" |
| Teilweise | "Super gemacht! {X} von {Y} erledigt! 💪" |
| Keine | "Beim nächsten Mal! Jeder Schritt zählt! 🌱" |

---

## 5. P0: Kontraste + Touch-Targets

### Farbänderungen
| Element | Alt | Neu | Kontrast |
|---------|-----|-----|----------|
| Muted Text | #B8B0C8 | #8E8AA0 | 4.5:1 ✅ |
| Hell Text | #D0C8E0 | #9E96B0 | 4.0:1 ✅ |
| Border | #E0D6F2 | #C8BEE0 | 2.5:1 ✅ |
| Grün (Text weiß) | #00B894 | #00A381 | 3.0:1 ✅ |
| Rot (Text weiß) | #FF6B6B | #E05555 | 3.2:1 ✅ |

### Touch-Targets
- BottomNav Items: mindestens 44x44px
- Checkboxes: mindestens 44x44px
- Grip-Icons: mindestens 44x44px
- Alle Buttons: mindestens 44px Höhe

---

## 6. P2: Login + Navigation

### Login
- Großer Play-Button 🎮 statt "Als Kind starten"
- Animation: Button pulsiert leicht

### Zurück-Button
- Session Active: "✕" oben links → "Wirklich abbrechen?" Dialog
- Session Free: "✕" oben links → gleicher Dialog
- Bei Abbruch: Session-State löschen, zurück zu Dashboard

---

## 7. P2: XP-Animation + Level-Up

### XP-Counter
- In SessionResult: Zahlen von 0 hochzählen (0 → 10 → 20 → 35)
- Dauer: 1.5 Sekunden

### Level-Up
- Modal mit Feuerwerk-Animation (CSS)
- "LEVEL UP! 🎉" + neues Level-Emoji + Name
- Dauer: 3 Sekunden oder Tap zum Schließen

---

## 8. P2: Fokus-Abzeichen

| Abzeichen | Bedingung | Emoji |
|-----------|-----------|-------|
| Fokus-Star | Session ≥ 7 Min | ⭐ |
| Hyperfocus | Session ≥ 10 Min | 🧠 |
| Meister-Fokus | Session ≥ 15 Min | 🏆 |
| Early Bird | Session vor 9 Uhr | 🌅 |
| Nachteule | Session nach 20 Uhr | 🦉 |

---

## Dateien die geändert werden

| Datei | Änderungen |
|-------|------------|
| `src/lib/gamification.ts` | Streak-Berechnung mit Grace Day, Fokus-Abzeichen |
| `src/pages/Dashboard.tsx` | Streak-Schutz-Button, Session-State Check |
| `src/pages/SessionActive.tsx` | Stoppuhr-Logik, Weitermachen-Overlay, kein ❌ |
| `src/pages/SessionFree.tsx` | Stoppuhr-Logik |
| `src/pages/SessionResult.tsx` | XP-Animation, Retry-Button, mutige Texte |
| `src/pages/Login.tsx` | Play-Button |
| `src/pages/Achievements.tsx` | Streak-Belohnungen, Fokus-Abzeichen |
| `src/pages/Backlog.tsx` | Touch-Targets |
| `src/components/layout/BottomNav.tsx` | Touch-Targets 44px |
| `src/components/CameraCapture.tsx` | (bereits gefixt) |
| `src/store/authStore.ts` | Session-State Helper |
| `src/types/supabase.ts` | Neue Felder für Streak-Schutz |
| `index.css` | Farbänderungen, Touch-Target-Variablen |
