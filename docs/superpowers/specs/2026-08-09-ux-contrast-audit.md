# UX-Kontrast-Audit FamilyBoard (WCAG 2.1 AA)

Datum: 2026-08-09
Ziel: Stück-für-Stück-Audit aller Screens auf Kontrast (WCAG AA) + ARIA-Plausibilität.
Kontrast-Tool: `~/.claude/skills/bmad/bmad-skills/ux-designer/scripts/contrast-check.py`
Verifikation: `npx tsc --noEmit && npm run lint && npm run build` (grün).

## Wiederkehrendes Ersatz-Farb-Set

| Alt | Problem | Ersatz | Ratio |
|-----|---------|--------|-------|
| `#8E8AA0` (Text) | 3.34 auf White | `#72618F` | 5.05–5.49 |
| `#7C6BA0` (Text auf `#F0EBF8`/`#FFF5E6`) | 4.09/4.14 | `#72618F` | 4.69/5.09 |
| `#00A381` (Text/Icon) | 3.20 White, 2.98 `#E0FFE0` | `#008161` | 4.87/4.53 |
| `#E05555` (Text auf `#FFE0E0`) | 3.03 | `#B8352E` | 4.74 |
| `#E05555` (Text auf White) | 3.75 | `#C43933` | 5.28 |
| `#8B7CF7` (Gradient-Ende, White-Text) | 3.32 | `#7968CA` | 4.52 |
| `#A29BFE` (Gradient-Ende, White-Text) | 2.43 | `#7968CA` | 4.52 |
| `#FFD700→#FFA500` (Gold, White-Text) | 1.40 | dunkle Schrift `#2D1B69` | 10.17 |
| `#E0D8F0` (Border auf `#F0EDFF`) | 1.20 | `#8E7FAB` | 3.64 |
| `#C8BEE0` (Progress-Track) | failt | `#E7E0F5` (Fill `#6C5CE7`/`#008161`) | ≥3.0 |
| `#FFD700`-Star-Icon | 1.40 | `#A67C00` | — |
| `#6C5CE7` (Text auf `#F0EDFF`, 12px) | 4.23 | `#72618F` | 4.78 |
| `#6C5CE7` (Text auf `#F0EDFF`, BottomNav) | 4.23 | `#5D4CC7` | 5.49 |
| `bg-white/20`-Overlay (Weiß-Text) | 3.55 | `bg-black/20` | 6.61 |

## Screens

### Stück 1 Login
`#7C6BA0`-Text, Ladezustand + Tap-Feedback, `aria`-Labels, `motion-reduce` auf Pulse, Gradient-Ende `#7968CA`.

### Stück 2 Setup
Borders `#8E7FAB`, Toggle als `role="tablist"/"tab"` + `aria-selected`, Fehlermeldung `role="alert"` und `#B8352E`, Kind-Rolle `bg-[#008161]`, Gradient-Ende `#7968CA`, `COLORS`-Array so, dass Weiß überall ≥4.5 (`#8A6D00`, `#C9422B`, `#7968CA`).

### Stück 3 Dashboard
Streak-/XP-/Level-Gradienten (`#7968CA`, `#00785C`), Text-Umbau auf `#72618F`, Streak-retten-Button `bg-black/20`, Erfolgsmeldungen `#008161`.

### Stück 4 WeeklyMission
Gold-Box mit `#2D1B69`-Text statt Weiß, Check `#008161`.

### Stück 5 Backlog
`#72618F`/`#8E7FAB`, Stepper-`aria-label`s, Dialog-`aria-labelledby` + eindeutige `id`s.

### Stück 6 SessionSelect
Borders `#8E7FAB`, Frei-Gradient `#008161→#00785C`, Modus-Toggle `aria-pressed`, Gradient-Ende `#7968CA`.

### Stück 7 SessionActive
Alle Farben auf Ersatz-Set, Track `#E7E0F5`, `opacity-50`-Text entfernt, Dialog-`aria-labelledby`.

### Stück 8 SessionFree
Batch wie Stück 7, Camera-Icon `#008161`, Dialog-Titel.

### Stück 9 SessionResult
Goldbox `#2D1B69`, LEVEL UP `#8F6A00`, Fotos-gespeichert `#008161`, Streak `#C43933`, XP-Fill kontrastfest, Dialog-`aria-labelledby`.

### Stück 10 SessionDetail + `components/sessions/*`
SessionStatsRow/TaskListBlock/EmptySessions/SessionCard: `#72618F`, `#008161`, Gold-Pill `#2D1B69`, Gradient `#7968CA`, `opacity-80` entfernt, SessionCard-Border `#8E7FAB`.

### Stück 11 Achievements
Level-/Streak-Gradienten, Badge-Farben, Star `#A67C00`, `opacity-60`-Locked-Zeilen entfernt.

### Stück 12 Profile
`#72618F`-Labels, Star `#A67C00`, Flame `#C43933`, Erfolgsmeldung/`#008161`, Redeem-Gradient `#008161→#00785C`, Später-Button `#72618F`, Dialog-`aria-labelledby`.

### Stück 13 Rewards
`#72618F`, Erfolgsmeldung `#008161`, Fehlermeldung `#B8352E`, Gradient-Enden `#7968CA`, Später-Button `#72618F`, Dialog-`aria-labelledby`.

## Übergreifende Komponenten

- **BottomNav**: Aktiv `#5D4CC7` auf `#F0EDFF` (5.49), Inaktiv `#72618F`, Label 9→10px.
- **AppShell**: keine Kontrast-Probleme.
- **CameraCapture**: Gradient-Ende `#7968CA`, Schließen `#72618F`, `aria-labelledby` auf Fehler- und Kamera-Dialog.
- **ErrorBoundary**: Text `#72618F`.

## Bewusst unverändert (ok/dekorativ)

- Gold-Boxen mit `#2D1B69`-Text (≥5.5).
- Borders `#00A381` auf `#E6FFF5` (3.05) und Hover-Icons `#E05555` auf White (3.75).
- Firework-Partikel, Avatar-/Level-Farbflächen mit Emoji (kein Text).
- `#7C6BA0` auf White (4.70) als Labels.

## Offene Punkte

- **Datenmigration Avatar-Farben**: `members.color` kann noch alte Palette-Werte
  (`#FDCB6E`, `#FF8E53`, `#A29BFE`) enthalten, auf denen das weiße Initial failt.
  Fix als `migrations/008_remap_legacy_avatar_colors.sql` vorbereitet — im Supabase
  SQL Editor ausführen (idempotent).
- **Browser-Verifikation interaktiver Flows**: ARIA/`aria-labelledby` statisch
  validiert, aber Redeem-/LevelUp-/Camera-Dialoge nicht per E2E/Tastatur geprüft.
- Logik-Abdeckung über Vitest (82 Tests) inkl. screen-time-redeem,
  reward-redeem, gamification, streak — grün.
