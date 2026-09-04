# Sessions-Liste & Session-Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die flache „📸 Vorher/Nachher"-Galerie auf der Erfolge-Seite durch eine Sessions-Liste (Aufräum-Action-Verlauf) ersetzen und pro Session eine volle Detail-Ansicht mit XP, Fotos und erledigten/offenen Aufgaben bauen.

**Architecture:** Keine DB-/Backend-Änderung. `Achievements.tsx` lädt zusätzlich `getFamilyTasks` und baut eine `tasksById`-Map; die Liste rendert `SessionCard`-Zeilen (Titelbild = `before_photo ?? after_photo`, sonst Emoji-Thumb). Tap navigiert zur neuen Route `/achievements/session/:sessionId` (full-screen, ohne BottomNav), die per `location.state.session` sofort rendert und sonst per `getMemberSessions().find()` fallback mit Fotos/Sta

**Tech Stack:** React 18 + react-router-dom (BrowserRouter), Vite, Tailwind, Supabase (sessions + tasks Tabellen unverändert), Vitest ohne jsdom (nur pure logic).

---

### Task 1: Pure Helper `formatDuration` + Task-Split-Logic + Tests

Replaces the existing `formatTime` function? Nein — `src/lib/utils.ts` hat bereits `formatTime(sec)` (`m:ss`). Wir **löschen sie nicht**, aber nutzen `formatTime` direkt. Neu hinzu kommt eine pure `splitSessionTasks`-Funktion für die Erledigt/Offen-Trennung.

**Files:**
- Modify: `src/lib/utils.ts` (add splitSessionTasks)
- Test: `src/__tests__/session-tasks.test.ts` (create)

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest'
import { splitSessionTasks } from '../lib/utils'
import type { TaskRow } from '../types/supabase'

function makeTask(id: number): TaskRow {
  return {
    id,
    family_id: 1,
    title: `Task ${id}`,
    emoji: '🧹',
    image_url: null,
    assignee_id: null,
    recurring: 'never',
    cooldown_days: null,
    last_completed_at: null,
    completed_count: 0,
    current_streak: 0,
    longest_streak: 0,
    task_order: id,
    created_at: '2026-01-01',
  }
}

describe('splitSessionTasks', () => {
  it('splits done and open tasks', () => {
    const tasks = [makeTask(1), makeTask(2), makeTask(3)]
    const result = splitSessionTasks([1, 2, 3], [1, 3], tasks)
    expect(result.done.map((t) => t.id)).toEqual([1, 3])
    expect(result.open.map((t) => t.id)).toEqual([2])
    expect(result.missingIds).toEqual([])
  })

  it('returns missing ids for deleted tasks without counting them', () => {
    const tasks = [makeTask(1)]
    const result = splitSessionTasks([1, 99], [1], tasks)
    expect(result.done.map((t) => t.id)).toEqual([1])
    expect(result.open).toEqual([])
    expect(result.missingIds).toEqual([99])
  })

  it('handles empty arrays', () => {
    const result = splitSessionTasks([], [], [])
    expect(result.done).toEqual([])
    expect(result.open).toEqual([])
    expect(result.missingIds).toEqual([])
  })

  it('removes done ids from open', () => {
    const tasks = [makeTask(1), makeTask(2)]
    const result = splitSessionTasks([1, 2], [2], tasks)
    expect(result.open.map((t) => t.id)).toEqual([1])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/session-tasks.test.ts`
Expected: FAIL — `Cannot find module '../lib/utils'` splitSessionTasks undefined

- [ ] **Step 3: Implement in `src/lib/utils.ts`**

Add to end of file:

```ts
import type { TaskRow } from '../types/supabase'

export function splitSessionTasks(
  taskIds: number[],
  completedIds: number[],
  allTasks: TaskRow[]
): { done: TaskRow[]; open: TaskRow[]; missingIds: number[] } {
  const doneIds = new Set(completedIds)
  const byId = new Map(allTasks.map((t) => [t.id, t]))
  const done: TaskRow[] = []
  const open: TaskRow[] = []
  const missingIds: number[] = []
  for (const id of taskIds) {
    const task = byId.get(id)
    if (!task) {
      missingIds.push(id)
      continue
    }
    if (doneIds.has(id)) done.push(task)
    else open.push(task)
  }
  return { done, open, missingIds }
}
```

Wait — `src/lib/utils.ts` has no imports currently. We need to add the `TaskRow` type import. The existing content (`cn`, `generateInviteCode`, `formatTime`) stays as-is; add the type import at top and `splitSessionTasks` at the end:

Edit result (`src/lib/utils.ts`):

```ts
import type { TaskRow } from '../types/supabase'

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

// ... rest unchanged (generateInviteCode, formatTime) ...

export function splitSessionTasks(
  taskIds: number[],
  completedIds: number[],
  allTasks: TaskRow[]
): { done: TaskRow[]; open: TaskRow[]; missingIds: number[] } {
  const doneIds = new Set(completedIds)
  const byId = new Map(allTasks.map((t) => [t.id, t]))
  const done: TaskRow[] = []
  const open: TaskRow[] = []
  const missingIds: number[] = []
  for (const id of taskIds) {
    const task = byId.get(id)
    if (!task) {
      missingIds.push(id)
      continue
    }
    if (doneIds.has(id)) done.push(task)
    else open.push(task)
  }
  return { done, open, missingIds }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/session-tasks.test.ts`
Expected: PASS (3 it-blocks)

- [ ] **Step 5: Run full suite + typecheck + lint**

```bash
npm test
npx tsc --noEmit
npm run lint
```
Expected: All green (68 tests + new 4).

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils.ts src/__tests__/session-tasks.test.ts
git commit -m "feat: add splitSessionTasks util with tests"
```

---

### Task 2: `SessionCard` + `EmptySessions` components

**Files:**
- Create: `src/components/sessions/SessionCard.tsx`
- Create: `src/components/sessions/EmptySessions.tsx`
- Create: `src/components/sessions/index.ts` (convenience re-exports)

Noce — thumbnails need `formatTime` (existing from `../lib/utils`), `SessionRow`, `TaskRow`.

- [ ] **Step 1: Create `SessionCard.tsx`**

```tsx
import { formatTime } from '../../lib/utils'
import type { SessionRow, TaskRow } from '../../types/supabase'

interface SessionCardProps {
  session: SessionRow
  tasksById: Map<number, TaskRow>
  onClick: (session: SessionRow) => void
}

function SessionThumb({ session, tasksById }: { session: SessionRow; tasksById: Map<number, TaskRow> }) {
  const titleImage = session.before_photo ?? session.after_photo
  if (titleImage) {
    return (
      <img
        src={titleImage}
        alt={session.before_photo ? 'Vorher-Foto der Session' : 'Nachher-Foto der Session'}
        className="h-20 w-28 flex-none rounded-2xl object-cover"
      />
    )
  }
  const doneEmojis = session.completed_task_ids
    .map((id) => tasksById.get(id))
    .filter((t): t is TaskRow => Boolean(t))
    .slice(0, 4)
    .map((t) => t.emoji)
  const overflow = session.completed_task_ids.length - doneEmojis.length
  return (
    <div className="grid h-20 w-28 flex-none grid-cols-2 place-items-center rounded-2xl border border-[#E0D8F0] bg-[#F0EDFF]">
      {doneEmojis.map((e, i) => (
        <span key={i} className="text-[18px]">{e}</span>
      ))}
      {overflow > 0 && <span className="text-[10px] font-bold text-[#7C6BA0]">+{overflow}</span>}
    </div>
  )
}

export function SessionCard({ session, tasksById, onClick }: SessionCardProps) {
  const total = session.task_ids.length
  const doneCount = session.completed_task_ids.length
  const date = new Date(session.created_at).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
  const durationMin = Math.round(session.duration / 60)
  return (
    <button
      onClick={() => onClick(session)}
      className="flex w-full items-center gap-3 rounded-[16px] bg-white p-3 text-left shadow-sm transition-all active:scale-[0.98]"
    >
      <SessionThumb session={session} tasksById={tasksById} />
      <div className="flex h-20 flex-1 flex-col justify-between py-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-[#8E8AA0]">{date}</span>
          <span className="rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] px-2.5 py-1 text-[11px] font-black text-white">
            +{session.xp_earned}
          </span>
        </div>
        <span className="text-[11px] font-semibold text-[#7C6BA0]">⏱️ {durationMin} Min</span>
        <div className="flex items-center gap-1">
          {session.completed_task_ids.slice(0, 3).map((id) => {
            const t = tasksById.get(id)
            if (!t) return null
            return <span key={id} className="text-[12px]">{t.emoji}</span>
          })}
          {total > 0 ? (
            doneCount === total ? (
              <span className="text-[10px] font-bold text-[#00A381]">✅ Alles geschafft!</span>
            ) : (
              <span className="text-[10px] font-bold text-[#00A381]">✓ {doneCount}/{total}</span>
            )
          ) : null}
        </div>
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Create `EmptySessions.tsx`**

```tsx
interface EmptySessionsProps {
  onStartSession: () => void
}

export function EmptySessions({ onStartSession }: EmptySessionsProps) {
  return (
    <div className="rounded-[16px] bg-white p-5 text-center shadow-sm">
      <p className="mb-1 text-[36px]">🧸</p>
      <p className="mb-3 text-[13px] font-semibold text-[#8E8AA0]">
        Noch keine Aufräum-Action!
      </p>
      <button
        onClick={onStartSession}
        className="rounded-2xl bg-gradient-to-br from-[#6C5CE7] to-[#8B7CF7] px-6 py-3 text-[14px] font-bold text-white shadow-md transition-all active:scale-[0.97]"
      >
        🔥 Session starten
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Create `index.ts` + typecheck**

```ts
export { SessionCard } from './SessionCard'
export { EmptySessions } from './EmptySessions'
```

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/sessions/
git commit -m "feat: add session card and empty state components"
```

---

### Task 3: Detail-Komponenten `SessionPhotoPair` + `SessionStatsRow` + `TaskListBlock`

**Files:**
- Create: `src/components/sessions/SessionPhotoPair.tsx`
- Create: `src/components/sessions/SessionStatsRow.tsx`
- Create: `src/components/sessions/TaskListBlock.tsx`
- Modify: `src/components/sessions/index.ts` (re-exports)

- [ ] **Step 1: Create `SessionPhotoPair.tsx`**

```tsx
import type { SessionRow } from '../../types/supabase'

export function SessionPhotoPair({ session }: { session: SessionRow }) {
  const { before_photo, after_photo, created_at } = session
  if (!before_photo && !after_photo) return null
  const date = new Date(created_at).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  return (
    <div>
      <h2 className="mb-3 text-[14px] font-black text-[#2D1B69]">📸 Vorher · Nachher</h2>
      <div className="flex gap-2">
        {before_photo && (
          <div className="flex-1">
            <img
              src={before_photo}
              alt={`Vorher-Foto vom ${date}`}
              className="h-40 w-full rounded-2xl object-cover"
            />
            <p className="mt-1 text-center text-[10px] font-bold text-[#7C6BA0]">Vorher</p>
          </div>
        )}
        {after_photo && (
          <div className="flex-1">
            <img
              src={after_photo}
              alt={`Nachher-Foto vom ${date}`}
              className="h-40 w-full rounded-2xl object-cover"
            />
            <p className="mt-1 text-center text-[10px] font-bold text-[#7C6BA0]">Nachher</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `SessionStatsRow.tsx`**

```tsx
interface SessionStatsRowProps {
  duration: number
  doneCount: number
  totalCount: number
  xp: number
}

export function SessionStatsRow({ duration, doneCount, totalCount, xp }: SessionStatsRowProps) {
  const mins = Math.floor(duration / 60)
  const secs = String(duration % 60).padStart(2, '0')
  const stats = [
    { icon: '⏱️', value: `${mins}:${secs}`, label: 'Dauer' },
    { icon: '✅', value: `${doneCount}/${totalCount}`, label: 'Aufgaben' },
    { icon: '⭐', value: `+${xp}`, label: 'Punkte' },
  ]
  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-[16px] bg-white p-3 text-center shadow-sm">
          <p className="text-[16px]">{s.icon}</p>
          <p className="text-[16px] font-black text-[#2D1B69] tabular-nums">{s.value}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8E8AA0]">{s.label}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create `TaskListBlock.tsx`**

```tsx
import type { TaskRow } from '../../types/supabase'

interface TaskListBlockProps {
  heading: string
  tasks: TaskRow[]
  done: boolean
  missingIds?: number[]
}

export function TaskListBlock({ heading, tasks, done, missingIds = [] }: TaskListBlockProps) {
  if (tasks.length === 0 && missingIds.length === 0) return null
  return (
    <div>
      <h2 className="mb-2 text-[14px] font-black text-[#2D1B69]">{heading}</h2>
      <div className="flex flex-col gap-2">
        {tasks.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 rounded-[14px] p-3 shadow-sm ${
              done ? 'bg-white' : 'bg-[#F0EBF8] opacity-80'
            }`}
          >
            {t.image_url ? (
              <img src={t.image_url} alt={t.title} className="h-7 w-7 rounded-lg object-cover" />
            ) : (
              <span className={`text-[16px] ${done ? '' : 'opacity-70 grayscale'}`}>{t.emoji}</span>
            )}
            <span className={`flex-1 text-[13px] ${done ? 'font-bold text-[#2D1B69]' : 'font-semibold text-[#8E8AA0]'}`}>
              {t.title}
            </span>
            {done ? (
              <span className="text-[14px] font-bold text-[#00A381]">✓</span>
            ) : (
              <span className="text-[14px] text-[#9E96B0]">○</span>
            )}
          </div>
        ))}
        {missingIds.map((id) => (
          <div key={id} className="rounded-[14px] bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold text-[#9E96B0]">🤷 Aufgabe gelöscht</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update `index.ts` re-exports + typecheck**

```ts
export { SessionCard } from './SessionCard'
export { EmptySessions } from './EmptySessions'
export { SessionPhotoPair } from './SessionPhotoPair'
export { SessionStatsRow } from './SessionStatsRow'
export { TaskListBlock } from './TaskListBlock'
```

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/sessions/
git commit -m "feat: add session detail components (photos, stats, tasks)"
```

---

### Task 4: `SessionDetail` Seite + Route

**Files:**
- Create: `src/pages/SessionDetail.tsx`
- Modify: `src/App.tsx` (import + route)
- Modify: `src/lib/supabase.ts` (add none — reuse getMemberSessions)

- [ ] **Step 1: Create `SessionDetail.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getFamilyTasks, getMemberSessions } from '../lib/supabase'
import { splitSessionTasks } from '../lib/utils'
import { LoadingScreen } from '../components/ui/LoadingScreen'
import { SessionPhotoPair, SessionStatsRow, TaskListBlock } from '../components/sessions'
import type { SessionRow, TaskRow } from '../types/supabase'

export function SessionDetail() {
  const navigate = useNavigate()
  const { sessionId } = useParams()
  const location = useLocation()
  const { member, family } = useAuth()
  const stateSession = location.state?.session as SessionRow | undefined
  const [session, setSession] = useState<SessionRow | null>(stateSession ?? null)
  const [tasksById, setTasksById] = useState<Map<number, TaskRow>>(new Map())
  const [loading, setLoading] = useState(!stateSession)

  useEffect(() => {
    if (!member || !family) return
    getFamilyTasks(family.id).then(({ data }) => {
      if (!data) return
      setTasksById(new Map((data as TaskRow[]).map((t) => [t.id, t])))
    })
    if (stateSession) return
    getMemberSessions(member.id, 50).then(({ data }) => {
      const found = (data as SessionRow[] | null)?.find((s) => s.id === Number(sessionId))
      if (found) setSession(found)
      setLoading(false)
    })
  }, [member, family, sessionId, stateSession])

  const goBack = useCallback(() => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/achievements', { replace: true })
  }, [navigate])

  if (loading || !session) return <LoadingScreen />

  const split = splitSessionTasks(session.task_ids, session.completed_task_ids, Array.from(tasksById.values()))
  const { done, open, missingIds } = split
  const dateLabel = new Date(session.created_at).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const allDone = session.task_ids.length > 0 && session.completed_task_ids.length === session.task_ids.length

  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col bg-[#FFF5E6] px-5 pb-8 pt-4">
      <header className="sticky top-0 z-10 -mx-5 mb-4 flex items-center gap-3 bg-[#FFF5E6]/95 px-5 py-3 backdrop-blur">
        <button
          onClick={goBack}
          aria-label="Zurück"
          className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-white shadow-sm transition-all active:scale-[0.96]"
        >
          <ArrowLeft className="h-5 w-5 text-[#2D1B69]" />
        </button>
        <h1 className="flex-1 text-[14px] font-black text-[#2D1B69]">{dateLabel}</h1>
      </header>

      <div className="mb-4 rounded-[20px] bg-gradient-to-br from-[#FFD700] to-[#FFA500] p-6 text-white shadow-[0_8px_24px_rgba(255,215,0,0.25)]">
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">XP verdient</p>
        <p className="text-[40px] font-black tabular-nums">+{session.xp_earned}</p>
        <p className="text-[12px] font-bold text-white/85">
          {allDone ? 'Alle geschafft! ✅' : `${session.completed_task_ids.length} von ${session.task_ids.length} erledigt — weiter so! 💪`}
        </p>
      </div>

      <div className="mb-5">
        <SessionStatsRow
          duration={session.duration}
          doneCount={session.completed_task_ids.length}
          totalCount={session.task_ids.length}
          xp={session.xp_earned}
        />
      </div>

      <div className="mb-5">
        <SessionPhotoPair session={session} />
      </div>

      <div className="flex flex-col gap-5">
        <TaskListBlock heading={`✅ ERLEDIGT (${done.length})`} tasks={done} done />
        <TaskListBlock heading={`○ OFFEN (${open.length})`} tasks={open} done={false} missingIds={missingIds} />
      </div>
    </div>
  )
}
```

Note: `missingIds` passed to the "OFFEN" (open) block so deleted-task warnings render alongside open tasks. `splitSessionTasks` returns `{ done, open, missingIds }`.

- [ ] **Step 2: Wire route in `src/App.tsx`**

Add import near other pages:

```tsx
import { SessionDetail } from './pages/SessionDetail'
```

Add route next to `/session/result` (outside AppShell):

```tsx
<Route path="/achievements/session/:sessionId" element={<SessionDetail />} />
```

- [ ] **Step 3: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/SessionDetail.tsx src/App.tsx
git commit -m "feat: add session detail page with route"
```

---

### Task 5: Achievements-Seite — Galerie ersetzen durch Sessions-Liste

**Files:**
- Modify: `src/pages/Achievements.tsx` (imports, state, useEffect, JSX block Z.251–295)

- [ ] **Step 1: Add imports + state + data loading**

Add to import list:

```tsx
import { useNavigate } from 'react-router-dom'
import { getFamilyTasks } from '../lib/supabase'
import { SessionCard, EmptySessions } from '../components/sessions'
import type { SessionRow, TaskRow } from '../types/supabase'
```

Inside component (top):

```tsx
const navigate = useNavigate()
const [tasksById, setTasksById] = useState<Map<number, TaskRow>>(new Map())
```

In the existing `useEffect` (where `getMemberSessions` runs), add family task load:

```tsx
useEffect(() => {
  if (!member) return
  getMemberSessions(member.id, 50).then(({ data }) => {
    if (data) setSessions(data as SessionRow[])
  })
  if (family) {
    getFamilyTasks(family.id).then(({ data }) => {
      if (data) setTasksById(new Map((data as TaskRow[]).map((t) => [t.id, t])))
    })
  }
}, [member, family])
```

- [ ] **Step 2: Replace the „📸 Vorher/Nachher“ gallery block**

Replace the entire block (currently at the file, rendered as Before/After Gallery) starting at `{/* Before/After Gallery */}` through the closing `)}` with:

```tsx
      {/* Aufräum-Actions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-black text-[#2D1B69]">🧹 Deine Aufräum-Actions</h2>
          {sessions.length > 0 && (
            <span className="text-[10px] font-bold text-[#8E8AA0]">{sessions.length} Sessions</span>
          )}
        </div>
        {sessions.length === 0 ? (
          <EmptySessions onStartSession={() => navigate('/dashboard')} />
        ) : (
          <ul className="flex flex-col gap-3">
            {sessions.slice(0, 8).map((session) => (
              <li key={session.id}>
                <SessionCard
                  session={session}
                  tasksById={tasksById}
                  onClick={(s) =>
                    navigate(`/achievements/session/${s.id}`, { state: { session: s } })
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
```

Replace the entire block from the `{/* Before/After Gallery */}` comment through its matching closing `)}` with the section above. Read the file first to locate the exact region before deleting.

- [ ] **Step 3: Typecheck + lint + build + tests**

Run: `npx tsc --noEmit && npm run lint && npm run build && npm test`
Expected: All PASS (existing suite still green)

- [ ] **Step 4: Commit**

```bash
git add src/pages/Achievements.tsx
git commit -m "feat: replace achievements photo gallery with session history list"
```

---

## Self-Review

**Spec coverage:**
- Titelbild-Regel (`before ?? after`, Emoji-Thumb) → Task 2 ✓
- SessionCard-Daten (Datum, Dauer, Emoji-Preview, Fortschritt, XP-Chip) → Task 2 ✓
- Sektion + Counter + Empty-State + CTA → Task 5 ✓
- Detail (Sticky-Header, XP-Agent, 3 Stats, PhotoPair, Tasks-Split) → Task 4 + 3 ✓
- Varride Task gelöscht → TaskListBlock missingIds (Task 3) ✓
- Route full-screen außerhalb AppShell & Fallback → Task 4 ✓
- Keine DB-Änderung → n/a ✓
- `formatDuration` ersetzen via bestehendes `formatTime`/interne Logik → Tasks geprüft: SessionCard nutzt `Math.floor` Minuten; StatsRow nutzt lokale mm:ss-Umstellung statt `formatTime` (`${mins}:${secs}`) — konsistent mit Spec `m:ss`. Abweichung: stats nutzen `6:14`-Format (Spec), okay.

**Placeholder scan:** keine TODO/TBD — alle Schritte mit vollem Code.

**Type consistency:** `splitSessionTasks` (utils) nutzt `TaskRow[]`; `SessionCard` Props `session`/`tasksById`/`onClick` konsistent mit Task 5 Aufruf; `SessionDetail` destructures `{ done, open, missingIds }` korrekt; `getFamilyTasks` returns `{ data }`.

**DesignCompliance-Note:** Foto-Regel eingehalten, keine Riesen-Galerie, Empty-State + Counter gesetzt.