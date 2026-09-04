# Design: Sessions-Liste & Session-Detail (Aufräum-Action-Verlauf)

**Datum:** 2026-08-08
**Status:** Genehmigt (UX-Design von `bmad/outputs/ux-sessions-design.md` übernommen)

## Ziel

Jede Aufräum-Action (= Session) bekommt sichtbaren Verlauf und eine eigene Detail-Ansicht. Die flache „📸 Vorher/Nachher"-Galerie (`Achievements.tsx` Z.251–295) wird ersetzt durch eine **Sessions-Liste** — eine Chip-Sektion auf der Erfolge-Seite — mit je **einem Titelbild** pro Session und Default-Emoji-Thumb bei fehlendem Foto. Tap öffnet eine volle Session-Detail-Ansicht (XP, erledigte/offene Aufgaben, Vorher-Nachher-Fotos).

### Nicht-Ziele
- Keine große Foto-Galerie.
- Keine „Alle ansehen"-Voll-Liste (nur Link-Platzhalter, out-of-scope).
- Kein „Foto ergänzen" im Detail (out-of-scope).
- Keine Backend-/DB-Änderung.

## Anforderungen

1. **Titelbild-Regel:** `session.before_photo ?? session.after_photo`. Nie beide in der Liste. Fehlt beides → 2×2-Emoji-Thumb der erledigten Tasks (max. 4 Emojis, letztes Feld `+N`).
2. **SessionCard** (tapbare Zeile): Titelbild `w-28 h-20 rounded-2xl object-cover`, Datum `de-DE` kurz, Dauer (⏱️× Min), Emoji-Preview + Fortschritt `2/3 erledigt` / `✅ Alles geschafft!`, XP-Chip oben rechts (Orange-Gradient, `+45`).
3. **Sessions-Sektion** „🧹 Deine Aufräum-Actions" nach den Badge-Grids, vor Level-Weg; `h2` `text-[16px] font-black text-[#2D1B69] mb-3`; rechts Counter-Chip `6 Sessions`. Empty-State: `Noch keine Aufräum-Action!` + CTA „🔥 Session starten" → `/dashboard`.
4. **Session-Detail** full-screen ohne BottomNav auf Route `/achievements/session/:sessionId`. Inhalt: Sticky-Header (Zurück + Datum), XP-Hero-Karte (Orange-Gradient), 3 Stat-Cards (Dauer · Erledigt n/total · XP), Vorher/Nachher-Foto-Paar (nur vorhandene Slots), Aufgaben-Split ✅ Erledigt / ○ Offen.
5. **Aufgaben-Split:** `tasksById`-Map aus `getFamilyTasks`, `done = completed_task_ids` → Titel/Emoji; `open = task_ids − completed_task_ids`; verwaiste Tasks (gelöscht) → „🤷 Aufgabe gelöscht" (`text-[11px] font-semibold text-[#9E96B0]`), nicht gezählt.
6. **Datenfluss:** Kein neuer Endpoint. Liste lädt `getMemberSessions(member.id, 50)` (bestehend) + `getFamilyTasks(familyId)` (neu). Detail: `location.state?.session ?? getMemberSessions().find(id)`.

## Architektur

```
src/
  pages/Achievements.tsx            Galerie-Block → SessionList-Sektion (+getFamilyTasks)
  pages/SessionDetail.tsx           NEU: Detail-Seite
  components/sessions/
    SessionCard.tsx                 Zeile mit Titelbild/Emoji-Thumb + Metadaten
    EmptySessions.tsx               CTA-Karte bei 0 Sessions
    SessionPhotoPair.tsx            Vorher/Nachher side-by-side (null wenn none)
    SessionStatsRow.tsx             3 Stat-Cards (Dauer/Erledigt/XP)
    TaskListBlock.tsx               „✅ Erledigt"/„○ Offen"-Block (inkl. gelöscht-Fallback)
    index.ts (export)               optionale Convenience-Re-Exports
  lib/supabase.ts                    getFamilyTasks (bestehend) + neu: getSessionById fallback via getMemberSessions().find
  lib/utils.ts                       formatDuration(sec) → "6:14"
src/App.tsx                          <Route path="/achievements/session/:sessionId" element={<SessionDetail/>}/> außerhalb AppShell
```

**Datenfluss-Diagramm**

```
Achievements.tsx
   ├─ getMemberSessions(member.id, 50) → sessions
   ├─ getFamilyTasks(familyId)         → tasksById Map (NEU)
   └─ map → <SessionCard/> (+ EmptyState bei 0)
                │ tap
                ▼  navigate('/achievements/session/:id', { state: { session } })
SessionDetail.tsx
   ├─ location.state?.session ?? (getMemberSessions().find(id))
   ├─ getFamilyTasks → Map
   └─ SessionPhotoPair · SessionStatsRow · TaskListBlock(done) · TaskListBlock(open)
```

## Komponenten-Spezifikation

| Komponente | Props | Verantwortung |
|---|---|---|
| `SessionCard` | `{ session: SessionRow; tasksById: Map<number, TaskRow>; onClick: (session) => void }` | Titelbild (`before ?? after`) ODER Emoji-Grid, Datum, Dauer, XP-Chip, Fortschritt |
| `EmptySessions` | `{ onStartSession: () => void }` | CTA „Starte deine erste Session" |
| `SessionDetail` | `useParams().sessionId`; nutzt `useAuth` | Header, XP-Karte, StatsRow, PhotoPair, 2× TaskListBlock |
| `SessionPhotoPair` | `{ session: SessionRow }` | `null` wenn kein Foto; sonst `flex gap-2` Slots |
| `SessionStatsRow` | `{ durationSec; doneCount; totalCount; xp }` | 3 weiße Stat-Cards |
| `TaskListBlock` | `{ heading: string; tasks: TaskRow[]; done: boolean }` | Zeilen + deleted-task Fallback |
| `formatDuration` | `(sec: number): string` | `Math.floor(sec/60):sec%60` → `"6:14"` |

## Datenmodell

`SessionRow` (unverändert): `id, family_id, member_id, duration, task_ids, completed_task_ids, xp_earned, before_photo, after_photo, created_at`.

Keine DB-Migration.

## Zustände & Fehlerfälle

- **0 Sessions:** EmptySessions-Karte, sonst Sektion komplett weglassen.
- **Session ohne Foto:** Emoji-Thumb (Zustand B) — kein graues leeres Rechteck.
- **Detail ohne Foto-Paar:** Abschnitt fehlt komplett (keine gestrichelten Rahmen).
- **Verwaiste Task gelöscht:** „🤷 Aufgabe gelöscht", wird nicht in done/open gezählt.
- **Loading:** bestehendes `LoadingScreen`-Muster.
- **Refresh ohne state:** Fallback per `getMemberSessions().find(s => s.id === Number(params.sessionId))`.
- **Zurück-Timeout:** `navigate(-1)`, sonst `navigate('/achievements')`.

## Interaktionen & Accessibility

- Tap-Ziele ≥ 44px (Karte ≥ 76px hoch, Zurück-Button 44×44).
- Press-Feedback: `transition-all active:scale-[0.98]`.
- Alt-Texte kontextreich: `Vorher-Foto vom 12.02.2025`.
- Labels `#8E8AA0`/`#7C6BA0` immer `font-bold`/`font-semibold`.
- Liste `section aria-label="Aufräum-Actions"` mit `ul>li`; Detail `h1 = Session vom {Datum}`.
- Keine neuen Autoplay-Animationen.

## Tests

Vitest (vnode ohne jsdom — nur pure logic). Neue pure logic:
- `formatDuration(sec)`: 0 → `0:00`; 374 → `6:14`; 3600 → `60:00`.
- Task-split logic (wenn in util ausgelagert) `splitSessionTasks(task_ids, completed_task_ids, tasksById)` → { done: TaskRow[], open: TaskRow[], missingIds: number[] }; edge: gelöschte Ids, leere Arrays.
- falls nicht ausgelagert: Semantik via typecheck + manual QA statt Unit-Test (nur wenn machbar ohne jsdom).

Verifikation: `npx tsc --noEmit`, `npm test`, `npm run build`.

## Abhängigkeiten / Reihenfolge

1. `lib/utils.ts` `formatDuration` + `splitSessionTasks` (pure, Tests) — kein UI.
2. `components/sessions/*` (SessionCard, EmptySessions, SessionPhotoPair, SessionStatsRow, TaskListBlock).
3. `SessionDetail.tsx` + Route.
4. `Achievements.tsx` Umbau (ersetze Galerie-Sektion, Wire tasksById).