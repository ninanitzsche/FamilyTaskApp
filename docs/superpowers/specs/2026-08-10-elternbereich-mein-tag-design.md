# Design: Elternbereich „Mein Tag"

Datum: 2026-08-10
Status: Entwurf

## Kontext

Die Eltern der Familie haben selbst AD(H)S (Nina: ADHS, Partner: ADS). Das
bisherige „Küchen-Kanban" läuft über: Der Backlog ist endlos lang, es ist
unklar, *womit man anfangen soll*, und wichtige Self-Care-Aufgaben
(Medikamente, Bewegung, Essen) werden vergessen. Ziel: **gesunde Routinen
aufbauen**, ohne Überforderung.

Der heutige Stand: Die Rolle `parent` existiert (`members.role`), Eltern sehen
aber exakt dieselbe Kinder-UI (Gamification, Streak, XP, Level). Ein
„Eltern-Login kommt später" steht im Login (`Login.tsx`).

## Entscheidungen (aus dem Brainstorming)

1. **Zweck:** Eigene Aufgaben & Routinen für Eltern — kein Admin-Panel, kein
   Monitoring-Tool. Kinder-Verwaltung ist explizit NICHT der Kern.
2. **Tages-Ritual:** Morgens ist der wichtigste Anker; Abend-Check als Bonus
   (niedrigere Priorität).
3. **Erinnerung:** Nudge erst, wenn bis 18:00 Uhr nichts erledigt wurde —
   kein ständiges Klingeln. Form: Push + Abend-Rückblick.
4. **Self-Care:** Bibliothek in 5 Rubriken; jede Person wählt frei ihre eigene
   Auswahl (nicht alles ist für alle gleich relevant).
5. **Einstieg:** Neuer Bereich „Mein Tag" für Eltern — oben feste
   Self-Care-Checkliste, darunter optional selbst gewählte Aufgaben aus dem
   Brett.
6. **Kein Schutz:** Kein PIN/Passwort-Gate — vertrauensbasierte App.
7. **Keine Gamification** für Eltern: keine XP, keine Level, keine Streaks.
   Ruhige Checklisten + sanfte Statistik.
8. **Kanban-Disziplin aus der agilen Softwareentwicklung** auf das Brett
   übertragen: WIP-Limit (max. 3 „in Arbeit" pro Person), Pull statt Push,
   priorisierter Backlog (fällig/bereit zuerst). Das löst das Kernproblem
   „endloser Backlog, nichts anfangen".

## Zielbild „Mein Tag" (Eltern-Startseite, Route `/meintag`)

Aufbau von oben nach unten:

1. **Header:** „Guten Morgen/Tag/Abend, {Name}!" + heutiges Datum.
2. **Self-Care-Checkliste** (fester Block):
   - Persönlich konfigurierte Items aus der Bibliothek, sortierbar.
   - Jedes Item: Emoji + Label + Checkbox; abhaken = für heute erledigt.
   - Fortschritt „3/5 heute".
   - Zahnrad → Editor: Items aus 5 Rubriken hinzufügen/entfernen/sortieren,
     eigene Items anlegen.
3. **Heute-Aufgaben** (optionaler Block, **WIP-Limit 3**):
   - „+ Aufgabe wählen" öffnet Picker mit priorisierten *verfügbaren*
     Backlog-Aufgaben (nie erledigt zuerst, dann älteste zuletzt erledigt).
   - Max. 3 gleichzeitig offen (`my_day_tasks` pro Tag).
   - Abhaken = Aufgabe wie in einer Session abschließen (Streak, Cooldown,
     `last_completed_at`, `completed_count`).
   - Bei vollem Limit: Hinweis „3 in Arbeit — erst eine abschließen".
4. **Abend-Rückblick** (ab 18:00 oder jederzeit unten): „Heute offen: X von Y
   Self-Care · Z von 3 Aufgaben" + Wochen-Statistik „3 von 7 Tagen komplett"
   (Tag = alle Self-Care-Items abgehakt). Keine XP/Level.

Kinder (`role === 'child'`) sehen weiterhin das normale Dashboard als Start
und haben „Mein Tag" nicht in der Navigation.

## Datenmodell (SQL-Migration)

Neue Tabelle `self_care_items` (Bibliothek):

```sql
create table self_care_items (
  id bigint primary key generated always as identity,
  family_id bigint references families(id) on delete cascade, -- null = globales Seed
  category text not null check (category in ('meds','movement','basics','rest','morning_evening')),
  label text not null,
  emoji text not null default '✅',
  time_of_day text not null default 'any' check (time_of_day in ('morning','evening','any')),
  created_at timestamptz not null default now()
);
```

Seed (global, `family_id null`), ~4 Items pro Rubrik:
- `meds`: 💊 Medikamente, 🌅 Medikamente morgens, 💉 Vitamine
- `movement`: 🚶 Spaziergang, 🧘 Dehnen, 🏃 Bewegung
- `basics`: 💧 Wasser trinken, 🍎 Essen, 🛋️ Pause
- `rest`: 📚 Lesen, 🧩 Hobby-Zeit, 😴 Ruhe
- `morning_evening`: 🪥 Zähne (morning), 🧴 Pflege (evening), 📵 Bildschirmzeit
  beenden (evening), 🎒 Abendplan (evening)

Neue Tabelle `member_self_care` (persönliche Auswahl):

```sql
create table member_self_care (
  id bigint primary key generated always as identity,
  member_id bigint references members(id) on delete cascade not null,
  item_id bigint references self_care_items(id) on delete cascade not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (member_id, item_id)
);
```

Neue Tabelle `self_care_completions` (tägliches Abhaken):

```sql
create table self_care_completions (
  id bigint primary key generated always as identity,
  member_id bigint references members(id) on delete cascade not null,
  item_id bigint references self_care_items(id) on delete cascade not null,
  done_date date not null,
  completed_at timestamptz not null default now(),
  unique (member_id, item_id, done_date)
);
```

Neue Tabelle `my_day_tasks` (Heute-Aufgaben, WIP):

```sql
create table my_day_tasks (
  id bigint primary key generated always as identity,
  member_id bigint references members(id) on delete cascade not null,
  task_id bigint references tasks(id) on delete cascade not null,
  day date not null,
  position int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (member_id, task_id, day)
);
```

WIP-Regel (Anwendung, kein DB-Zwang): offene Picks =
`count(my_day_tasks where member_id=? and day=today and completed_at is null)`
→ Limit 3.

Randfall: Ein Pick gilt auch als erledigt, wenn die zugrunde liegende Aufgabe
heute anderweitig abgeschlossen wurde (z.B. in einer Session). In der Anzeige
zählt ein Pick als done, wenn `completed_at` gesetzt ODER
`task.last_completed_at >= Tagesbeginn` ist; WIP zählt nur offene Picks.

**RLS:** Für alle 4 Tabellen Policies nach bestehendem Muster
(`supabase/migrations/007_rls_policy_hardening.sql`):
- `self_care_items`: SELECT für Mitglieder der eigenen Familie (global +
  familieneigene); INSERT/UPDATE/DELETE nur Eltern der Familie.
- `member_self_care`, `self_care_completions`, `my_day_tasks`: SELECT/INSERT/
  UPDATE/DELETE nur für das eigene Mitglied (eigenes `member_id`).

## Navigation & Rollen

- Neue Seite `src/pages/MyDay.tsx`, Route `/meintag`.
- `src/App.tsx` Fallback-`<Navigate>` rollenabhängig:
  `member.role === 'parent' ? '/meintag' : '/dashboard'` (nach Login,
  Member-Switch, App-Start).
- `src/components/layout/BottomNav.tsx`: Eltern ersetzen den ersten Tab
  „Home" durch „Mein Tag" (`/meintag`, Icon `Sun`/`Sparkles`); Kinder
  behalten `/dashboard` „Home". Übrige Tabs (Aufgaben, Belohnungen, Erfolge,
  Profil) für alle.
- Dashboard bleibt für Eltern per Direkt-URL erreichbar, ist aber nicht mehr
  der Start. Explizite `navigate('/dashboard')` in SessionActive/SessionResult
  bleiben unverändert (bewusst nicht in Scope).

## Technische Umsetzung

### `src/lib/supabase.ts` (bzw. `src/lib/selfCare.ts`)

- `getSelfCareLibrary()`, `createSelfCareItem()`
- `getMemberSelfCare(memberId)` (mit Item-Join, geordnet)
- `setMemberSelfCare(memberId, itemIds[])` (Reihenfolge = Array-Index)
- `getSelfCareCompletions(memberId, date)`, `toggleSelfCareCompletion(...)`
- `getMyDayTasks(memberId, date)`, `pickTaskForDay(memberId, taskId, date)`,
  `completePickedTask(...)`
- Typen in `src/types/supabase.ts` erweitern (`Database.Tables` + Row/Insert).

### Task-Abschluss-Helper (Refactor, TDD)

`src/lib/tasks.ts` bekommt `completeTaskRow(task, now): TaskRow` (rein) mit
der Logik aus `SessionResult.tsx:145-155`
(`calculateTaskStreak`, `completed_count + 1`, `last_completed_at`).
`SessionResult` refaktoriert auf den Helper; `MyDay` nutzt ihn ebenfalls.
(„Heute-Aufgabe" im MyDay abschließen = dasselbe Verhalten wie Session.)

### Priorisierung Backlog (Picker + Board)

Sortierregel für verfügbare Aufgaben einer Person (aus `getTaskStatus`):
1. nie erledigt zuerst, 2. älteste `last_completed_at` zuerst
(`getDueTask`-Sortierung wiederverwenden).

### 18:00-Erinnerung (v1 pragmatisch)

- **In-App-Banner** auf „Mein Tag" (und Dashboard): Wenn nach 18:00 Uhr heute
  noch kein Self-Care-Punkt abgehakt ist → „Heute noch nichts erledigt? ✨".
- **Lokale Notification** (Notification-API) mit Opt-in-Frage beim ersten
  Besuch: Wenn die App offen ist und Berechtigung erteilt wurde, wird um
  18:00 eine einmalige Notification gezeigt; auch beim Öffnen nach 18:00.
- **Web Push (echtes Push, App geschlossen)** braucht VAPID + Server/Edge
  Function → explizit Phase 2, nicht Teil dieser Planung.

## Nicht-Ziele (bewusst)

- Keine Kinder-Verwaltung (Aufgaben/Belohnungen für Kinder anlegen bleibt
  wie bisher im Brett).
- Kein Monitoring von Bildschirmzeit/Fortschritt der Kinder.
- Kein PIN/Login-Schutz.
- Keine Gamification/XP/Streaks für Eltern.
- Kein Web-Push-Server (Phase 2).

## Umsetzungs-Reihenfolge (für den Plan)

1. **Migration + RLS**: 4 Tabellen, Seed, Policies, Typen.
2. **Lib-Helper (TDD)**: `completeTaskRow` + Refactor SessionResult.
3. **MyDay-Page**: Self-Care-Checkliste + Editor (Bibliothek, eigene Items).
4. **Heute-Aufgaben**: Picker, WIP-Limit 3, Abschluss.
5. **Abend-Rückblick + Wochen-Statistik**.
6. **Navigation/Rollen**: Route, AppShell-Redirect, BottomNav.
7. **18:00-Erinnerung**: Banner + lokale Notification + Opt-in.
