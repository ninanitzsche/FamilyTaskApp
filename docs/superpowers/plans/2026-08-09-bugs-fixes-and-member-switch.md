# Implementierungsplan: Bug-Fixes aus Testbeleg + Kind-Schnellwechsel

Datum: 2026-08-09
Basis: `docs/superpowers/specs/2026-08-09-bugs-fixes-and-member-switch-design.md`

## Reihenfolge & Abhängigkeiten

1. TDD-Helfer zuerst (getDueTask, getDaysAgoLabel, memberSessionCache).
2. UI danach (Dashboard, WeeklyMission, Backlog, Login).

## Tasks

### Task 1: Dashboard-Avatar → Profil
- `Dashboard.tsx`: Deko-`<div>` (🎮, Zeile ~132) ersetzen durch Button mit
  Mitglieds-Avatar (Initiale, `member.color`), Klick → `/profile`.

### Task 2: getDueTask + getDaysAgoLabel (TDD)
- `src/lib/tasks.ts`: `getDueTask` und `getDaysAgoLabel` ergänzen.
- Testdatei `src/__tests__/due-task.test.ts` (6 Tests getDueTask, 3
  getDaysAgoLabel).
- Commit.

### Task 3: Dashboard „Heute geschafft" + „Das ist lange fällig!"
- `Dashboard.tsx`: `getFamilyTasks` laden, `getDueTask` + `getDaysAgoLabel`
  verwenden.
- „Heute geschafft"-Block hinter Header-Zeile verschieben.
- Fällig-Karte (nur wenn Ergebnis): Bild/Emoji, Titel, Label, Tap →
  `/session/active` mit dieser Aufgabe.
- Commit.

### Task 4: WeeklyMission-Erklärzeile
- `WeeklyMission.tsx`: Zeile „3 zufällige Aufgaben diese Woche – schaffst du
  alle, gibt's +50 XP" unter dem Titel.
- Commit.

### Task 5: Backlog-Hinweis-Banner
- `Backlog.tsx`: dismissibles Banner (localStorage
  `familyboard:backlogHintDismissed`), Text „👆 Halten & ziehen zum Sortieren
  · Lang drücken zum Bearbeiten".
- Commit.

### Task 6: memberSessionCache (TDD)
- `src/lib/memberSessionCache.ts` + `src/__tests__/member-session-cache.test.ts`.
- Commit.

### Task 7: authStore Session-Cachen + switchToMember
- `authStore.ts`: Session nach Mitglieds-Lookup cachen; Aktion
  `switchToMember(session)`; `signOut` leert Cache nicht.
- Commit.

### Task 8: Login-Schnellwechsel
- `Login.tsx`: „Wer bist du?"-Avatare aus `loadMemberSessions()`, Tap →
  `switchToMember`, Lade-Zustand. „Los geht's" bleibt.
- Commit.

### Task 9: Verifikation + Push
- `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `npm run build`.
- Push nach origin/main.

## Erwartete Testanzahl
- Vorher: 92. Neu: 9 (due-task) + 6 (member-session-cache) = 107.
