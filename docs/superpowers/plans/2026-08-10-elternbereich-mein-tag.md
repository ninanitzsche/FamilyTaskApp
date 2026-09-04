# Elternbereich „Mein Tag" Implementation Plan

> **Für agentische Ausführer:** ERFORDERLICHE SUB-SKILL: superpowers:subagent-driven-development (empfohlen) oder superpowers:executing-plans, um diesen Plan Task für Task umzusetzen. Schritte verwenden Checkbox-Syntax (`- [ ]`).

**Goal:** Eltern bekommen einen eigenen Bereich „Mein Tag" mit Self-Care-Checkliste, bis zu 3 „Heute"-Aufgaben (WIP-Limit), Abend-Rückblick, Wochen-Statistik und 18:00-Erinnerung.

**Architecture:** Neue Supabase-Tabellen (Migration 009) für Self-Care-Bibliothek, persönliche Auswahl, tägliche Abschlüsse und Tages-Picks. Eine neue Seite `src/pages/MyDay.tsx` für Eltern, ein wiederverwendbarer `completeTaskRow`-Helper (aus SessionResult extrahiert), rollenabhängige Navigation in App.tsx/BottomNav und eine `useEveningReminder`-Hook (Notification-API).

**Tech Stack:** React 19 + Vite + TypeScript + Tailwind v4 + daisyUI + Zustand, Supabase (PostgreSQL + RLS), Vitest, vite-plugin-pwa.

---

**Wichtige Voraussetzung:** Migration 009 muss einmalig manuell im Supabase SQL Editor ausgeführt werden, bevor die App die neuen Tabellen nutzt (etabliertes Muster, siehe `migrations/008_remap_legacy_avatar_colors.sql`).

## Dateistruktur

| Datei | Rolle |
|---|---|
| `migrations/009_self_care_and_my_day.sql` | (neu) 4 Tabellen + Seed + RLS |
| `src/types/supabase.ts` | (ändern) neue Row/Insert-Typen |
| `src/lib/tasks.ts` | (ändern) + `completeTaskRow` |
| `src/lib/selfCare.ts` | (neu) Supabase-Calls + pure Helper |
| `src/pages/MyDay.tsx` | (neu) Eltern-Startseite |
| `src/hooks/useEveningReminder.ts` | (neu) 18:00-Notification |
| `src/pages/SessionResult.tsx` | (ändern) Task-Abschluss refactorn |
| `src/App.tsx` | (ändern) Route `/meintag` + Redirect |
| `src/components/layout/BottomNav.tsx` | (ändern) Eltern-Tab |
| `src/pages/Login.tsx` | (ändern) Hinweis entfernen |
| `src/__tests__/complete-task-row.test.ts` | (neu) TDD |
| `src/__tests__/self-care.test.ts` | (neu) TDD |

Befehle (immer im Projekt-Root `FamilyBoard/`):
- Test einzelner File: `npx vitest run src/__tests__/self-care.test.ts`
- Alle Tests: `npx vitest run` (aktuell 108 grün, danach 108 + neue)
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Build: `npm run build`

---

### Task 1: Migration 009 + Typen

**Files:**
- Create: `migrations/009_self_care_and_my_day.sql`
- Modify: `src/types/supabase.ts`

- [ ] **Step 1: Migration anlegen**

`migrations/009_self_care_and_my_day.sql`:

```sql
-- Migration 009: Elternbereich "Mein Tag" — Self-Care & Tages-Picks
-- Run this in Supabase SQL Editor
--
-- Neue Tabellen:
--   self_care_items       Bibliothek (globaler Seed + familieneigene Items)
--   member_self_care      persönliche Auswahl + Reihenfolge
--   self_care_completions tägliches Abhaken (unique pro Tag)
--   my_day_tasks          "Heute"-Picks (WIP-Limit wird in der Anwendung erzwungen)
--
-- Alle Statements sind idempotent.

create table if not exists self_care_items (
  id bigint primary key generated always as identity,
  family_id bigint references families(id) on delete cascade,
  category text not null check (category in ('meds','movement','basics','rest','morning_evening')),
  label text not null,
  emoji text not null default '✅',
  time_of_day text not null default 'any' check (time_of_day in ('morning','evening','any')),
  created_at timestamptz not null default now()
);

create table if not exists member_self_care (
  id bigint primary key generated always as identity,
  member_id bigint references members(id) on delete cascade not null,
  item_id bigint references self_care_items(id) on delete cascade not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  constraint member_self_care_member_item_unique unique (member_id, item_id)
);

create table if not exists self_care_completions (
  id bigint primary key generated always as identity,
  member_id bigint references members(id) on delete cascade not null,
  item_id bigint references self_care_items(id) on delete cascade not null,
  done_date date not null,
  completed_at timestamptz not null default now(),
  constraint self_care_completions_unique unique (member_id, item_id, done_date)
);

create table if not exists my_day_tasks (
  id bigint primary key generated always as identity,
  member_id bigint references members(id) on delete cascade not null,
  task_id bigint references tasks(id) on delete cascade not null,
  day date not null,
  position int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint my_day_tasks_unique unique (member_id, task_id, day)
);

create index if not exists self_care_items_family_idx on self_care_items(family_id);
create index if not exists member_self_care_member_idx on member_self_care(member_id);
create index if not exists self_care_completions_member_date_idx on self_care_completions(member_id, done_date);
create index if not exists my_day_tasks_member_day_idx on my_day_tasks(member_id, day);

-- Seed: globale Bibliothek (family_id null)
insert into self_care_items (category, label, emoji, time_of_day)
select * from (values
  ('meds','Medikamente','💊','any'),
  ('meds','Medikamente morgens','🌅','morning'),
  ('meds','Vitamine','💉','any'),
  ('movement','Spaziergang','🚶','any'),
  ('movement','Dehnen','🧘','morning'),
  ('movement','Bewegung','🏃','any'),
  ('basics','Wasser trinken','💧','any'),
  ('basics','Essen','🍎','any'),
  ('basics','Pause machen','🛋️','any'),
  ('rest','Lesen','📚','evening'),
  ('rest','Hobby-Zeit','🧩','any'),
  ('rest','Ruhe','😴','any'),
  ('morning_evening','Zähne putzen','🪥','morning'),
  ('morning_evening','Pflege-Routine','🧴','evening'),
  ('morning_evening','Bildschirmzeit beenden','📵','evening'),
  ('morning_evening','Abendplan (morgen bereit)','🎒','evening')
) as seed(category, label, emoji, time_of_day)
where not exists (select 1 from self_care_items where family_id is null and label = seed.label);

-- RLS
alter table self_care_items enable row level security;
alter table member_self_care enable row level security;
alter table self_care_completions enable row level security;
alter table my_day_tasks enable row level security;

-- self_care_items: SELECT global + familieneigen; INSERT/UPDATE/DELETE nur Eltern
drop policy if exists "members can read self care items" on self_care_items;
create policy "members can read self care items"
  on self_care_items for select to authenticated
  using (family_id is null or family_id = public.get_family_id_for_auth_uid());

drop policy if exists "parents can insert self care items" on self_care_items;
create policy "parents can insert self care items"
  on self_care_items for insert to authenticated
  with check (
    family_id = public.get_family_id_for_auth_uid()
    and exists (select 1 from members m where m.auth_id = auth.uid() and m.role = 'parent')
  );

drop policy if exists "parents can update self care items" on self_care_items;
create policy "parents can update self care items"
  on self_care_items for update to authenticated
  using (family_id = public.get_family_id_for_auth_uid())
  with check (family_id = public.get_family_id_for_auth_uid());

drop policy if exists "parents can delete self care items" on self_care_items;
create policy "parents can delete self care items"
  on self_care_items for delete to authenticated
  using (family_id = public.get_family_id_for_auth_uid());

-- member_self_care: nur eigenes Mitglied
drop policy if exists "members can read own self care selection" on member_self_care;
create policy "members can read own self care selection"
  on member_self_care for select to authenticated
  using (member_id in (select id from members where auth_id = auth.uid()));

drop policy if exists "members can insert own self care selection" on member_self_care;
create policy "members can insert own self care selection"
  on member_self_care for insert to authenticated
  with check (member_id in (select id from members where auth_id = auth.uid()));

drop policy if exists "members can delete own self care selection" on member_self_care;
create policy "members can delete own self care selection"
  on member_self_care for delete to authenticated
  using (member_id in (select id from members where auth_id = auth.uid()));

-- self_care_completions: nur eigenes Mitglied
drop policy if exists "members can read own completions" on self_care_completions;
create policy "members can read own completions"
  on self_care_completions for select to authenticated
  using (member_id in (select id from members where auth_id = auth.uid()));

drop policy if exists "members can insert own completions" on self_care_completions;
create policy "members can insert own completions"
  on self_care_completions for insert to authenticated
  with check (member_id in (select id from members where auth_id = auth.uid()));

drop policy if exists "members can delete own completions" on self_care_completions;
create policy "members can delete own completions"
  on self_care_completions for delete to authenticated
  using (member_id in (select id from members where auth_id = auth.uid()));

-- my_day_tasks: nur eigenes Mitglied
drop policy if exists "members can read own my day tasks" on my_day_tasks;
create policy "members can read own my day tasks"
  on my_day_tasks for select to authenticated
  using (member_id in (select id from members where auth_id = auth.uid()));

drop policy if exists "members can insert own my day tasks" on my_day_tasks;
create policy "members can insert own my day tasks"
  on my_day_tasks for insert to authenticated
  with check (member_id in (select id from members where auth_id = auth.uid()));

drop policy if exists "members can update own my day tasks" on my_day_tasks;
create policy "members can update own my day tasks"
  on my_day_tasks for update to authenticated
  using (member_id in (select id from members where auth_id = auth.uid()))
  with check (member_id in (select id from members where auth_id = auth.uid()));

drop policy if exists "members can delete own my day tasks" on my_day_tasks;
create policy "members can delete own my day tasks"
  on my_day_tasks for delete to authenticated
  using (member_id in (select id from members where auth_id = auth.uid()));
```

- [ ] **Step 2: Migration im Supabase SQL Editor ausführen**

Im Supabase-Dashboard → SQL Editor → Inhalt von `migrations/009_self_care_and_my_day.sql` einfügen → „Run". Erwartet: keine Fehler, 4 Tabellen + 16 Seed-Items.

- [ ] **Step 3: Typen erweitern**

`src/types/supabase.ts`: In `Database.Tables` ergänzen:

```ts
      self_care_items: { Row: SelfCareItemRow; Insert: SelfCareItemInsert }
      member_self_care: { Row: MemberSelfCareRow; Insert: MemberSelfCareInsert }
      self_care_completions: { Row: SelfCareCompletionRow; Insert: SelfCareCompletionInsert }
      my_day_tasks: { Row: MyDayTaskRow; Insert: MyDayTaskInsert }
```

Neue Typen am Dateiende ergänzen:

```ts
export type SelfCareCategory = 'meds' | 'movement' | 'basics' | 'rest' | 'morning_evening'
export type SelfCareTimeOfDay = 'morning' | 'evening' | 'any'

export interface SelfCareItemRow {
  id: number
  family_id: number | null
  category: SelfCareCategory
  label: string
  emoji: string
  time_of_day: SelfCareTimeOfDay
  created_at: string
}
export interface SelfCareItemInsert {
  family_id: number | null; category: SelfCareCategory; label: string; emoji: string; time_of_day: SelfCareTimeOfDay
}

export interface MemberSelfCareRow {
  id: number
  member_id: number
  item_id: number
  position: number
  created_at: string
}
export interface MemberSelfCareInsert {
  member_id: number; item_id: number; position: number
}

export interface SelfCareCompletionRow {
  id: number
  member_id: number
  item_id: number
  done_date: string
  completed_at: string
}
export interface SelfCareCompletionInsert {
  member_id: number; item_id: number; done_date: string
}

export interface MyDayTaskRow {
  id: number
  member_id: number
  task_id: number
  day: string
  position: number
  completed_at: string | null
  created_at: string
}
export interface MyDayTaskInsert {
  member_id: number; task_id: number; day: string; position?: number
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (keine Fehler; neue Typen sind unbenutzt, TS meldet das nicht).

- [ ] **Step 5: Commit**

```bash
git add migrations/009_self_care_and_my_day.sql src/types/supabase.ts
git commit -m "feat: migration 009 — self care & my day tables with RLS"
```

---

### Task 2: `completeTaskRow`-Helper (TDD) + SessionResult-Refactor

**Files:**
- Modify: `src/lib/tasks.ts`
- Create: `src/__tests__/complete-task-row.test.ts`
- Modify: `src/pages/SessionResult.tsx:5,142-158`

- [ ] **Step 1: Test schreiben**

`src/__tests__/complete-task-row.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { completeTaskRow } from '../lib/tasks'

const base = {
  id: 1,
  completed_count: 5,
  last_completed_at: '2026-08-08T10:00:00.000Z',
  current_streak: 3,
  longest_streak: 7,
  recurring: 'daily' as const,
}

describe('completeTaskRow', () => {
  it('increments completed_count and sets last_completed_at', () => {
    const now = new Date('2026-08-10T08:00:00.000Z')
    const result = completeTaskRow(base, now)
    expect(result.completed_count).toBe(6)
    expect(result.last_completed_at).toBe('2026-08-10T08:00:00.000Z')
  })

  it('accepts an ISO string for now', () => {
    const result = completeTaskRow(base, '2026-08-10T08:00:00.000Z')
    expect(result.last_completed_at).toBe('2026-08-10T08:00:00.000Z')
  })

  it('resets streak to 0 for non-recurring tasks', () => {
    const result = completeTaskRow({ ...base, recurring: 'never' }, new Date())
    expect(result.current_streak).toBe(0)
  })

  it('starts a streak of 1 on first completion', () => {
    const result = completeTaskRow(
      { ...base, last_completed_at: null, current_streak: 0, longest_streak: 0 },
      new Date()
    )
    expect(result.current_streak).toBe(1)
    expect(result.longest_streak).toBe(1)
  })

  it('increments daily streak when completed a day after the last completion', () => {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const result = completeTaskRow(
      { ...base, last_completed_at: yesterday.toISOString(), current_streak: 3, longest_streak: 7 },
      now
    )
    expect(result.current_streak).toBe(4)
    expect(result.longest_streak).toBe(7)
  })

  it('keeps longest_streak when the new streak is shorter than the previous record', () => {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const result = completeTaskRow(
      { ...base, last_completed_at: yesterday.toISOString(), current_streak: 10, longest_streak: 12 },
      now
    )
    expect(result.current_streak).toBe(11)
    expect(result.longest_streak).toBe(12)
  })
})
```

- [ ] **Step 2: Test läuft rot**

Run: `npx vitest run src/__tests__/complete-task-row.test.ts`
Expected: FAIL mit „completeTaskRow is not a function".

- [ ] **Step 3: Helper implementieren**

`src/lib/tasks.ts`: Import ergänzen und Funktion am Dateiende anfügen:

```ts
import { calculateTaskStreak } from './gamification'
```

```ts
export function completeTaskRow(
  task: Pick<
    TaskRow,
    'completed_count' | 'last_completed_at' | 'current_streak' | 'longest_streak' | 'recurring'
  >,
  now: Date | string = new Date()
): Partial<TaskRow> {
  const nowIso = typeof now === 'string' ? now : now.toISOString()
  const { currentStreak, longestStreak } = calculateTaskStreak(
    task.last_completed_at,
    task.current_streak,
    task.longest_streak,
    task.recurring
  )
  return {
    completed_count: task.completed_count + 1,
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_completed_at: nowIso,
  }
}
```

- [ ] **Step 4: Test läuft grün**

Run: `npx vitest run src/__tests__/complete-task-row.test.ts`
Expected: 6 passed.

- [ ] **Step 5: SessionResult auf Helper umstellen**

`src/pages/SessionResult.tsx`:
- Zeile 5: Import ändern zu
  `import { getLevelFromXp, calculateStreak } from '../lib/gamification'`
- Import ergänzen: `import { completeTaskRow } from '../lib/tasks'`
- Schleife (Zeilen 142-158) ersetzen durch:

```tsx
        for (const taskId of completedTaskIds) {
          const task = tasks.find((t) => t.id === taskId)
          if (task) {
            await updateTask(taskId, completeTaskRow(task, now))
          }
        }
```

(Die Variable `now` aus Zeile 116 — ein ISO-String — wird 1:1 weiterverwendet.)

- [ ] **Step 6: Alle Tests + Typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 114 passed (108 + 6 neu), tsc PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/tasks.ts src/pages/SessionResult.tsx src/__tests__/complete-task-row.test.ts
git commit -m "refactor: extract completeTaskRow helper used by SessionResult"
```

---

### Task 3: Self-Care-Lib (TDD)

**Files:**
- Create: `src/lib/selfCare.ts`
- Create: `src/__tests__/self-care.test.ts`

- [ ] **Step 1: Test schreiben**

`src/__tests__/self-care.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  dateKey,
  isItemDoneToday,
  getChecklistProgress,
  isDayComplete,
  nothingDoneToday,
  getOpenPicks,
  canPickMore,
  getCompleteDaysInRange,
  getAvailableTasksForPicker,
  SELF_CARE_CATEGORIES,
} from '../lib/selfCare'
import type { SelfCareItemRow, SelfCareCompletionRow, MyDayTaskRow, TaskRow } from '../types/supabase'

const item = (over: Partial<SelfCareItemRow> = {}): SelfCareItemRow => ({
  id: 1, family_id: null, category: 'meds', label: 'Medikamente', emoji: '💊',
  time_of_day: 'any', created_at: '2026-08-10T08:00:00.000Z', ...over,
})

const completion = (over: Partial<SelfCareCompletionRow> = {}): SelfCareCompletionRow => ({
  id: 1, member_id: 1, item_id: 1, done_date: '2026-08-10', completed_at: '2026-08-10T08:00:00.000Z', ...over,
})

const pick = (over: Partial<MyDayTaskRow> = {}): MyDayTaskRow => ({
  id: 1, member_id: 1, task_id: 10, day: '2026-08-10', position: 0, completed_at: null,
  created_at: '2026-08-10T08:00:00.000Z', ...over,
})

const task = (over: Partial<TaskRow> = {}): TaskRow => ({
  id: 1, family_id: 1, title: 'Aufgabe', emoji: '⭐', image_url: null, assignee_id: null,
  recurring: 'never', cooldown_days: null, last_completed_at: null, completed_count: 0,
  current_streak: 0, longest_streak: 0, task_order: 0, created_at: '2026-08-10T08:00:00.000Z', ...over,
})

describe('selfCare helpers', () => {
  it('formats a local date key as YYYY-MM-DD', () => {
    expect(dateKey(new Date(2026, 7, 10))).toBe('2026-08-10')
  })

  it('detects whether an item is done today', () => {
    const comps = [completion({ item_id: 1 })]
    expect(isItemDoneToday(1, comps)).toBe(true)
    expect(isItemDoneToday(2, comps)).toBe(false)
  })

  it('computes checklist progress', () => {
    const items = [item({ id: 1 }), item({ id: 2 }), item({ id: 3 })]
    expect(getChecklistProgress(items, [completion({ item_id: 1 })])).toEqual({ done: 1, total: 3 })
    expect(getChecklistProgress([], [])).toEqual({ done: 0, total: 0 })
  })

  it('knows when a day is complete', () => {
    const items = [item({ id: 1 }), item({ id: 2 })]
    expect(isDayComplete(items, [completion({ item_id: 1 })])).toBe(false)
    expect(isDayComplete(items, [completion({ item_id: 1 }), completion({ id: 2, item_id: 2 })])).toBe(true)
    expect(isDayComplete([], [])).toBe(false)
  })

  it('reports whether nothing was done today', () => {
    expect(nothingDoneToday([])).toBe(true)
    expect(nothingDoneToday([completion({})])).toBe(false)
  })

  it('returns open picks and enforces the WIP limit', () => {
    const open = [pick({}), pick({ id: 2 }), pick({ id: 3 })]
    const done = pick({ id: 4, completed_at: '2026-08-10T09:00:00.000Z' })
    expect(getOpenPicks([...open, done])).toHaveLength(3)
    expect(canPickMore(open, 3)).toBe(false)
    expect(canPickMore([...open.slice(0, 2), done], 3)).toBe(true)
    expect(canPickMore([], 3)).toBe(true)
  })

  it('computes complete days in a range', () => {
    const items = [item({ id: 1 }), item({ id: 2 })]
    const comps = [
      completion({ item_id: 1, done_date: '2026-08-10' }),
      completion({ item_id: 2, done_date: '2026-08-10' }),
      completion({ item_id: 1, done_date: '2026-08-09' }),
    ]
    const result = getCompleteDaysInRange(items, ['2026-08-08', '2026-08-09', '2026-08-10'], comps)
    expect(result).toEqual([
      { day: '2026-08-08', complete: false },
      { day: '2026-08-09', complete: false },
      { day: '2026-08-10', complete: true },
    ])
  })

  it('filters and prioritizes available tasks for the picker', () => {
    const neverDone = task({ id: 1, last_completed_at: null })
    const oldDone = task({ id: 2, last_completed_at: '2026-07-01T08:00:00.000Z' })
    const recentDone = task({ id: 3, last_completed_at: '2026-08-09T08:00:00.000Z' })
    const otherAssignee = task({ id: 4, assignee_id: 2 })
    const inCooldown = task({ id: 5, cooldown_days: 1, last_completed_at: '2026-08-09T08:00:00.000Z' })
    const picked = task({ id: 6, last_completed_at: null })

    const result = getAvailableTasksForPicker(
      [recentDone, otherAssignee, inCooldown, neverDone, picked, oldDone],
      1,
      (id) => (id === 2 ? 'Lena' : 'jemand'),
      [6],
      new Date('2026-08-10T08:00:00.000Z')
    )
    expect(result.map((t) => t.id)).toEqual([1, 2, 3])
  })

  it('exposes category labels for the five rubrics', () => {
    expect(SELF_CARE_CATEGORIES.morning_evening).toBe('🌅 Morgen & Abend')
    expect(Object.keys(SELF_CARE_CATEGORIES)).toHaveLength(5)
  })
})
```

- [ ] **Step 2: Test läuft rot**

Run: `npx vitest run src/__tests__/self-care.test.ts`
Expected: FAIL (Modul nicht gefunden).

- [ ] **Step 3: Implementieren**

`src/lib/selfCare.ts` (komplett):

```ts
import { supabase } from '../config/supabase'
import type {
  SelfCareItemRow,
  MemberSelfCareRow,
  SelfCareCompletionRow,
  MyDayTaskRow,
  TaskRow,
  SelfCareCategory,
} from '../types/supabase'
import { getTaskStatus } from './tasks'
import { weekKey } from './utils'

export { type SelfCareCategory }

export const SELF_CARE_CATEGORIES: Record<SelfCareCategory, string> = {
  meds: '💊 Medikamente',
  movement: '🚶 Bewegung',
  basics: '🍎 Grundversorgung',
  rest: '🧘 Ruhe & Hobby',
  morning_evening: '🌅 Morgen & Abend',
}

export function dateKey(date: Date): string {
  return weekKey(date)
}

export function isItemDoneToday(itemId: number, completions: SelfCareCompletionRow[]): boolean {
  return completions.some((c) => c.item_id === itemId)
}

export function getChecklistProgress(
  items: SelfCareItemRow[],
  completions: SelfCareCompletionRow[]
): { done: number; total: number } {
  return {
    done: items.filter((i) => isItemDoneToday(i.id, completions)).length,
    total: items.length,
  }
}

export function isDayComplete(
  items: SelfCareItemRow[],
  completions: SelfCareCompletionRow[]
): boolean {
  if (items.length === 0) return false
  return items.every((i) => isItemDoneToday(i.id, completions))
}

export function nothingDoneToday(completions: SelfCareCompletionRow[]): boolean {
  return completions.length === 0
}

export function getOpenPicks(picks: MyDayTaskRow[]): MyDayTaskRow[] {
  return picks.filter((p) => p.completed_at === null)
}

export function canPickMore(picks: MyDayTaskRow[], limit = 3): boolean {
  return getOpenPicks(picks).length < limit
}

export function getCompleteDaysInRange(
  items: SelfCareItemRow[],
  dayKeys: string[],
  completions: SelfCareCompletionRow[]
): { day: string; complete: boolean }[] {
  const ids = items.map((i) => i.id)
  return dayKeys.map((day) => {
    const doneIds = new Set(
      completions.filter((c) => c.done_date === day).map((c) => c.item_id)
    )
    return { day, complete: ids.length > 0 && ids.every((id) => doneIds.has(id)) }
  })
}

export function getAvailableTasksForPicker(
  tasks: TaskRow[],
  memberId: number,
  getAssigneeName: (assigneeId: number | null) => string,
  pickedTaskIds: number[],
  now: Date = new Date()
): TaskRow[] {
  const picked = new Set(pickedTaskIds)
  return tasks
    .filter(
      (t) =>
        getTaskStatus(t, memberId, getAssigneeName(t.assignee_id ?? null), now).available &&
        !picked.has(t.id)
    )
    .sort((a, b) => {
      if (a.last_completed_at === null && b.last_completed_at === null) return a.id - b.id
      if (a.last_completed_at === null) return -1
      if (b.last_completed_at === null) return 1
      return new Date(a.last_completed_at).getTime() - new Date(b.last_completed_at).getTime()
    })
}

export async function getSelfCareLibrary(familyId: number) {
  return supabase
    .from('self_care_items')
    .select('*')
    .or(`family_id.is.null,family_id.eq.${familyId}`)
    .order('id')
}

export async function createSelfCareItem(item: {
  family_id: number
  category: SelfCareCategory
  label: string
  emoji: string
  time_of_day: 'morning' | 'evening' | 'any'
}) {
  return supabase.from('self_care_items').insert(item).select('*').single()
}

export async function getMemberSelfCare(memberId: number) {
  return supabase.from('member_self_care').select('*').eq('member_id', memberId).order('position')
}

export async function setMemberSelfCare(memberId: number, itemIds: number[]) {
  await supabase.from('member_self_care').delete().eq('member_id', memberId)
  if (itemIds.length === 0) return
  const rows = itemIds.map((itemId, position) => ({ member_id: memberId, item_id: itemId, position }))
  await supabase.from('member_self_care').insert(rows)
}

export async function getSelfCareCompletions(memberId: number, day: string) {
  return supabase
    .from('self_care_completions')
    .select('*')
    .eq('member_id', memberId)
    .eq('done_date', day)
}

export async function getSelfCareCompletionsRange(memberId: number, from: string, to: string) {
  return supabase
    .from('self_care_completions')
    .select('*')
    .eq('member_id', memberId)
    .gte('done_date', from)
    .lte('done_date', to)
}

export async function toggleSelfCareCompletion(
  memberId: number,
  itemId: number,
  day: string,
  done: boolean
) {
  if (done) {
    return supabase
      .from('self_care_completions')
      .insert({ member_id: memberId, item_id: itemId, done_date: day })
  }
  return supabase
    .from('self_care_completions')
    .delete()
    .eq('member_id', memberId)
    .eq('item_id', itemId)
    .eq('done_date', day)
}

export async function getMyDayTasks(memberId: number, day: string) {
  return supabase.from('my_day_tasks').select('*').eq('member_id', memberId).eq('day', day).order('position')
}

export async function pickTaskForDay(memberId: number, taskId: number, day: string) {
  return supabase
    .from('my_day_tasks')
    .insert({ member_id: memberId, task_id: taskId, day })
    .select('*')
    .single()
}

export async function markPickCompleted(pickId: number) {
  return supabase
    .from('my_day_tasks')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', pickId)
    .select('*')
    .single()
}

export async function removePick(pickId: number) {
  return supabase.from('my_day_tasks').delete().eq('id', pickId)
}
```

Hinweis: `export { type SelfCareCategory }` re-exportiert den Typ aus `types/supabase.ts`, damit `src/pages/MyDay.tsx` ihn bequem importieren kann.

- [ ] **Step 4: Test läuft grün**

Run: `npx vitest run src/__tests__/self-care.test.ts`
Expected: 9 passed.

- [ ] **Step 5: Alle Tests + Typecheck + Lint**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: 123 passed, tsc PASS, lint PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/selfCare.ts src/__tests__/self-care.test.ts
git commit -m "feat: self-care library with pure helpers and supabase calls"
```

---

### Task 4: MyDay-Page — Skeleton + Self-Care-Checkliste

**Files:**
- Create: `src/pages/MyDay.tsx`

- [ ] **Step 1: Basis-Page anlegen**

`src/pages/MyDay.tsx` (komplett — in den Tasks 5-7 wird sie erweitert):

```tsx
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  getSelfCareLibrary,
  getMemberSelfCare,
  getSelfCareCompletions,
  toggleSelfCareCompletion,
  dateKey,
  SELF_CARE_CATEGORIES,
  type SelfCareCategory,
} from '../lib/selfCare'
import type {
  SelfCareItemRow,
  MemberSelfCareRow,
  SelfCareCompletionRow,
} from '../types/supabase'
import { Check, Settings } from 'lucide-react'

function getGreeting(hour: number): string {
  if (hour < 11) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

export function MyDay() {
  const { member, family } = useAuth()
  const [library, setLibrary] = useState<SelfCareItemRow[]>([])
  const [selection, setSelection] = useState<SelfCareItemRow[]>([])
  const [completions, setCompletions] = useState<SelfCareCompletionRow[]>([])

  const todayKey = dateKey(new Date())
  const hour = new Date().getHours()

  const reload = useCallback(async () => {
    if (!member || !family) return
    const [libRes, selRes, compRes] = await Promise.all([
      getSelfCareLibrary(family.id),
      getMemberSelfCare(member.id),
      getSelfCareCompletions(member.id, todayKey),
    ])
    const lib = (libRes.data as SelfCareItemRow[] | null) ?? []
    const selRows = (selRes.data as MemberSelfCareRow[] | null) ?? []
    const itemById = new Map(lib.map((i) => [i.id, i]))
    setLibrary(lib)
    setSelection(
      selRows
        .map((r) => itemById.get(r.item_id))
        .filter((i): i is SelfCareItemRow => Boolean(i))
    )
    setCompletions((compRes.data as SelfCareCompletionRow[] | null) ?? [])
  }, [member, family, todayKey])

  useEffect(() => {
    reload()
  }, [reload])

  const handleToggleItem = async (itemId: number) => {
    if (!member) return
    const done = completions.some((c) => c.item_id === itemId)
    await toggleSelfCareCompletion(member.id, itemId, todayKey, !done)
    const compRes = await getSelfCareCompletions(member.id, todayKey)
    setCompletions((compRes.data as SelfCareCompletionRow[] | null) ?? [])
  }

  const progress = { done: completions.length, total: selection.length }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[24px] font-black text-ink">
          {getGreeting(hour)}, {member?.name}! 🌞
        </h1>
        <p className="text-[13px] font-semibold text-ink-soft">
          {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">
              Self-Care
            </p>
            <p className="text-[18px] font-black text-ink">
              {progress.done}/{progress.total}
            </p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-wash-plum text-coral-deep">
            <Settings className="h-5 w-5" />
          </span>
        </div>
        {selection.length === 0 ? (
          <p className="py-6 text-center text-[13px] font-semibold text-ink-soft">
            Wähle deine Self-Care-Punkte aus 🌱
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {selection.map((item) => {
              const done = completions.some((c) => c.item_id === item.id)
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleToggleItem(item.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-transform active:scale-[0.98] ${
                      done ? 'border-teal bg-wash-teal' : 'border-wash-plum bg-white'
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[18px] shadow-sm">
                      {item.emoji}
                    </span>
                    <span className="flex-1">
                      <span className={`block text-[15px] font-bold ${done ? 'text-teal-deep' : 'text-ink'}`}>
                        {item.label}
                      </span>
                      <span className="block text-[11px] font-semibold text-ink-soft">
                        {SELF_CARE_CATEGORIES[item.category as SelfCareCategory]}
                      </span>
                    </span>
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                        done ? 'border-teal bg-teal text-white' : 'border-wash-plum'
                      }`}
                    >
                      {done && <Check className="h-5 w-5" strokeWidth={3} />}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (Seite ist noch nicht geroutet, daher keine weitere Prüfung nötig.)

- [ ] **Step 3: Commit**

```bash
git add src/pages/MyDay.tsx
git commit -m "feat: MyDay page skeleton with self-care checklist"
```

---

### Task 5: MyDay — Editor (Bibliothek + eigene Items)

**Files:**
- Modify: `src/pages/MyDay.tsx`

- [ ] **Step 1: Importe und State erweitern**

In `MyDay.tsx` die Importe aus `../lib/selfCare` ergänzen um `setMemberSelfCare`, `createSelfCareItem`; von `lucide-react` zusätzlich `X`, `Plus` (aus `Check`, `Settings`). Ergänzen:

```tsx
import {
  getSelfCareLibrary,
  getMemberSelfCare,
  setMemberSelfCare,
  createSelfCareItem,
  getSelfCareCompletions,
  toggleSelfCareCompletion,
  dateKey,
  SELF_CARE_CATEGORIES,
  type SelfCareCategory,
} from '../lib/selfCare'
```

```tsx
import { Check, Settings, X, Plus } from 'lucide-react'
```

Neue Konstante und States (über den bestehenden States ergänzen):

```tsx
const CATEGORY_ORDER: SelfCareCategory[] = ['morning_evening', 'meds', 'movement', 'basics', 'rest']
```

```tsx
  const [showEditor, setShowEditor] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const [customEmoji, setCustomEmoji] = useState('🌟')
  const [customCategory, setCustomCategory] = useState<SelfCareCategory>('rest')
```

- [ ] **Step 2: Handler ergänzen** (vor dem `return`)

```tsx
  const handleSelectionToggle = async (itemId: number) => {
    if (!member) return
    const next = selection.some((i) => i.id === itemId)
      ? selection.filter((i) => i.id !== itemId)
      : [...selection, library.find((i) => i.id === itemId)].filter(
          (i): i is SelfCareItemRow => Boolean(i)
        )
    await setMemberSelfCare(member.id, next.map((i) => i.id))
    setSelection(next)
  }

  const handleCreateCustom = async () => {
    if (!member || !family || !customLabel.trim()) return
    const { data } = await createSelfCareItem({
      family_id: family.id,
      category: customCategory,
      label: customLabel.trim(),
      emoji: customEmoji || '🌟',
      time_of_day: 'any',
    })
    if (data) {
      const item = data as SelfCareItemRow
      setLibrary((prev) => [...prev, item])
      await handleSelectionToggle(item.id)
      setCustomLabel('')
      setCustomEmoji('🌟')
    }
  }
```

- [ ] **Step 3: Zahnrad als Button + Editor-Modal im JSX**

Im Checklisten-Header das statische `<span>` (Zahnrad) ersetzen durch:

```tsx
          <button
            onClick={() => setShowEditor(true)}
            aria-label="Self-Care bearbeiten"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-wash-plum text-coral-deep transition-transform active:scale-95"
          >
            <Settings className="h-5 w-5" />
          </button>
```

Vor dem schließenden `</div>` des Hauptcontainers (nach dem `</section>` der Checkliste) das Editor-Modal ergänzen:

```tsx
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/30 pb-6">
          <div className="mx-auto w-full max-w-[420px] rounded-t-3xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[18px] font-black text-ink">Self-Care auswählen</h2>
              <button
                onClick={() => setShowEditor(false)}
                aria-label="Schließen"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-wash-plum text-ink-soft"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {CATEGORY_ORDER.map((cat) => {
              const catItems = library.filter((i) => i.category === cat)
              if (catItems.length === 0) return null
              return (
                <div key={cat} className="mb-4">
                  <p className="mb-2 text-[12px] font-bold uppercase tracking-widest text-ink-soft">
                    {SELF_CARE_CATEGORIES[cat]}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {catItems.map((item) => {
                      const selected = selection.some((i) => i.id === item.id)
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectionToggle(item.id)}
                          className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-2 text-[13px] font-bold transition-transform active:scale-95 ${
                            selected
                              ? 'border-coral bg-wash-coral text-coral-deep'
                              : 'border-wash-plum bg-white text-ink-soft'
                          }`}
                        >
                          <span>{item.emoji}</span>
                          {item.label}
                          {selected && <Check className="h-4 w-4" strokeWidth={3} />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            <div className="rounded-2xl bg-wash-plum p-4">
              <p className="mb-2 text-[12px] font-bold uppercase tracking-widest text-ink-soft">
                Eigener Punkt
              </p>
              <div className="flex gap-2">
                <input
                  value={customEmoji}
                  onChange={(e) => setCustomEmoji(e.target.value)}
                  maxLength={4}
                  className="w-14 rounded-xl border-2 border-wash-plum bg-white px-2 py-2 text-center text-[16px]"
                  aria-label="Emoji"
                />
                <input
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="z.B. Tee trinken"
                  className="flex-1 rounded-xl border-2 border-wash-plum bg-white px-3 py-2 text-[14px] font-semibold text-ink outline-none focus:border-coral"
                  aria-label="Name"
                />
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as SelfCareCategory)}
                  className="rounded-xl border-2 border-wash-plum bg-white px-2 py-2 text-[12px] font-semibold text-ink-soft"
                  aria-label="Rubrik"
                >
                  {(Object.keys(SELF_CARE_CATEGORIES) as SelfCareCategory[]).map((c) => (
                    <option key={c} value={c}>
                      {SELF_CARE_CATEGORIES[c]}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleCreateCustom}
                disabled={!customLabel.trim()}
                className="mt-2 w-full rounded-xl bg-coral py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
              >
                Punkt hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 4: Typecheck + Lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS, PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/MyDay.tsx
git commit -m "feat: self-care editor with library picker and custom items"
```

---

### Task 6: MyDay — Heute-Aufgaben (WIP-Limit 3)

**Files:**
- Modify: `src/pages/MyDay.tsx`

- [ ] **Step 1: Importe und State erweitern**

In `MyDay.tsx` Importe ergänzen:

```tsx
import {
  getMyDayTasks,
  pickTaskForDay,
  removePick,
  markPickCompleted,
  getOpenPicks,
  canPickMore,
  getAvailableTasksForPicker,
  ...rest (bestehende selfCare-Importe)
} from '../lib/selfCare'
import { getFamilyTasks, getFamilyMembers, updateTask } from '../lib/supabase'
import { completeTaskRow } from '../lib/tasks'
import type { MyDayTaskRow, TaskRow, MemberRow } from '../types/supabase'
```

(Platzhalter „...rest" heißt: alle bereits importierten Namen bleiben.)

Konstante und States ergänzen:

```tsx
const WIP_LIMIT = 3
```

```tsx
  const [picks, setPicks] = useState<MyDayTaskRow[]>([])
  const [pickedTasks, setPickedTasks] = useState<TaskRow[]>([])
  const [allTasks, setAllTasks] = useState<TaskRow[]>([])
  const [memberRows, setMemberRows] = useState<MemberRow[]>([])
  const [showPicker, setShowPicker] = useState(false)
```

- [ ] **Step 2: `reload` erweitern** (alle Promise-Ergebnisse mitladen)

`reload` im `Promise.all` ergänzen und nach dem Setzen der Self-Care-States ergänzen:

```tsx
    const [libRes, selRes, compRes, pickRes, taskRes, memberRes] = await Promise.all([
      getSelfCareLibrary(family.id),
      getMemberSelfCare(member.id),
      getSelfCareCompletions(member.id, todayKey),
      getMyDayTasks(member.id, todayKey),
      getFamilyTasks(family.id),
      getFamilyMembers(family.id),
    ])
```

Nach `setCompletions(...)`:

```tsx
    const tasks = (taskRes.data as TaskRow[] | null) ?? []
    const pickRows = (pickRes.data as MyDayTaskRow[] | null) ?? []
    const taskById = new Map(tasks.map((t) => [t.id, t]))

    setAllTasks(tasks)
    setMemberRows((memberRes.data as MemberRow[] | null) ?? [])
    setPicks(pickRows)
    setPickedTasks(
      pickRows
        .map((p) => taskById.get(p.task_id))
        .filter((t): t is TaskRow => Boolean(t))
    )
```

- [ ] **Step 3: Handler ergänzen** (vor dem `return`)

```tsx
  const availableForPicker = getAvailableTasksForPicker(
    allTasks,
    member?.id ?? 0,
    (id) => memberRows.find((m) => m.id === id)?.name ?? 'jemand',
    picks.map((p) => p.task_id)
  )

  const handlePickTask = async (taskId: number) => {
    if (!member || !canPickMore(picks)) return
    await pickTaskForDay(member.id, taskId, todayKey)
    await reload()
    setShowPicker(false)
  }

  const handleRemovePick = async (pickId: number) => {
    await removePick(pickId)
    await reload()
  }

  const handleCompletePick = async (pick: MyDayTaskRow) => {
    const task = pickedTasks.find((t) => t.id === pick.task_id)
    if (!task) return
    await updateTask(task.id, completeTaskRow(task))
    await markPickCompleted(pick.id)
    await reload()
  }
```

Und über `const progress = ...` ergänzen:

```tsx
  const openPicks = getOpenPicks(picks)
```

- [ ] **Step 4: JSX-Sektion „Heute-Aufgaben" einfügen**

Nach dem schließenden `</section>` der Self-Care-Checkliste (vor dem Editor-Modal aus Task 5) einfügen:

```tsx
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">
            Heute-Aufgaben
          </p>
          <p className="text-[12px] font-semibold text-ink-soft">
            Max. {WIP_LIMIT} gleichzeitig · {openPicks.length}/{WIP_LIMIT} offen
          </p>
        </div>
        {pickedTasks.length === 0 ? (
          <p className="py-4 text-center text-[13px] font-semibold text-ink-soft">
            Noch nichts gewählt — zieh dir Aufgaben aus dem Brett rein.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {picks.map((pick) => {
              const task = pickedTasks.find((t) => t.id === pick.task_id)
              if (!task) return null
              const done = pick.completed_at !== null
              return (
                <li key={pick.id} className="flex items-center gap-2">
                  <button
                    onClick={() => handleCompletePick(pick)}
                    disabled={done}
                    className={`flex flex-1 items-center gap-3 rounded-2xl border-2 p-3 text-left transition-transform active:scale-[0.98] ${
                      done ? 'border-teal bg-wash-teal opacity-70' : 'border-wash-plum bg-white'
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-wash-gold text-[18px]">
                      {task.emoji}
                    </span>
                    <span className={`flex-1 text-[15px] font-bold ${done ? 'line-through text-teal-deep' : 'text-ink'}`}>
                      {task.title}
                    </span>
                    {done ? (
                      <Check className="h-5 w-5 text-teal" strokeWidth={3} />
                    ) : (
                      <span className="rounded-full bg-wash-teal px-2 py-0.5 text-[11px] font-bold text-teal-deep">
                        Fertig ✓
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleRemovePick(pick.id)}
                    aria-label="Aufgabe entfernen"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wash-coral text-rose-deep"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {canPickMore(picks) ? (
          <button
            onClick={() => setShowPicker(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-wash-plum bg-white py-3 text-[13px] font-bold text-coral-deep transition-transform active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" /> Aufgabe wählen
          </button>
        ) : (
          <p className="mt-3 rounded-xl bg-wash-gold px-3 py-2 text-center text-[12px] font-bold text-gold-deep">
            3 in Arbeit — erst eine abschließen 😉
          </p>
        )}
      </section>
```

- [ ] **Step 5: Task-Picker-Modal einfügen** (nach dem Editor-Modal aus Task 5, vor dem schließenden `</div>`)

```tsx
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/30 pb-6">
          <div className="mx-auto w-full max-w-[420px] rounded-t-3xl bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[18px] font-black text-ink">Aufgabe wählen</h2>
              <button
                onClick={() => setShowPicker(false)}
                aria-label="Schließen"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-wash-plum text-ink-soft"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {availableForPicker.length === 0 ? (
              <p className="py-6 text-center text-[13px] font-semibold text-ink-soft">
                Keine verfügbaren Aufgaben im Brett — eine erledigen oder neue anlegen 🛠️
              </p>
            ) : (
              <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
                {availableForPicker.map((task) => (
                  <li key={task.id}>
                    <button
                      onClick={() => handlePickTask(task.id)}
                      className="flex w-full items-center gap-3 rounded-2xl border-2 border-wash-plum bg-white p-3 text-left transition-transform active:scale-[0.98]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-wash-gold text-[18px]">
                        {task.emoji}
                      </span>
                      <span className="flex-1 text-[15px] font-bold text-ink">{task.title}</span>
                      <Plus className="h-5 w-5 text-coral-deep" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
```

- [ ] **Step 6: Typecheck + Lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS, PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/MyDay.tsx
git commit -m "feat: my-day tasks with WIP limit 3 and prioritized picker"
```

---

### Task 7: MyDay — Abend-Rückblick, Wochen-Statistik, 18:00-Banner

**Files:**
- Modify: `src/pages/MyDay.tsx`

- [ ] **Step 1: Importe erweitern**

In `MyDay.tsx` Importe ergänzen:

```tsx
import {
  getSelfCareCompletionsRange,
  getCompleteDaysInRange,
  nothingDoneToday,
  ...rest (bestehende selfCare-Importe)
} from '../lib/selfCare'
import { getMondayOf } from '../lib/utils'
```

- [ ] **Step 2: State + Berechnungen ergänzen**

States ergänzen:

```tsx
  const [weekDays, setWeekDays] = useState<{ day: string; complete: boolean }[]>([])
```

In `reload` nach `setPickedTasks(...)` ergänzen:

```tsx
    const monday = getMondayOf(new Date())
    const mondayKey = dateKey(monday)
    const dayKeys = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return dateKey(d)
    })
    const { data: rangeComps } = await getSelfCareCompletionsRange(member.id, mondayKey, todayKey)
    setWeekDays(
      getCompleteDaysInRange(
        selection,
        dayKeys,
        (rangeComps as SelfCareCompletionRow[] | null) ?? []
      )
    )
```

Über `const progress = ...` ergänzen:

```tsx
  const nothingDone = nothingDoneToday(completions)
  const completeCount = weekDays.filter((d) => d.complete).length
```

Achtung: `selection` ist in `reload` über `setSelection(...)` gesetzt — für `getCompleteDaysInRange` die frisch ermittelte lokale Variable verwenden. Daher den Block oben **nach** `setSelection(...)` einfügen und `selection` durch die lokale `selRows`-Variable ersetzen:

```tsx
    setWeekDays(
      getCompleteDaysInRange(
        selRows
          .map((r) => itemById.get(r.item_id))
          .filter((i): i is SelfCareItemRow => Boolean(i)),
        dayKeys,
        (rangeComps as SelfCareCompletionRow[] | null) ?? []
      )
    )
```

- [ ] **Step 3: 18:00-Banner + Abend-Rückblick-Sektion im JSX**

Nach dem Header-Block (nach dem Datums-`<p>`) das Banner einfügen:

```tsx
      {hour >= 18 && nothingDone && (
        <div className="rounded-2xl border-2 border-gold bg-wash-gold p-4 shadow-sm">
          <p className="text-[14px] font-bold text-ink">🌇 Heute noch nichts erledigt?</p>
          <p className="text-[12px] font-semibold text-ink-soft">
            Nimm dir 5 Minuten für deine Self-Care-Liste.
          </p>
        </div>
      )}
```

Nach der „Heute-Aufgaben"-`</section>` (aus Task 6) die Abend-Rückblick-Sektion einfügen:

```tsx
      <section className="rounded-2xl bg-wash-plum p-5 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">
          🌙 Abend-Rückblick
        </p>
        <p className="mt-1 text-[14px] font-bold text-ink">
          Heute offen: {progress.total - progress.done} von {progress.total} Self-Care ·{' '}
          {openPicks.length} von {WIP_LIMIT} Aufgaben
        </p>
        <div className="mt-3 flex items-center gap-1">
          {weekDays.map((d) => (
            <span
              key={d.day}
              title={d.day}
              className={`flex h-8 flex-1 items-center justify-center rounded-lg text-[12px] font-black ${
                d.complete ? 'bg-teal text-white' : 'bg-white text-ink-soft'
              }`}
            >
              {d.complete ? '✓' : ''}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[12px] font-semibold text-ink-soft">
          {completeCount} von 7 Tagen komplett — kein Stress, morgen ist auch ein Tag 🌱
        </p>
      </section>
```

- [ ] **Step 4: Typecheck + Lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS, PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/MyDay.tsx
git commit -m "feat: evening review, week statistic and 18:00 banner"
```

---

### Task 8: Navigation & Rollen

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/BottomNav.tsx`
- Modify: `src/pages/Login.tsx`

- [ ] **Step 1: Route + Redirect in App.tsx**

`src/App.tsx`:
- Lazy-Import ergänzen (neben den anderen `lazyPage`-Zeilen):

```tsx
const MyDay = lazyPage(() => import('./pages/MyDay'))
```

- In `AppRoutes()` Destrukturierung erweitern:

```tsx
  const { isAuthenticated, loading, needsSetup, isParent } = useAuth()
```

- Route in den `AppShell`-Kinder-Routen ergänzen (vor `/dashboard`):

```tsx
        <Route path="/meintag" element={<Page><MyDay /></Page>} />
```

- Fallback-Redirect rollenabhängig:

```tsx
      <Route path="*" element={<Navigate to={isParent ? '/meintag' : '/dashboard'} replace />} />
```

- [ ] **Step 2: BottomNav um Rollen-Tab erweitern**

`src/components/layout/BottomNav.tsx` komplett ersetzen:

```tsx
import { NavLink } from 'react-router-dom'
import { Home, ClipboardList, Gift, Trophy, User, Sun } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const childNavItems = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/backlog', icon: ClipboardList, label: 'Aufgaben' },
  { to: '/rewards', icon: Gift, label: 'Belohnungen' },
  { to: '/achievements', icon: Trophy, label: 'Erfolge' },
  { to: '/profile', icon: User, label: 'Profil' },
]

const parentNavItems = [
  { to: '/meintag', icon: Sun, label: 'Mein Tag' },
  { to: '/backlog', icon: ClipboardList, label: 'Aufgaben' },
  { to: '/rewards', icon: Gift, label: 'Belohnungen' },
  { to: '/achievements', icon: Trophy, label: 'Erfolge' },
  { to: '/profile', icon: User, label: 'Profil' },
]

export function BottomNav() {
  const { isParent } = useAuth()
  const navItems = isParent ? parentNavItems : childNavItems

  return (
    <nav className="border-t border-wash-plum bg-white px-3 py-2">
      <div className="mx-auto flex max-w-lg justify-around">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-bold transition ${
                isActive ? 'bg-wash-plum text-coral-deep' : 'text-ink-soft'
              }`
            }
          >
            <item.icon className="h-6 w-6" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Login-Hinweis entfernen**

`src/pages/Login.tsx`: Zeilen 143-145 entfernen:

```tsx
        <p className="text-[13px] font-semibold text-ink-soft">
          Eltern-Login kommt später
        </p>
```

- [ ] **Step 4: Typecheck + Lint + Tests + Build**

Run: `npx tsc --noEmit && npm run lint && npx vitest run && npm run build`
Expected: PASS, PASS, 123 passed, Build OK.

- [ ] **Step 5: Manuell verifizieren** (App läuft, z.B. `npx vite --host`)

- Kind anmelden → BottomNav zeigt „Home", Start `/dashboard`.
- Auf Eltern-Profil wechseln → Start `/meintag`, BottomNav zeigt „Mein Tag" an Position 1.
- „Eltern-Login kommt später" ist weg.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/layout/BottomNav.tsx src/pages/Login.tsx
git commit -m "feat: role-aware navigation — parents start on MyDay"
```

---

### Task 9: 18:00-Erinnerung (Opt-in + lokale Notification)

**Files:**
- Create: `src/hooks/useEveningReminder.ts`
- Modify: `src/pages/MyDay.tsx`

- [ ] **Step 1: Hook anlegen**

`src/hooks/useEveningReminder.ts` (komplett):

```ts
import { useEffect, useRef } from 'react'

const FLAG_PREFIX = 'familyboard:reminderShown:'

function canNotify(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

function todayKey(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function useEveningReminder(enabled: boolean, nothingDoneToday: boolean) {
  const nothingRef = useRef(nothingDoneToday)
  nothingRef.current = nothingDoneToday

  useEffect(() => {
    if (!enabled || !canNotify() || Notification.permission !== 'granted') return
    const key = FLAG_PREFIX + todayKey()
    if (localStorage.getItem(key)) return

    const show = () => {
      localStorage.setItem(key, '1')
      if (nothingRef.current) {
        new Notification('familyboard ✨', {
          body: 'Heute noch nichts erledigt? Schau kurz in deinen Tag!',
        })
      }
    }

    const now = new Date()
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0, 0)
    if (now >= target) {
      show()
      return
    }
    const timer = setTimeout(show, target.getTime() - now.getTime())
    return () => clearTimeout(timer)
  }, [enabled, nothingDoneToday])
}
```

- [ ] **Step 2: Opt-in-Karte + Hook-Nutzung in MyDay**

In `MyDay.tsx`:
- Import ergänzen: `import { useEveningReminder } from '../hooks/useEveningReminder'`
- States ergänzen:

```tsx
  const [notifyAsked, setNotifyAsked] = useState(false)
```

- Nach `const nothingDone = nothingDoneToday(completions)` aufrufen:

```tsx
  useEveningReminder(true, nothingDone)
```

- Opt-in-Handler (vor dem `return`):

```tsx
  const handleAskNotification = () => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
    setNotifyAsked(true)
  }
```

- JSX-Karte nach dem Header-Block (direkt über dem 18:00-Banner aus Task 7) einfügen:

```tsx
      {!notifyAsked && 'Notification' in window && Notification.permission === 'default' && (
        <div className="rounded-2xl border-2 border-wash-sky bg-wash-sky p-4 shadow-sm">
          <p className="text-[14px] font-bold text-ink">🔔 Abends erinnern?</p>
          <p className="mb-3 text-[12px] font-semibold text-ink-soft">
            Wenn bis 18 Uhr nichts erledigt ist, erinnern wir dich sanft.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleAskNotification}
              className="flex-1 rounded-xl bg-coral py-2.5 text-[13px] font-bold text-white transition-transform active:scale-[0.97]"
            >
              Ja, bitte
            </button>
            <button
              onClick={() => setNotifyAsked(true)}
              className="rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold text-ink-soft"
            >
              Nein
            </button>
          </div>
        </div>
      )}
```

- [ ] **Step 3: Typecheck + Lint + Tests**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: PASS, PASS, 123 passed.

- [ ] **Step 4: Manuell verifizieren**

- App als installierte PWA (oder im Browser) öffnen, als Elternteil einloggen, „Mein Tag" besuchen → Opt-in-Karte erscheint (wenn Berechtigung noch nicht erteilt).
- „Ja, bitte" → System fragt nach Berechtigung. Erteilen.
- Erneutes Öffnen → Karte weg.
- Hinweis: Die lokale Notification feuert nur, solange die App/Tab offen ist. Echtes Web-Push (App zu) ist bewusst Phase 2.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useEveningReminder.ts src/pages/MyDay.tsx
git commit -m "feat: 18:00 evening reminder with opt-in and local notification"
```

---

## Abschluss-Check

Nach Task 9 einmal komplett durchlaufen:

Run: `npx tsc --noEmit && npm run lint && npx vitest run && npm run build`
Expected: PASS · PASS · 123 passed · Build OK.

Push: `git push origin main`

## Selbst-Review (Spec-Abdeckung)

- Self-Care-Checkliste + Editor (frei aus 5 Rubriken, eigene Items) → Tasks 4, 5 ✔
- Heute-Aufgaben mit WIP-Limit 3, Pull-Prinzip, priorisierter Picker → Task 6 ✔
- 18:00-Banner + Abend-Rückblick + Wochen-Statistik („X von 7 Tagen komplett") → Task 7 ✔
- Kein PIN, keine Gamification für Eltern → Nicht gebaut (Non-Goal) ✔
- Rollen: Eltern-Start `/meintag`, Kinder `/dashboard`, BottomNav → Task 8 ✔
- 18:00-Push (lokal, App offen) + Opt-in → Task 9 (Web-Push Phase 2, als Non-Goal markiert) ✔
- `completeTaskRow`-Extraktion → Task 2 ✔
- Migration + RLS + Typen → Task 1 ✔
