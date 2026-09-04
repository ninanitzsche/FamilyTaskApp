# Design: Bug-Fixes aus Testbeleg + Kind-Schnellwechsel

Datum: 2026-08-09
Status: Freigegeben

## Kontext

Der Testbeleg `Bugs.rtf` (Kindertest) nennt 8 Punkte. Diese Spec setzt die
bewerteten und freigegebenen Empfehlungen um:

1. Toter 🎮-Kreis oben rechts im Dashboard (`Dashboard.tsx:132`) → echtes
   Profil-Element.
2. „Benutzer ändern…wo?" → Weg zum Profil sichtbar machen + Schnellwechsel.
3. „Aufgabe, die lange nicht gemacht wurde, soll oben stehen und motivieren"
   → „Das ist lange fällig!"-Karte.
4. „Heute geschafft" soll weiter oben stehen.
5. Wochen-Challenge ist unklar → Erklärzeile.
6. „6 Punkte an jeder Karte" (Sortier-Griff) nicht verständlich → Hinweis.
7. Wochen-Vergleich ist okay → keine Änderung.
8. Redeem/Streak-Save und Template-Namen → bewusst nicht in Scope.

## Entscheidungen

- Schnellwechsel: **Variante A – gespeicherte Auth-Sessions** (keine
  SQL-Migration, kein RLS-Eingriff).
- Mitglieder sind 1:1 an anonyme Auth-Accounts gebunden
  (`members.auth_id`). Wechsel = gespeicherte Session via
  `supabase.auth.setSession()` wiederherstellen.

## Änderungen

### 1. Dashboard: Avatar statt toter 🎮-Kreis

`Dashboard.tsx` Header-Zeile: statt des Deko-`<div>` ein `<button>` mit dem
Avatar des Kindes (Initiale, Hintergrund `member.color`). Klick →
`navigate('/profile')`. `aria-label="Profil öffnen"`.

### 2. getDueTask-Helper (TDD)

Neue Funktion in `src/lib/tasks.ts`:

```
getDueTask(tasks, memberId, getAssigneeName, now = new Date()): TaskRow | null
```

- Nur Aufgaben mit `getTaskStatus(...).available === true`.
- Sortierung: nie erledigt (`last_completed_at === null`) zuerst, dann älteste
  `last_completed_at` zuerst.
- Rückgabe: erste verfügbare Aufgabe oder `null`.

Tests in `src/__tests__/due-task.test.ts`:
- `null` bei leerer Liste.
- Nie erledigte Aufgabe vor erledigten.
- Unter erledigten: älteste zuerst.
- Aufgaben anderer Assignees ausgeschlossen.
- Aufgaben im Cooldown ausgeschlossen.
- `null`, wenn alle Aufgaben nicht verfügbar.

### 3. Dashboard: „Heute geschafft" nach oben + fällige Aufgabe

- „Heute geschafft"-Block von unten (nach „LOS GEHT'S") direkt hinter die
  Header-Zeile verschieben.
- Neue Karte **„Das ist lange fällig!"** direkt darunter, nur wenn ein
  `getDueTask`-Ergebnis existiert: Bild/Emoji + Titel + Label („Noch nie
  erledigt" bzw. „Vor X Tagen"). Tap → `navigate('/session/active', { state:
  { tasks: [task] } })`.
- Dashboard lädt dafür zusätzlich die Familien-Aufgaben
  (`getFamilyTasks`).
- Hilfsfunktion `getDaysAgoLabel(last_completed_at, now)` in
  `lib/tasks.ts` („Noch nie erledigt" / „Vor X Tagen"), mit Tests.

### 4. WeeklyMission: Erklärzeile

`WeeklyMission.tsx`: kleine Zeile unter dem Titel „3 zufällige Aufgaben diese
Woche – schaffst du alle, gibt's +50 XP".

### 5. Backlog: Hinweis-Banner

`Backlog.tsx`: dismissibles Banner am Seitenanfang, einmal pro Gerät:
„👆 Halten & ziehen zum Sortieren · Lang drücken zum Bearbeiten".
Dismiss-Status in localStorage (`familyboard:backlogHintDismissed`).

### 6. memberSessionCache (TDD)

Neues Modul `src/lib/memberSessionCache.ts`:

```
interface MemberCacheEntry {
  memberId: number
  name: string
  color: string
  role: string
  familyId: number
  familyName: string
  session: { access_token: string; refresh_token: string }
}
```

API: `loadMemberSessions()`, `saveMemberSession(entry)`,
`getMemberSession(memberId)`, `clearMemberSessions()`. Key:
`familyboard:memberSessions`. Fehler (Corrupt JSON, localStorage nicht
verfügbar) werden abgefangen.

Tests in `src/__tests__/member-session-cache.test.ts`:
- leer bei Start, upsert per memberId, get, clear, Corrupt-JSON, mehrere
  Mitglieder.

### 7. authStore: Session-Cachen + switchToMember

`src/store/authStore.ts`:
- In `init`, nach erfolgreichem Mitglieds-Lookup: aktuelle Session
  (`supabase.auth.getSession()`) unter `member.id` cachen.
- Neue Aktion `switchToMember(session)` → `supabase.auth.setSession(session)`.
  Der bestehende `onAuthStateChange` löst das Mitglied danach auf.
- `signOut` löscht den memberSessionCache **nicht**.

### 8. Login: Schnellwechsel-UI

`Login.tsx`:
- Geladene Mitglieder aus `loadMemberSessions()` anzeigen: Zeile
  „Wer bist du?" mit antippbaren Avataren (Initiale + Farbe + Name).
- Tap auf Mitglied mit Session → `switchToMember(entry.session)`,
  Lade-Zustand während des Wechsels.
- Großer „Los geht's"-Button bleibt für neue Kinder (Setup/Beitreten).
- Ohne gecachte Mitglieder bleibt die Seite wie bisher.

## Nicht in Scope

- Wochen-Vergleich (positiv bewertet).
- Redeem-Strom / Streak-Save-Bestätigung (wartet auf neues Feature).
- Template-Namen im Backlog (bleiben Vorlagen).
- Echter Mitglieder-Umbau (auth_id umbinden) – Variante B, bewusst
  zurückgestellt.

## Verifikation

- `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `npm run build`.
- Alle bestehenden + neuen Tests grün.
