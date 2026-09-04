# FamilyBoard — Feature-Übersicht (Stand: Phasen A–E)

> Vollständige Bestandsaufnahme der App-Features nach Phasen A–E (bis inkl.
> Screen-Time-Redemption). Basis ist der committete Stand (Branch `gsd`,
> inkl. `d4df57e`).

## 1. Überblick

FamilyBoard ist eine **bildgesteuerte Putz- und Lern-App für Kinder, die nicht
lesen können**. Kein Text-first-UI, sondern Emojis, Fotos und große Buttons.
Encouragement-first, No-Shame-Prinzip: Nie offene Aufgaben, nie ❌-Symbole,
Streaks brechen nicht (Grace-Day via „Streak retten").

- **Stack:** React 19 + TypeScript + Vite + Tailwind CSS + Zustand + Supabase
  (Auth, Postgres, Storage) + PWA + lucide-react + @dnd-kit + vitest
- **Design-Tokens:** Grundfarbe `#FFF5E6`, Primär `#6C5CE7`/`#A29BFE`,
  Erfolg `#00A381`/`#55EFC4`, Warnung `#E05555`/`#FF8E53`, Text `#2D1B69`
- **Konzept:** „Session-first" — Putz-Sessions (5-Min-Timer oder frei) sind der
  Kern; XP, Level, Streaks und Wochenmission hängen daran.

## 2. Auth- & Onboarding-Flow

| Zustand | Bedingung | Anzeige |
|---|---|---|
| `loading` | Auth-Check läuft | `LoadingScreen` (🥷 + Spinner) |
| nicht authentifiziert | `!isAuthenticated` | `Login` (anonyme Anmeldung) |
| `needsSetup` | User hat kein Member | `Setup` (Familie gründen/beitreten) |
| eingerichtet | Member + Familie geladen | AppShell (4 Tabs) |

- **Login** (`src/pages/Login.tsx`): Ein großer ▶-Button; `signInAsChild`
  ruft `supabase.auth.signInAnonymously()`. Hinweis „Eltern-Login kommt später".
- **Setup** (`src/pages/Setup.tsx`): Tab „Neu erstellen"/„Beitreten". Beim
  Erstellen: `createFamily(name, code)` mit zufälligem 6-Zeichen-Code, dann
  `createMember` mit `role: 'parent'`. Beitreten ist im UI noch nicht voll
  verdrahtet (Input zeigt „Einladungscode", Handler führt nur den Create-Pfad).
- **authStore** (`src/store/authStore.ts`): `onAuthStateChange` lädt Member
  inkl. Familie (`members` join `families!inner`); kein Member → `needsSetup`.
- **useAuth** (`src/hooks/useAuth.ts`): exposed `user, family, member, loading,
  needsSetup, isAuthenticated: !!user, isParent: member?.role === 'parent',
  signInAsChild, signOut`.
- **Routen** (`src/App.tsx`): AppShell-Routen Dashboard/Backlog/Achievements/
  Profile; Session-Routen außerhalb des Shells (Vollbild); `*` → Dashboard.

## 3. Screens

### 3.1 Dashboard (`src/pages/Dashboard.tsx`)
- Streak-Card mit `streak`/`longest_streak` und **„🛡️ Streak retten"**-Button
  (Kind 1×/Woche, Eltern unbegrenzt). Handler: `updateMember` setzt
  `streak_saves_used+1`, `streak_save_week` = aktuelle Woche,
  `last_session_at = now` → Streak bleibt per `calculateStreak` (diffDays 0)
  erhalten.
- Heute-XP / Heute-erledigt (aus `getMemberSessions(member.id, 50)`, Filter
  ab Mitternacht lokal), Level-Chip (Emoji + Name), „LOS GEHT'S!"-Button → `/session/select`.
- **Wochen-Vergleich:** erledigte Tasks letzte Woche vs. diese Woche (Montag als
  Wochenstart), nur sichtbar wenn > 0.
- **Pending-Session-Banner:** wenn `localStorage.activeSession` existiert →
  „Weitermachen 💪" / „Verwerfen".
- `<WeeklyMission />` eingebettet.

### 3.2 Backlog / Aufgaben (`src/pages/Backlog.tsx`)
- Grid-Sortierung per **@dnd-kit** (Drag-Handle), Reihenfolge wird als
  `task_order` je Task persistiert (`updateTask`).
- **Vorschlags-Leiste:** 8 `TASK_TEMPLATES` (Emoji + Bild-Pfad unter
  `/images/tasks/*.png`): Lego, Dinos, Kuscheltiere, Boden, Schreibtisch,
  Wäsche, Müll, Zähne — nicht bereits vorhandene als Ein-Tap-Hinzufügen.
- Add-/Edit-Modal (Template-Auswahl + freier Titel, Enter zum Speichern),
  Löschen per ✕. Keine Bestätigung beim Löschen.

### 3.3 SessionSelect (`src/pages/SessionSelect.tsx`)
- Task-Auswahl als 2-Spalten-Grid (max. **3** Tasks), Modus-Toggle
  **„5-Min Timer"** / **„Frei"**. Start navigiert zu `/session/active` bzw.
  `/session/free` mit `state.tasks`. Leerer Backlog → „Keine Aufgaben im Backlog".

### 3.4 SessionActive (Timer, `src/pages/SessionActive.tsx`)
- Stoppuhr zählt hoch (TARGET = 300 s). Bei 300 s → „⏰ 5 Minuten geschafft!"-
  Overlay: „Weitermachen! ⭐" (Bonus) oder „Nein, ich bin fertig".
- Übertime: Header „Super Fokus! +N Bonus-Minuten 🧠", Fortschrittsbalken wird
  grün. **Anzeige-/XP-Diskrepanz:** Overlay zeigt `(overtimeMinutes+1)*5` XP,
  `SessionResult` vergibt aber nur `overtimeMinutes*5` (siehe §6.2).
- Tasks antippbar (✓ grün), Task-Streak-Anzeige 🔥N; „Fertig!" → nach 1,5 s
  weiter zu `/session/result`. Abbruch-Dialog (✕) verwirft ohne Speichern.

### 3.5 SessionFree (`src/pages/SessionFree.tsx`)
- Kein Timer-Ziel; Stoppuhr läuft nur zur Anzeige. Aufgaben abhaken, Fortschritt
  in %; „Fertig!" erst ab 1 erledigter Aufgabe. Abbruch-Dialog wie im Timer-Modus.

### 3.6 SessionResult (`src/pages/SessionResult.tsx`)
- **Speicher-Reihenfolge (einmalig via `savedRef`, StrictMode-sicher):**
  1. `createSession` (duration, task_ids, completed_task_ids, xp_earned)
  2. `updateMember` (xp, level, streak, longest_streak, last_session_at)
     — basiert auf frischem `useAuthStore.getState().member`
  3. je erledigter Task: `updateTask` (completed_count+1, task-streaks,
     last_completed_at) via `calculateTaskStreak`
  4. Wochenmission: `getCurrentWeekMission` → `member_progress[memberId]` +=
     Anzahl erledigter Mission-Tasks; beim Erreichen des Ziels `updateMember`
     mit **+50 XP** (inkl. Level-Neuberechnung) und dann `updateWeeklyMission`.
- Fehler → Log + Navigate zurück zum Dashboard (kein Erfolgs-Fake).
- Erfolgs-UI: Emoji 🎉/👏/💪, animierte XP-Zahl (rAF, 1,5 s), +5-Bonus-Hinweis,
  **Vorher/Nachher-Fotos** (2 Slots, `CameraCapture`), Level-Up-Modal mit
  Feuerwerk, „🔄 Nochmal versuchen!", Auto-Navigation nach 15 s.

### 3.7 Achievements (`src/pages/Achievements.tsx`)
- Level-Card (Fortschritt zum nächsten Level), Streak-Card, 3er-Stats-Row
  (XP/Level/Bester Streak).
- **Badges** (erreicht = farbig, sonst grau + „desc"):
  - Streak: Feuer-Laune (3), Blitz-Streak (7), Diamant-Fokus (14), Streak-König (30)
  - Fokus: ≥7/10/15 Min Session, Early Bird (<9 Uhr), Nachteule (≥20 Uhr)
  - Basis: Erste Session (xp≥10), Lehrling (≥300), Held (≥1000),
    100/500/1000-XP-Club
- **Vorher/Nachher-Galerie:** Sessions mit `before_photo`/`after_photo`
  (letzte 10), Level-Weg (6 Level mit AKTUELL/✅).

### 3.8 Profile (`src/pages/Profile.tsx`)
- Avatar (initiale Farbe aus `member.color`), Name, Familienname, Level-Chip.
- Stats-Grid: XP, Level, aktueller/bester Streak.
- **Bildschirmzeit-Card:** `screen_time_balance` Minuten, „Einlösbar: X Min"
  (`xp - xp_redeemed`), pulsierender „Jetzt einlösen"-Button → Bestätigungsdialog
  → `calculateScreenTimeRedeem` + `updateMember` (`xp_redeemed`, `screen_time_balance`).
  Erfolgs-/Fehlermeldung nur bei bestätigtem DB-Write (`error || !updated` → throw).
- Rolle (Elternteil/Kind), „Abmelden" (`signOut`).

## 4. Gamification

| Mechanik | Regeln |
|---|---|
| **XP** | +10 je erledigter Task; +5 wenn alle gewählten Tasks erledigt; +5 je Überstunden-Minute; +50 Wochenmission-Bonus |
| **Level** | Ei (0), Mini-Ninja (100), Lehrling (300), Profi (600), Held (1000), Legende (2000) |
| **Streak (Member)** | `calculateStreak`: kein letzter Tag → 1; Zukunft (Clock-Skew) → unverändert; gleicher Tag → unverändert; +1 Tag → +1; sonst → 1 |
| **Streak retten** | Kind 1×/Woche (`canUseStreakSave`/`getStreakSaveInfo`, Eltern 999); setzt `last_session_at` auf jetzt |
| **Task-Streak** | `calculateTaskStreak`: nur bei `recurring` ≠ never; daily: +1 bei diffDays 1; weekly: +1 bei diffDays ≤ 7; sonst Reset auf 1 |
| **Wochenmission** | 3 zufällige Tasks/Woche, Ziel = 3 Completions; Fortschritt je Member in `member_progress`; +50 XP bei Abschluss |
| **Screen-Time-Redeem** | `calculateScreenTimeRedeem`: einlösbar = `xp - xp_redeemed`; auf Erfolg `xp_redeemed = xp`, `screen_time_balance += minutes` |

- **Level-Schwellen/Logik** in `src/lib/gamification.ts` (getLevelFromXp,
  getXpForNextLevel, getCurrentWeekKey = Montag der Woche).
- **Kein negatives Feedback** irgendwo: „Jeder Schritt zählt!", „Du hast
  angefangen… 🌱" bei 0 erledigten Tasks.

## 5. Persistenz

### 5.1 Supabase-Tabellen (`supabase-schema.sql`, `src/types/supabase.ts`)
- **families:** name, invite_code
- **members:** name, color, role (parent/child), xp, level, streak,
  longest_streak, last_session_at, screen_time_balance, xp_redeemed,
  streak_saves_used, streak_save_week
- **tasks:** title, emoji, image_url, assignee_id, recurring (never/daily/weekly),
  cooldown_days, last_completed_at, completed_count, current_streak,
  longest_streak, task_order
- **sessions:** duration, task_ids, completed_task_ids, xp_earned,
  before_photo, after_photo
- **rewards:** title, xp_cost, max_redemptions_per_week — DB-Funktionen
  (`getFamilyRewards`, `createReward`) existieren, **aber noch kein UI**
- **weekly_missions:** week_start, task_ids, target_completions, member_progress

### 5.2 Supabase Storage
- Bucket `session-photos`, Pfad `{familyId}/{sessionId}/{type}.jpg`,
  Public-URL. `uploadPhoto` (JPEG 0.8), Fallback: Data-URL wenn Upload fehlschlägt.

### 5.3 localStorage
- Key `activeSession` (`src/lib/sessionState.ts`): tasks, completedTaskIds,
  elapsed, mode (timer/free), startedAt — für Pending-Session-Resume.

## 6. Quirks & bekannte Diskrepanzen

1. **XP-Anzeige vs. Vergabe in Übertime:** `SessionActive`-Overlay zeigt
   `(overtimeMinutes + 1) * 5` XP, `SessionResult` vergibt `overtimeMinutes * 5`
   (floor-basiert). Eine Minute über 5:00 → Anzeige „+5 XP", real 0.
2. **Setup „Beitreten":** UI-Pfad vorhanden, aber Handler führt immer den
   Create-Flow aus (nutzt `createFamily` statt `getFamilyByInvite`).
3. **Rewards:** Tabellen + lib-Funktionen vorhanden, kein Screen.
4. **`CreateFamily`** ist ein Platzhalter („Coming in Phase 0.5").
5. **session-logic.test.ts** dupliziert XP-/Streak-Logik lokal statt sie aus
   `src/lib` zu importieren (siehe Testlücken-Analyse).

## 7. Dokumentiert, aber NICHT umgesetzt

Abgleich der Specs/Plans mit dem tatsächlichen Code (Stand: Branch `gsd`).

| Feature | Wo dokumentiert | Ist-Zustand |
|---|---|---|
| **Musik während Sessions** | Design-Spec „5-min timer with music"; Phase-C-Plan: „Phase G: Musik during Sessions" | Kein Audio-Import/`<audio>`/Sound-Datei im Repo — komplett fehlend |
| **Parents Area (Elternbereich)** | Design-Spec Screen 5 „Task management, rewards config, family overview"; Phase-C-Plan: „Phase F: Parents Area" | Nur `role: 'parent'` wird in `Setup` vergeben; `useAuth.isParent` (src/hooks/useAuth.ts:19) wird **nirgends verwendet** — kein parent-gated Screen, kein Task-Management/rewards-config/family-overview für Eltern; Login zeigt „Eltern-Login kommt später" |
| **Rewards-UI** | Design-Spec Datenmodell `Rewards[]`, „rewards config" | Tabelle `rewards` + `getFamilyRewards`/`createReward` (src/lib/supabase.ts:79-89) existieren, aber **kein Screen/UI**; Phase E deklariert „Konfigurierbare Kurse / Rewards-Table" explizit als Out of Scope |
| **Task per Spracheingabe anlegen** | Design-Spec Screen 3 „add via voice/text" | Kein `webkitSpeechRecognition`/Speech-API; nur Template- oder Texteingabe in Backlog |
| **`members.streak_save_available`-Spalte** | UX/ADHS-Spec §1 („Speichert in `streak_saves_used` … und `streak_save_available`") | Nicht im Schema/Code; Wochen-Reset stattdessen über `streak_save_week` gelöst (funktional äquivalent) |
| **Offline-Betrieb** | Design-Spec Design-Prinzip 7 „Offline-fähig"; „Progressive Web App" | Nutzerentscheidung dagegen (siehe Kontext): nur PWA-Metadaten (`vite-plugin-pwa`: manifest, autoUpdate, Icons vorhanden), **kein** App-Daten-Caching/Offline-Modus |
| **Vorher/Nachher-Fotos** | UX/ADHS-Spec (§ Dateien geändert: CameraCapture); Phase-C-Plan Task 4–6 | Code + Bucket existieren, aber laut Nutzer **funktioniert es noch nicht** — Ursachenanalyse siehe §8.1 |

**Stack-Abweichungen (dokumentiert, aber anders umgesetzt):**

| Doku | Realität |
|---|---|
| **Firebase** (Auth + Firestore), Design-Spec + Phase-0-Plan | Umgesetzt mit **Supabase** (Auth + Postgres + Storage); `CreateFamily`-Stub erwähnt noch „Firebase integration" (Phase 0.5) |
| **daisyUI** im Tech-Stack | In `package.json` + `index.css` (`@plugin "daisyui"`) vorhanden, aber die UI nutzt durchgehend eigene Tailwind-Design-Tokens (keine daisy-Klassen) — tote Dependency |

## 8. Supabase-Schema: Features ohne (funktionierende) Umsetzung

Abgleich `supabase-schema.sql` + `supabase-storage.sql` + Migrationen gegen den
Code. „Bestandsfeatures" = im Schema/DB-Helper dokumentierte Felder/Flows, die
im App-Code nicht (voll) funktional sind.

### 8.1 Vorher/Nachher-Fotos — defekt (Nutzerbericht)

Spalten `sessions.before_photo/after_photo` + Bucket `session-photos` +
Policies existieren; `CameraCapture`/`uploadPhoto` sind implementiert. Laut
Nutzer gehen Fotos aber noch nicht. Kandidaten-Ursachen (nicht gegen Live-DB
verifiziert):

1. **Storage-Policy-Risiko:** Die Upload-Policy (`supabase-storage.sql`) prüft
   `(storage.foldername(name))[1] = (SELECT family_id::text FROM members WHERE auth_id = auth.uid())`.
   Diese Subquery auf `members` unterliegt **selbst RLS** (Rekursions-Risiko
   bei den self-referenziellen member-Policies); liefert sie `NULL` (z. B. kein
   Member-Row sichtbar), wird der Upload mit 403 abgelehnt.
2. **HTTPS/Secure-Context:** `getUserMedia` in `CameraCapture` funktioniert nur
   in Secure Contexts (HTTPS oder localhost). Zugriff übers Handy via
   `http://<LAN-IP>:5173` → Kamera blockiert → „Kamera nicht verfügbar".
3. **Doppel-Upload:** `CameraCapture` lädt bereits hoch, wenn `familyId`/
   `sessionId`/`photoType` gesetzt sind; `SessionResult.handlePhotoCapture`
   versucht bei Data-URLs einen **zweiten** Upload. Fehlerpfad: Fallback
   speichert die komplette Base64-Data-URL in `before_photo` (DB-Bloat).
4. **Aufräumen:** `deletePhoto` (src/lib/storage.ts:42) ist nirgends
   aufgerufen — Fotos können in der App nicht gelöscht werden.

### 8.2 Familien-Beitritt per Einladungscode — nicht funktional

`families.invite_code` (Schema), `getFamilyByInvite` (src/lib/supabase.ts:11)
und `generateInviteCode` (src/lib/utils.ts:5) existieren, werden aber **nie
aufgerufen**:
- `Setup` „Beitreten" führt den **Create-Flow** aus (`createFamily` statt
  `getFamilyByInvite`); der Code wird bei „Neu erstellen" per `Math.random()`
  erzeugt, nicht via `generateInviteCode`.
- D. h.: Beitritt zu bestehender Familie per Code ist derzeit unmöglich.

### 8.3 Task-Zuweisung `assignee_id` — kein UI

Spalte im Schema, Parameter in `createTask` (src/lib/supabase.ts:46) — aber
**kein UI** setzt `assignee_id`. Kein „Für wen ist diese Aufgabe?"-Feature.

### 8.4 Wiederkehrende Tasks `recurring` — nie setzbar

Schema + `calculateTaskStreak` (daily: +1 bei diffDays 1 / weekly: +1 bei
diffDays ≤ 7) sind implementiert, aber Backlog-Add/Edit (src/pages/Backlog.tsx)
übergeben `recurring` **nie** → bleibt `'never'`. Die daily/weekly-Streak-Logik
ist damit im Produktivbetrieb unerreichbar (nur Tests).

### 8.5 Cooldown `cooldown_days` — komplett ungenutzt

Spalte im Schema (Default 2) und in `TaskRow`, aber **keine Referenz** im
App-Code (keine Cooldown-/Wiederholungs-Sperrlogik, kein UI).

### 8.6 Rewards `max_redemptions_per_week` / `xp_cost` — ohne UI

Ganze `rewards`-Tabelle ohne Screen (siehe §7). `max_redemptions_per_week` wird
im Code nirgends gelesen; nur `xp_cost` taucht in `RewardInsert` auf.

---
## check8-8 Audit (2026-08-08) — Plans/Specs/Codequalität
>(Erstellt während Timeslot-8-8; Detail-Backlog siehe unten.)

### Plans (alle 4 geprüft)
- [x] 2026-07-16 phase0-foundation — implementiert (Firebase→Supabase Deviation dokumentiert)
- [x] 2026-07-17 phase-c-tech-debt — implementiert (CameraCapture-Deviation dokumentiert)
- [x] 2026-08-04 phase-e-screen-time-redeem — implementiert
- [x] 2026-08-08 sessions-list-detail — implementiert, 72 Tests grün

### Specs (alle 4 geprüft)
- [x] 2026-07-16 familyboard-design — umgesetzt (Backend-Diviation Firebase/Supabase)
- [x] 2026-07-17 ux-adhs-update — umgesetzt (Mini-Gaps: Resume-Daten, 44px), Fix eingereicht
- [x] 2026-08-04 screen-time-redeem-design — umgesetzt (MemberRe reziert)
- [x] 2026-08-08 sessions-list-detail-design — umgesetzt (aria-Feedback, SessionDetail h1)

### Codequalität (Gesamt-Review)
Security/Bugs (Critical): 4 → migrierbar
Quality (Important): 10
Polish (Minor): 8
