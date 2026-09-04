# Kid-Usability Flow Fixes — Implementierungsplan

> **Für agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Ziel:** Vier kleine Kindergerecht-Fixes: Identität auf Login, Kamera-Startphase, Backlog-Langdruck für Bearbeiten/Löschen, Frei-Hinweis.

**Architektur:** Reine Logik in getestete Helper auslagern (`lib/identityCache.ts`, `lib/longPress.ts`), UI-Dünnschicht in die bestehenden Komponenten (Login, CameraCapture, Backlog, SessionSelect). Kein Auth-Umbau, keine DB-Änderung, keine neuen Dependencies.

**Tech Stack:** React 19 + TS + Tailwind/daisyUI, Vitest (node-Env, `globals: true`), oxlint.

**Spec:** `docs/superpowers/specs/2026-08-09-kid-usability-flow-fixes-design.md`

---

### Task 1: Identity-Cache-Helper (TDD)

**Files:**
- Create: `src/lib/identityCache.ts`
- Test: `src/__tests__/identity-cache.test.ts`

- [ ] **Step 1: Failing Test schreiben**

`src/__tests__/identity-cache.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadLastMember, saveLastMember, clearLastMember } from '../lib/identityCache'

const store = new Map<string, string>()

beforeEach(() => {
  store.clear()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  })
})

describe('identityCache', () => {
  it('returns null when nothing cached', () => {
    expect(loadLastMember()).toBeNull()
  })

  it('saves and loads name, color, initial and family name', () => {
    saveLastMember({ name: 'Emil', color: '#00A381', familyName: 'Muster' })
    expect(loadLastMember()).toEqual({
      name: 'Emil',
      color: '#00A381',
      initial: 'E',
      familyName: 'Muster',
    })
  })

  it('falls back to default color when missing', () => {
    saveLastMember({ name: 'Lena' })
    expect(loadLastMember()?.color).toBe('#6C5CE7')
  })

  it('ignores corrupt JSON', () => {
    store.set('familyboard:lastMember', '{oops')
    expect(loadLastMember()).toBeNull()
  })

  it('clears the cache', () => {
    saveLastMember({ name: 'Emil' })
    clearLastMember()
    expect(loadLastMember()).toBeNull()
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehler bestätigen**

Run: `npx vitest run src/__tests__/identity-cache.test.ts`
Expected: FAIL — Modul `../lib/identityCache` nicht gefunden.

- [ ] **Step 3: Helper implementieren**

`src/lib/identityCache.ts`:

```ts
export interface LastMemberCache {
  name: string
  color: string
  initial: string
  familyName: string
}

const KEY = 'familyboard:lastMember'

export function loadLastMember(): LastMemberCache | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const p = parsed as { name?: unknown }
    if (typeof p.name !== 'string' || !p.name) return null
    return parsed as LastMemberCache
  } catch {
    return null
  }
}

export function saveLastMember(member: { name: string; color?: string | null; familyName?: string | null }): void {
  const cache: LastMemberCache = {
    name: member.name,
    color: member.color || '#6C5CE7',
    initial: member.name[0]?.toUpperCase() || '🥷',
    familyName: member.familyName || '',
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    // localStorage nicht verfügbar (z.B. private mode)
  }
}

export function clearLastMember(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignorieren
  }
}
```

- [ ] **Step 4: Test laufen lassen, grün bestätigen**

Run: `npx vitest run src/__tests__/identity-cache.test.ts`
Expected: 6 Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/identityCache.ts src/__tests__/identity-cache.test.ts
git commit -m "feat: add lastMember identity cache with tests"
```

---

### Task 2: Identität auf dem Login-Bildschirm

**Files:**
- Modify: `src/store/authStore.ts` (init: Cache speichern)
- Modify: `src/pages/Login.tsx` (Avatar + Name anzeigen)

- [ ] **Step 1: Cache in authStore.init setzen**

In `src/store/authStore.ts`, im `init()`-Listener nach `set({ member: m, family: m.families, needsSetup: false })` (Zeile 37) einfügen:

```ts
import { saveLastMember } from '../lib/identityCache'
// ...
if (member) {
  const m = member as MemberRow & { families: FamilyRow }
  set({ member: m, family: m.families, needsSetup: false })
  saveLastMember({ name: m.name, color: m.color, familyName: m.families.name })
}
```

- [ ] **Step 2: Login.tsx zeigt gecachtes Kind**

In `src/pages/Login.tsx`: Import ergänzen und Avatar-Block austauschen (Zeilen 29–37):

```tsx
import { loadLastMember } from '../lib/identityCache'

export function Login() {
  const { signInAsChild } = useAuth()
  const [starting, setStarting] = useState(false)
  const last = loadLastMember()
  // ...
  <div className="mx-auto mb-4 flex h-26 w-26 items-center justify-center rounded-[52px] shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
    {last ? (
      <span
        className="flex h-26 w-26 items-center justify-center rounded-[52px] text-[48px] text-white"
        style={{ backgroundColor: last.color }}
      >
        {last.initial}
      </span>
    ) : (
      <span className="bg-gradient-to-br from-[#6C5CE7] to-[#7968CA] text-[56px]">🥷</span>
    )}
  </div>
  <h1 className="text-[28px] font-black tracking-tight text-[#2D1B69]">
    {last ? `Hallo ${last.name}!` : 'FamilyBoard'}
  </h1>
  <p className="mb-8 text-[14px] font-semibold text-[#7C6BA0]">
    {last ? (last.familyName || 'Dein Ninja-Team') : 'Dein Ninja-Team'}
  </p>
```

Hinweis: `loadLastMember()` bei jedem Render ausführen (Login ist schlicht, kein Re-Render-Risiko).

- [ ] **Step 3: Build-Verifikation**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 Fehler / 0 Warnungen.

- [ ] **Step 4: Commit**

```bash
git add src/store/authStore.ts src/pages/Login.tsx
git commit -m "feat: show last active child identity on login screen"
```

---

### Task 3: Kamera-Startphase (CameraCapture)

**Files:**
- Modify: `src/components/CameraCapture.tsx`

- [ ] **Step 1: Zustand + Start per Tap**

`src/components/CameraCapture.tsx` umbauen:

```tsx
export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [started, setStarted] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const handleStart = async () => {
    if (starting) return
    setStarting(true)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Kamera nicht verfügbar')
        return
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = mediaStream
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setStarted(true)
    } catch {
      setError('Kamera nicht verfügbar')
    } finally {
      setStarting(false)
    }
  }
```

Den bisherigen `startCamera`-`useEffect` (Zeilen 16–38) entfernen.

- [ ] **Step 2: Start-Phase rendern (vor Fehler-Check, vor Kamera-UI)**

In `src/components/CameraCapture.tsx` nach `if (error) {...}`-Block und vor dem Kamera-Return einfügen:

```tsx
  if (!started) {
    return (
      <div role="dialog" aria-modal="true" aria-labelledby="camera-start-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="mx-6 w-full max-w-sm rounded-[24px] bg-white p-8 text-center">
          <p className="mb-4 text-[48px]">📸</p>
          <h2 id="camera-start-title" className="mb-2 text-[20px] font-black text-[#2D1B69]">
            Foto aufnehmen
          </h2>
          <p className="mb-6 text-[14px] font-semibold text-[#72618F]">
            Wir brauchen die Kamera für dein Vorher-Foto.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleStart}
              disabled={starting}
              className="rounded-2xl bg-gradient-to-br from-[#6C5CE7] to-[#7968CA] py-3 text-[14px] font-bold text-white shadow-md transition-all active:scale-[0.97] disabled:opacity-40"
            >
              {starting ? 'Starte…' : 'Kamera starten'}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#F0EBF8] py-3 text-[14px] font-bold text-[#72618F]"
            >
              <ImageIcon className="h-4 w-4" />
              Aus Galerie wählen
            </button>
          </div>
        </div>
      </div>
    )
  }
```

- [ ] **Step 3: Build-Verifikation**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 Fehler / 0 Warnungen.

- [ ] **Step 4: Commit**

```bash
git add src/components/CameraCapture.tsx
git commit -m "feat: camera asks for start before requesting permission"
```

---

### Task 4: LongPress-Helper (TDD)

**Files:**
- Create: `src/lib/longPress.ts`
- Test: `src/__tests__/long-press.test.ts`

- [ ] **Step 1: Failing Test schreiben**

`src/__tests__/long-press.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLongPress } from '../lib/longPress'

describe('createLongPress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('triggers after the delay', () => {
    const onTrigger = vi.fn()
    const lp = createLongPress(onTrigger)
    lp.start(0, 0)
    expect(onTrigger).not.toHaveBeenCalled()
    vi.advanceTimersByTime(500)
    expect(onTrigger).toHaveBeenCalledTimes(1)
  })

  it('does not trigger when cancelled before the delay', () => {
    const onTrigger = vi.fn()
    const lp = createLongPress(onTrigger)
    lp.start(0, 0)
    lp.cancel()
    vi.advanceTimersByTime(1000)
    expect(onTrigger).not.toHaveBeenCalled()
  })

  it('cancels when moving beyond maxMovement', () => {
    const onTrigger = vi.fn()
    const lp = createLongPress(onTrigger, { maxMovement: 8 })
    lp.start(0, 0)
    lp.move(0, 20)
    vi.advanceTimersByTime(1000)
    expect(onTrigger).not.toHaveBeenCalled()
  })

  it('allows small movement without cancelling', () => {
    const onTrigger = vi.fn()
    const lp = createLongPress(onTrigger, { maxMovement: 8 })
    lp.start(0, 0)
    lp.move(0, 3)
    vi.advanceTimersByTime(500)
    expect(onTrigger).toHaveBeenCalledTimes(1)
  })

  it('supports repeated start/trigger cycles', () => {
    const onTrigger = vi.fn()
    const lp = createLongPress(onTrigger)
    lp.start(0, 0)
    vi.advanceTimersByTime(500)
    lp.start(0, 0)
    vi.advanceTimersByTime(500)
    expect(onTrigger).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Test laufen lassen, Fehler bestätigen**

Run: `npx vitest run src/__tests__/long-press.test.ts`
Expected: FAIL — Modul `../lib/longPress` nicht gefunden.

- [ ] **Step 3: Helper implementieren**

`src/lib/longPress.ts`:

```ts
export interface LongPress {
  start: (x: number, y: number) => void
  move: (x: number, y: number) => void
  cancel: () => void
}

export function createLongPress(
  onTrigger: () => void,
  options: { delay?: number; maxMovement?: number } = {}
): LongPress {
  const { delay = 500, maxMovement = 8 } = options
  let timer: ReturnType<typeof setTimeout> | null = null
  let startX = 0
  let startY = 0
  let active = false
  let triggered = false

  const clear = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    active = false
    triggered = false
  }

  return {
    start(x, y) {
      clear()
      active = true
      startX = x
      startY = y
      timer = setTimeout(() => {
        if (active) {
          triggered = true
          onTrigger()
        }
      }, delay)
    },
    move(x, y) {
      if (!active || triggered) return
      const dx = x - startX
      const dy = y - startY
      if (Math.hypot(dx, dy) > maxMovement) clear()
    },
    cancel() {
      clear()
    },
  }
}
```

- [ ] **Step 4: Test laufen lassen, grün bestätigen**

Run: `npx vitest run src/__tests__/long-press.test.ts`
Expected: 5 Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/longPress.ts src/__tests__/long-press.test.ts
git commit -m "feat: add long-press helper with tests"
```

---

### Task 5: Backlog — Langdruck öffnet Bearbeiten/Löschen

**Files:**
- Modify: `src/pages/Backlog.tsx` (SortableTask + Aktion-Sheet)

- [ ] **Step 1: SortableTask umbauen (Buttons raus, Langdruck rein)**

In `src/pages/Backlog.tsx`:
- Import ergänzen: `useMemo` von react, `createLongPress` aus `../lib/longPress`.
- In `SortableTask` den Pencil-Button (Zeilen 199–205) und den X-Button (Zeilen 207–213) **entfernen**.
- Zustand + Langdruck ergänzen:

```tsx
const [showActions, setShowActions] = useState(false)
const [confirmDelete, setConfirmDelete] = useState(false)
const longPress = useMemo(() => createLongPress(() => setShowActions(true)), [])
```

- Card-Container (Zeilen 183–189) um Pointer-Handler erweitern:

```tsx
<div
  ref={setNodeRef}
  style={style}
  onPointerDown={(e) => longPress.start(e.clientX, e.clientY)}
  onPointerMove={(e) => longPress.move(e.clientX, e.clientY)}
  onPointerUp={longPress.cancel}
  onPointerLeave={longPress.cancel}
  className={`relative overflow-hidden rounded-[18px] bg-white shadow-sm ${
    isDragging ? 'ring-2 ring-[#6C5CE7]' : ''
  }`}
>
```

- Aktion-Sheet nach dem Card-`</div>` (vor dem schließenden `)` der Funktion) einfügen:

```tsx
{showActions && (
  <div role="dialog" aria-modal="true" aria-labelledby="task-actions-title" className="fixed inset-0 z-50 flex items-end bg-black/30 pb-6">
    <div className="w-full max-w-[420px] rounded-3xl bg-[#FFF5E6] px-6 py-6">
      <h2 id="task-actions-title" className="mb-4 text-center text-[18px] font-black text-[#2D1B69]">
        Aufgabe
      </h2>
      {confirmDelete ? (
        <>
          <p className="mb-6 text-center text-[16px] font-bold text-[#2D1B69]">
            Wirklich löschen?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 rounded-2xl bg-white py-4 font-bold text-[#72618F]"
            >
              Abbrechen
            </button>
            <button
              onClick={() => {
                onDelete(task.id)
                setConfirmDelete(false)
                setShowActions(false)
              }}
              className="flex-1 rounded-2xl bg-[#C43933] py-4 font-bold text-white"
            >
              Ja, löschen
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              onEdit(task)
              setShowActions(false)
            }}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#6C5CE7] py-4 font-bold text-white"
          >
            <Pencil className="h-4 w-4" />
            Bearbeiten
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-white py-4 font-bold text-[#C43933]"
          >
            <X className="h-4 w-4" strokeWidth={3} />
            Löschen
          </button>
          <button
            onClick={() => setShowActions(false)}
            className="rounded-2xl bg-[#F0EBF8] py-4 font-bold text-[#72618F]"
          >
            Abbrechen
          </button>
        </div>
      )}
    </div>
  </div>
)}
```

Hinweis: `Pencil` und `X` werden dadurch weiterhin in `Backlog.tsx` genutzt (Header/Edit-Dialog), keine toten Importe.

- [ ] **Step 2: Build-Verifikation**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 Fehler / 0 Warnungen.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Backlog.tsx
git commit -m "feat: gate task edit/delete behind long-press action sheet"
```

---

### Task 6: „Frei"-Hinweis (SessionSelect)

**Files:**
- Modify: `src/pages/SessionSelect.tsx`

- [ ] **Step 1: Hinweis unter der Modus-Toggle-Gruppe einfügen**

In `src/pages/SessionSelect.tsx` direkt nach dem `<div className="flex gap-2">`-Block der beiden Modus-Buttons (nach Zeile 97) einfügen:

```tsx
{mode === 'free' && (
  <p className="mt-2 text-center text-[11px] font-semibold text-[#72618F]">
    So lange du magst – ohne Timer
  </p>
)}
```

- [ ] **Step 2: Build-Verifikation**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 Fehler / 0 Warnungen.

- [ ] **Step 3: Commit**

```bash
git add src/pages/SessionSelect.tsx
git commit -m "feat: show hint for free session mode"
```

---

### Task 7: Finale Verifikation

- [ ] **Step 1: Kompletter Test- und Build-Lauf**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: 88+ Tests PASS (82 bestehende + 6 identity + 5 long-press — exakt: 82+6+5=93), tsc/lint/build grün.

- [ ] **Step 2: Manuelle Checks (Hinweis an Nutzer)**

- Login nach Abmelden zeigt „Hallo {Name}!" mit Avatar-Farbe.
- Kamera: Overlay fragt erst nach „Kamera starten", Permission erscheint danach; Galerie-Fallback bei Ablehnung.
- Backlog: Langdruck auf Aufgabe öffnet Sheet; Bearbeiten/Löschen (mit Bestätigung) funktionieren; Drag-Handle sortiert weiterhin.
- SessionSelect: „Frei" zeigt den Hinweis, Timer-Modus nicht.

- [ ] **Step 3: Push**

```bash
git push origin main
```
