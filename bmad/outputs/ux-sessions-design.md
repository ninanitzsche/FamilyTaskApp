# UX-Design: Sessions-Liste & Session-Detail

**Feature:** "Aufräum-Action"-Verlauf (Sessions) auf der Erfolge-Seite + neue Detail-Ansicht
**App:** FamilyBoard (React, mobile-first, max-w 420px, Tailwind, Deutsch-UI)
**Dateien:** `src/pages/Achievements.tsx` (bestehend) · neu: `SessionDetail` + `components/sessions/*`
**Status:** Design-Only — kein App-Code, nur dieses Design-Dokument.

---

## 0. Kontext (verifiziert aus dem Codebase)

| Fakt | Quelle |
|---|---|
| `SessionRow` = `{ id, family_id, member_id, duration (Sekunden), task_ids: number[], completed_task_ids: number[], xp_earned, before_photo: string\|null, after_photo: string\|null, created_at }` | `src/types/supabase.ts:65` |
| `TaskRow` = `{ id, title, emoji, image_url: string\|null, ... }` — Session speichert nur IDs → Detail muss IDs auf Titel/Emoji mappen | `src/types/supabase.ts:45` |
| `Achievements.tsx` lädt bereits `getMemberSessions(member.id, 50)` → `SessionRow[]` | `src/pages/Achievements.tsx:47-52` |
| Tasks kommen pro Familie per `getFamilyTasks(familyId)` → `TaskRow[]` | `src/lib/supabase.ts:37` |
| Der flache Block `📸 Vorher/Nachher` (Zeilen 251–295) wird **ersetzt** durch die Sessions-Liste | `src/pages/Achievements.tsx:251` |
| Router = `BrowserRouter`; `Achievements` liegt in `AppShell` (mit BottomNav). `/session/*`-Seiten sind **ohne** AppShell (full-screen) | `src/App.tsx:37-47` |

**Design-Vorgaben vom User (verbindlich):**
- Keine große Foto-Galerie. Jede Session zeigt genau **ein Titelbild** = Vorher-ODER-Nachher-Foto; existiert keins → Ersatz mit Emojis/Titeln der erledigten Tasks.
- Detailansicht zeigt: XP, erledigte/offene Aufgaben, Vorher-Foto, Nachher-Foto, Dauer.

---

## 1. Sessions-Liste (Sektion auf der Erfolge-Seite)

### 1.1 Positionierung

Die Sektion sitzt **nach den Badge-Grids** (Streak / Fokus / Basis-Abzeichen) und **vor** `🗺️ Level-Weg`. Begründung: Die Seite erzählt eine Historie — Level → Streak → Auszeichnungen → **Chronik der Aktionen** → Level-Weg als Abschluss des Fortschritts.

```
[ 🏆 Erfolge ]                          ← h1 (bleibt unverändert)
[ Aktuelles Level (Violett-Karte)      ]
[ 🔥 Streak (Rot-Karte)                ]
[ Stats: XP · Level · Bester Streak    ]
[ 🔥 Streak-Belohnungen (Grid)         ]
[ 🧠 Fokus-Abzeichen (Grid)            ]
[ 🎖️ Abzeichen (Grid)                  ]

╔═══════════════════════════════════════╗
║  🧹 Deine Aufräum-Actions        6   ║ ← NEUE Sektion (h2, siehe unten)
╠═══════════════════════════════════════╣
║  [SessionCard] (neueste zuerst)       │
║  [SessionCard]                        │   getMemberSessions ist bereits DESC sortiert
║  [SessionCard] …                      │
║  [ … ]                               │
╚═══════════════════════════════════════╝
[ 🗺️ Level-Weg (bestehend)             ]
```

**Heading:** `h2` = `🧹 Deine Aufräum-Actions` — `text-[16px] font-black text-[#2D1B69] mb-3` (gleiche Klasse wie die anderen h2s). Rechts daneben ein Counter-Chip `text-[10px] font-bold text-[#8E8AA0]` (z.B. `6 Sessions`). Bei > 8 Sessions werden max. 8 Karten angezeigt, darunter der Link `Alle ansehen` (`text-[13px] font-bold text-[#6C5CE7]`); die volle Sessions-Liste ist nicht im Scope dieses Designs (Platzhalter).

---

### 1.2 SessionCard (Listen-Zeile) — Wireframe

Jede Zeile = weißes `rounded-[16px] bg-white shadow-sm` Panel mit `p-3` — die bekannte Listen-Card-Sprache der Seite. **Die komplette Karte ist tappbar** (`role="button"`, `cursor-pointer`, `active:scale-[0.98]` transition).

```
┌───────────────────────────────────────────────┐
│ ┌─────────────┐    So, 12. Feb · 14:35   +45 │ ← Datum + XP-Chip
│ │             │    6 Min                │
│ │  TITELBILD   │    ┌┐┌┐┌┐     ✓ 2/3 ✅      │ ← Emoji-Preview + Fortschritt
│ │  h-20 w-28   │    │🧹│🛏│🗑│            │
│ │  rounded-2xl │    └┘└┘└┘                 │
│ └─────────────┘                             │
└───────────────────────────────────────────────┘
```

**Layout:**
- **Links Thumbnail**: fix  `w-28 h-20 flex-none rounded-2xl object-cover` — kleiner als das `h-32 w-full` der alten Galerie, damit 4–6 Zeilen auf den Screen passen.
- **Rechte Spalte (flex-1):**
  - Zeile 1: Datum `So, 12.02 · 14:30` — `text-[11px] font-bold text-[#8E8AA0]` (via `toLocaleDateString('de-DE', { day:'2-digit', month:'short' })`, wie bisher).
  - Zeile 2: Dauer `6 Min` — `text-[11px] font-semibold text-[#7C6BA0]` mit Icon `⏱️`.
  - Zeile 3: Emoji-Chips der erledigten Tasks (max 4, danach `+n`), plus Fortschritt rechts: `2/3 erledigt` in `text-[10px] font-bold text-[#00A381]` oder `✅ Alles geschafft!`.
- **Rechts oben XP-Chip:** `bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-white text-[11px] font-black rounded-full px-2.5 py-1` mit `+45`.

> **Titelbild-Regel (Kernanforderung):** `const titleImage = session.before_photo ?? session.after_photo`.
> - Gibt es `before_photo` → **vorher** (Ausgangszustand, emotionaler). Sonst `after_photo`. **Nie beide** in der Liste.
> - Keins vorhanden → Ersatz-Placeholder (Zustand B, Abschnitt 1.3), kein leeres graues Rechteck.

---

### 1.3 Zustände der SessionCard

**A) Mit Foto (der Normalfall)**
```
┌────────────────────────────────────┐
│ [🧹→Foto w-28 h-20] So, 12.02  +45 │
│                   6 Min        │
│                    🧹🛏🗺 2/3 ✅ │
└────────────────────────────────────┘
```

**B) Ohne Foto → Emoji-Standard-Thumb**
```
┌────────────────────────────────────┐
│ [ 🧹 🛏   ]          So, 12.02  +45 │
│ [ 🧺 🗑   ]          6 Min           │
│  (2×2 Grid)            🧹🛏        │
└────────────────────────────────────┘
```
- Ersatz-Thumb: `<div class="h-20 w-28 rounded-2xl bg-[#F0EDFF] border border-[#E0D8F0] grid grid-cols-2 place-items-center">` mit max. 4 Emojis à `text-[18px]`. Bei > 4 das letzte Tile als `+N` (`text-[10px] font-bold text-[#7C6BA0]`).
- Emojis stammen aus den **erledigten** Tasks.

**C) Erste Session / keine Sessions (`sessions.length === 0`)**
```
╔══ 🧹 Deine Aufräum-Actions ════╗
║  🧸 Noch keine Aufräum-Action! ║
║  Starte deine erste Session    ║
║  [ 🔥 Session starten ]        ║ ← weiße CTA-Karte (rounded-[16px] bg-white shadow-sm)
╚════════════════════════════════╝
```
- Abschnitt wird in dieser Sektion **nur** gezeigt wenn `sessions.length === 0`; stattdessen Emoji + `Noch keine Aufräum-Action!` (`text-[13px] font-semibold text-[#8E8AA0]`) + CTA-Button der zu `/dashboard` navigiert.

---

## 2. Session-Detail-Ansicht (Tap auf eine SessionCard)

Öffnet **full-screen** (keine BottomNav), analog den `/session/*`-Seiten. Vollständig eigener Screen, kein Overlay.

```
┌──────────────────────────────────────┐ bg-[#FFF5E6]
│ ← Zurück        So, 12.02   •••    │ ← Sticky-Header (≤2 Zeilen, max-w 420px)
│                                      │   bg-[#FFF5E6]/95 + backdrop-blur
│  ┌────────────────────────────────┐  │
│  │         +45 XP                 │  │ ← XP-Karte (Orange-Gradient)
│  │   Alle geschafft! 🎉           │  │
│  └────────────────────────────────┘  │
│                                      │
│  •───── STATS ─────•                 │
│  ┌─────┐ ┌──────┐ ┌───────┐        │   ← 3 weiße Karten, grid-cols-3
│  │ ⏱️  │ │  ✅  │ │  ⭐   │        │
│  │ 6:14 │ │ 3/3  │ │ +45 XP │        │
│  └─────┘ └──────┘ └───────┘        │
│                                      │
│  📸 Vorher · Nachher                 │
│  ┌────────────┐  ┌────────────┐     │   ← side-by-side, h-40 w-full
│  │  (Foto)     │  │  (Foto)    │     │      object-cover rounded-2xl
│  └────────────┘  └────────────┘     │   nur vorhandene Slots rendern
│                                      │
│  ✅ ERLEDIGT (3)                     │
│  ┌────────────────────────────┐     │
│  │ 🧹 Aufräum im Zimmer     ✓ │     │   ← weiße Zeile
│  ├──────────────────────────...
│  └───────────────────────────┘
│                                      │
│  ○ OFFEN (1)                         │
│  ┌────────────────────────────┐     │   ← bg-[#F0EBF8] graue Zeile
│  │ 🪟 Fenster putzen        ○ │     │
│  └───────────────────────────┘     │
```

### 2.1 Header
- Links: Zurück-Button `←` (min. `min-h-[44px] min-w-[44px]`, `aria-label="Zurück"`, rund `rounded-[12px] bg-white shadow-sm flex items-center justify-center`).
- Mitte: Datum `So., 12.02.` — `text-[14px] font-black text-[#2D1B69]`.
- Rechts: ggf. `📷 Foto ergänzen` (klein, nur wenn ein Foto fehlt — optional, off-Scope). Standardmäßig keine weitere Aktion einbauen.

### 2.2 XP-Hero-Karte
Wiederverwendung der SessionResult-Bildsprache:
```
rounded-[20px] bg-gradient-to-br from-[#FFD700] to-[#FFA500] p-6 text-white shadow-[0_8px_24px_rgba(255,215,0,0.25)]
  "XP verdient"          ← text-[11px] font-bold uppercase tracking-wider text-white/80
  "+45"                  ← text-[40px] font-black tabular-nums
  "Alle geschafft! ✅" | "3 von 5 erledigt — weiter so! 💪"   ← text-[12px] font-bold text-white/85
```

### 2.3 Statistik-Reihe
3 weiße Karten `rounded-[16px] bg-white p-3 text-center shadow-sm` in `grid grid-cols-3 gap-3` (wie die bestehende Stat-Reihe auf Achievements):
1. ⏱️ **Dauer** — `formatDuration(duration)` → `6:14`, Label `Dauer`.
2. ✅ **Erledigt** — `3 / 5`, Label `Aufgaben`.
3. ⭐ **XP** — `+45`, Label `Punkte`.
Finale Empfehlung: **Dauer · Erledigt `n/total` · XP** — drei stabile, aus `SessionRow` direkt ableitbare Werte.

### 2.4 Vorher/Nachher Foto-Paar
- Nur rendern wenn `before_photo || after_photo`. Falls kein einziges Foto → Abschnitt fehlt komplett (kein leerer Platz mit gestrichelten Rahmen — das wäre Galerie-Feeling).
- Container: `flex gap-2` (Side-by-Side). Jeder vorhandene Slot ist `flex-1`.
- Bild: `h-40 w-full rounded-2xl object-cover`. Darunter Label `Vorher`/`Nachher` — `text-[10px] font-bold text-[#7C6BA0]` zentriert.
- **Alt-Texte:** `Vorher-Foto vom 12.02.2025` / `Nachher-Foto vom 12.02.2025` (nicht nur "Vorher").

### 2.5 Aufgaben-Liste → "Erledigt / Offen"
Zwei Abschnitte, nur jene anzeigen die nicht leer sind (wenn keine offenen Tasks → "Offen" weg; wenn keine erledigten → "Erledigt" weg):
- Überschrift: `✅ ERLEDIGT (3)` bzw. `○ OFFEN (1)` — `text-[14px] font-black text-[#2D1B69] mb-2`.
- **Zeile erledigt:** `flex items-center gap-2.5 rounded-[14px] bg-white p-3 shadow-sm` — Emoji (oder `image_url` kleines rundes Thumb 28px) + `text-[13px] font-bold text-[#2D1B69]` + rechts Check `✓`.
- **Zeile offen:** gleiche Struktur mit `bg-[#F0EBF8] opacity-80` (`opacity-60` der war zu schwach für Text), Emoji grau `grayscale opacity-70`, rechts `○`, Titel `text-[13px] font-semibold text-[#8E8AA0]`.

### 2.6 Datenmapping & Fehlerfälle
- Aufbau: `const tasksById = new Map(familyTasks.map(t => [t.id, t]))`.
- Je Session: `all = task_ids.map(id => tasksById.get(id))`, `done = completed_task_ids.map(id => tasksById.get(id))`, `open = all.filter(t => t && !completed_task_ids.includes(t.id))`.
- **Verwaiste Task** (TaskRow gelöscht, ID aber noch in `task_ids`): Ersatzzeile `🤷 Aufgabe gelöscht` in `text-[11px] font-semibold text-[#9E96B0]`, weder als done noch offen sichtbar aber zählt nicht mit (nur Warnung).
- Nicht geladene/loading-Zustände → bestehende Sprachmuster `LoadingScreen` (`components/ui/LoadingScreen.tsx`) verwenden.

---

## 3. Navigation — Empfehlung: React-Router-Route (kein Modal)

**Empfehlung: neue Route `/achievements/session/:sessionId` — full-screen, außerhalb der `AppShell` (ohne BottomNav), analog `/session/*`.**

Begründung:
1. **Native Back** funktioniert (Browser-/Android-Hardware-Back) — stabil für Kinder; ausreichen als Zurück-Knopf im Header.
2. **Deep-Link-/Refresh-fähig**; einfacher Test; kein Modal-Overlay-Zustand, keine Escape-Konflikte mit Foto-Viewer.
3. Platz: Vorher/Nachher + Listen brauchen die volle Breite (max 420px), keine BottomNav-Klemme.
4. Konsistent mit bestehenden Detail-Flows (`SessionResult` ist auch eine eigene Route mit eigener Seite).

**Alternativen (verworfen):**
- **Modal/BottomSheet** — modal-in-Modal-Probleme beim Level-up-Modal, zu wenig Platz für die Fotos, fühlt sich wie eine Galerie-Popup an. Abgelehnt, weil Galerie-Feeling entgegen der Anforderung.
- In-App-Akkordeon (auf Seite real ausklappen) → Overload der Erfolge-Seite, weniger klar.

**App.tsx-Skizze (Design-Vorschlag, kein Code):**

```
<Routes>
  …
  <Route path="/achievements/session/:sessionId" element={<SessionDetail />} />
  …
</Routes>
```
(Neben den `/session/*`-Routen, außerhalb des `<AppShell/>`.)

**Öffnen:** `SessionCard.onClick` → `navigate('/achievements/session/' + session.id)`.

**Datenversorgung des Details:**
- Kein neuer Backend-Endpoint nötig: Detail lädt selbst `getFamilyTasks(familyId)` + `getMemberSessions(member.id, 50)` und findet den Session-Eintrag per `sessionId`.
- **Variante (empfohlen als Optimierung):** Die Liste übergibt zusätzlich `location.state = { session: SessionRow }` → sofortige Darstellung ohne erneuten Fetch; ohne `state` (z.B. nach Refresh) Fallback: `getMemberSessions().find(s => s.id === Number(sessionId))`. Source-of-truth bleibt die DB.
- Zurück: `navigate(-1)` — falls direkt per URL geöffnet (keine History), Fallback auf `/achievements`.

---

## 4. Interaktionen & Accessibility

**Tappziele ≥ 44px**
- SessionCard: ganze Karte mind. `min-height 76px` (p-3 + 2 Zeilen) — touch-safe; `active:scale-[0.98]`.
- Zurück-Button: `min-h-[44px] min-w-[44px]`.
- CTA-Button Empty-State: `py-3 px-6 text-[14px] font-bold`.

**Press-Feedback**
- Einheitliche Rechteck-Transitions wie im Codebase: `transition-all active:scale-[0.98]` auf allen klickbaren Cards/Buttons.
- Alte Schattierung bleibt `shadow-sm`; kein Hover-Effekt auf Touch.

**Alt-Text / Screenreader**
- Bilder: `alt="Vorher-Foto der Session vom {12.02.2025}"` (kontextreicher).
- Emoji-Thumb (Default-B): `role="img" aria-label="Erledigte Aufgaben nicht verfügbar"` kein falsches Foto.
- XP-Chip: Statt Hintergrund-Trick für SR Beschreibungstext, Emoji haben `aria-hidden` wo dekorativ.

**Kontrast (AA)**
- XP-Chip weißer Text auf Orange-gradient: groß, 11px bold gesetzt, ok (wie SessionResult) — nicht 10px.
- Labels `#8E8AA0` nur klein/klein, immer `font-bold`/`font-semibold` für Lesbarkeit (bestätigt das bestehende Muster im Codebase).
- Offene Tasks auf `#F0EBF8`: Titel bleibt `#2D1B69` (erfüllt AA auf cream).

**Animation & Scroll**
- Keine neuen Autoplay-Animationen. Optional dezenter Fade beim Öffnen des Details (`animate-in fade-in`), sonst nichts Neues.
- Liste scrollt mit der bestehenden Seite (kein eigener Scroll-Container).

**Semantik**
- Liste in `section aria-label="Aufräum-Actions"`, `ul > li` je Session.
- Detail: `<h1>` = `Session vom {Datum}`.

---

## 5. Komponenten-Spezifikation (React)

| Komponente | Pfad | Props | Verantwortung |
|---|---|---|---|
| `SessionCard` | `src/components/sessions/SessionCard.tsx` | `{ session: SessionRow; tasksById: Map<number, TaskRow>; onClick: (s: SessionRow) => void }` | Rendert Titelbild (Foto `before ?? after`) oder Emoji-Placeholder, Datum, Dauer, XP-Chip, Emoji-Preview, Fortschritt `n/total`. |
| `SessionThumb` | `SessionCard` intern | `{ session; tasksById }` | Das Titelbild-Block: Foto ODER 2×2 Emoji-Grid, siehe Abschnitt 1.2/1.3. |
| `EmptySessions` | `src/components/sessions/EmptySessions.tsx` | `{ onStartSession: () => void }` | CTA-Karte für den Fall `sessions.length === 0`. |
| `SessionDetail` | `src/pages/SessionDetail.tsx` | `useParams().sessionId`; intern `useAuth`, `getFamilyTasks`, `getMemberSessions` | Header, XP-Karte, StatsRow, PhotoPair, Aufgaben-Split. |
| `SessionPhotoPair` | `src/components/sessions/SessionPhotoPair.tsx` | `{ session: SessionRow }` | `null` bei keinem Foto; sonst side-by-side Slots mit Label darunter. |
| `SessionStatsRow` | `src/components/sessions/SessionStatsRow.tsx` | `{ durationSec: number; doneCount: number; totalCount: number; xp: number }` | 3 weiße Stat-Cards (Dauer · Erledigt · XP). |
| `TaskListBlock` | `src/components/sessions/TaskListBlock.tsx` | `{ heading: string; tasks: TaskRow[]; done: boolean }` | "✅ Erledigt" / "○ Offen" jeweils mit Zeilen; Deleted-Task-Fallback. |
| `formatDuration` | `src/lib/utils.ts` (neu) | `(sec: number): string` | `mm:ss`, z.B. `6:14`. |

**Hinweis**: `SessionCard` löst die `src` via `session.before_photo ?? session.after_photo` auf. Die `tasksById` Map wird von `Achievements.tsx` gebaut (es lädt bereits `getMemberSessions`, neu dazu `getFamilyTasks(familyId)` im `useEffect`) und an die Liste gereicht.

**Datenfluss:**

```
Achievements.tsx
   ├─ getMemberSessions(member.id, 50)  → sessions (bestehend)
   ├─ getFamilyTasks(familyId)          → tasksById Map  (NEU)
   └─ map → <SessionCard/> Liste  +  EmptyState
                │ tap
                ▼
         navigate('/achievements/session/:id')
SessionDetail.tsx
   ├─ location.state?.session ?? (useParams().sessionId + getMemberSessions().find)
   ├─ getFamilyTasks → map
   └─ XP-Karte · StatsRow · PhotoPair · TaskListBlock(2)
```

---

## 6. Checkliste für die Implementierung (nur Referenz)

1. `Achievements.tsx`: ersetze Galerie-Block (Z.251–295) durch Sektion `🧹 Deine Aufräum-Actions` + `SessionCard`-Liste + `EmptyState`; `getFamilyTasks` laden und `tasksById` bauen.
2. `App.tsx`: Route `/achievements/session/:sessionId` registrieren (außerhalb AppShell) + `SessionDetail` import.
3. `components/sessions/` anlegen: `SessionCard`, `EmptyState`, `SessionPhotoPair`, `SessionStatsRow`, `TaskListBlock`.
4. `src/pages/SessionDetail.tsx` (Datenmap wie Abschnitt 2.6) + `lib/utils` `formatDuration`.

---

## Anhang — Tokens (verbindlich, unverändert aus dem Codebase)

| Rolle | Farbe | Tailwind |
|---|---|---|
| Seite | `#FFF5E6` | `bg-[#FFF5E6]` |
| Überschrift/Accent | `#2D1B69` | `text-[#2D1B69]` · font-black |
| Muted 1 | `#8E8AA0` | `text-[#8E8AA0]` (Labels) |
| Muted 2 | `#7C6BA0` | `text-[#7C6BA0]` |
| Violett-Gradient | `#6C5CE7 → #8B7CF7` | `bg-gradient-to-br from-[#6C5CE7] to-[#8B7CF7]` |
| XP/Karte-Grad | `#FFD700 → #FFA500` | `bg-gradient-to-br from-[#FFD700] to-[#FFA500]` |
| Erfolg | `#00A381` | `text-[#00A381]` |
| Sanftes Violett | — | `bg-[#F0EDFF]` / `bg-[#F0EBF8]` |
| Rahmen | `#E0D8F0` | `border-[#E0D8F0]` |
| Karte | — | `rounded-[16px] bg-white shadow-sm` |
| Foto-Thumb | — | `h-20 w-28 rounded-2xl object-cover` |
| Bild (Detail) | — | `h-40 w-full rounded-2xl object-cover` |