# Phase E — Bildschirmzeit-Einlösung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kids redeem XP for screen-time minutes with a one-tap button on the Profile page; balance grows additively, XP is never deducted.

**Architecture:** Pure logic lives in `src/lib/gamification.ts` (unit-tested), the UI lives in `src/pages/Profile.tsx` (new "Bildschirmzeit" card + confirm dialog), persistence via the existing `updateMember` helper (`src/lib/supabase.ts:33`). A new `members.xp_redeemed` column (migration 004) prevents double-counting: on redeem, `screen_time_balance += (xp - xp_redeemed)` and `xp_redeemed = xp`.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind, Zustand, Supabase, lucide-react, vitest. Commands: `npm run test` (vitest), `npm run build` (tsc + vite build), `npm run lint` (oxlint).

**Design spec:** `docs/superpowers/specs/2026-08-04-phase-e-screen-time-redeem-design.md`

---

### Task 1: Migration `xp_redeemed` column

**Files:**
- Create: `migrations/004_add_xp_redeemed.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Migration 004: Add xp_redeemed column to prevent screen-time double-counting
-- Run this in Supabase SQL Editor

ALTER TABLE members ADD COLUMN IF NOT EXISTS xp_redeemed integer not null default 0;
```

- [ ] **Step 2: Verify file**

Run: `ls migrations/`
Expected: `004_add_xp_redeemed.sql` listed alongside 003.

- [ ] **Step 3: Commit**

```bash
git add migrations/004_add_xp_redeemed.sql
git commit -m "feat: add xp_redeemed column migration for screen-time redemption"
```

Note: this migration must also be run manually in the Supabase SQL Editor before the redeem feature works against the live DB (same as migration 003).

---

### Task 2: Pure logic `calculateScreenTimeRedeem` (TDD)

**Files:**
- Create: `src/__tests__/screen-time-redeem.test.ts`
- Modify: `src/lib/gamification.ts` (append at end of file)

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { calculateScreenTimeRedeem } from '../lib/gamification'

describe('calculateScreenTimeRedeem', () => {
  it('returns no minutes when xp is 0', () => {
    expect(calculateScreenTimeRedeem(0, 0, 0)).toEqual({ minutes: 0, newRedeemed: 0, newBalance: 0 })
  })

  it('converts all XP when nothing was redeemed yet', () => {
    expect(calculateScreenTimeRedeem(35, 0, 10)).toEqual({ minutes: 35, newRedeemed: 35, newBalance: 45 })
  })

  it('returns no minutes when everything was already redeemed', () => {
    expect(calculateScreenTimeRedeem(35, 35, 20)).toEqual({ minutes: 0, newRedeemed: 35, newBalance: 20 })
  })

  it('only converts XP earned since the last redemption', () => {
    expect(calculateScreenTimeRedeem(50, 35, 5)).toEqual({ minutes: 15, newRedeemed: 50, newBalance: 20 })
  })

  it('never goes negative when xpRedeemed exceeds xp (defensive)', () => {
    expect(calculateScreenTimeRedeem(35, 40, 0)).toEqual({ minutes: 0, newRedeemed: 40, newBalance: 0 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/screen-time-redeem.test.ts`
Expected: FAIL — `calculateScreenTimeRedeem is not a function` / undefined export.

- [ ] **Step 3: Implement the function**

Append to `src/lib/gamification.ts`:

```ts
export function calculateScreenTimeRedeem(
  xp: number,
  xpRedeemed: number,
  balance: number
): { minutes: number; newRedeemed: number; newBalance: number } {
  const redeemable = Math.max(0, xp - xpRedeemed)
  if (redeemable <= 0) {
    return { minutes: 0, newRedeemed: xpRedeemed, newBalance: balance }
  }
  return { minutes: redeemable, newRedeemed: xp, newBalance: balance + redeemable }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/screen-time-redeem.test.ts`
Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gamification.ts src/__tests__/screen-time-redeem.test.ts
git commit -m "feat: add calculateScreenTimeRedeem pure logic with tests"
```

---

### Task 3: Type update

**Files:**
- Modify: `src/types/supabase.ts:34`

- [ ] **Step 1: Add `xp_redeemed` to `MemberRow`**

Change:

```ts
  screen_time_balance: number
  streak_saves_used: number
```

to:

```ts
  screen_time_balance: number
  xp_redeemed: number
  streak_saves_used: number
```

Note: `MemberInsert` is intentionally NOT extended — existing convention omits all defaulted columns (xp, level, streak, screen_time_balance are already absent), and `xp_redeemed` has a DB default of 0.

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/supabase.ts
git commit -m "feat: add xp_redeemed to MemberRow type"
```

---

### Task 4: Profile UI — Bildschirmzeit card

**Files:**
- Modify: `src/pages/Profile.tsx`

- [ ] **Step 1: Update imports**

Change:

```tsx
import { useAuth } from '../hooks/useAuth'
import { getLevelFromXp } from '../lib/gamification'
import { LogOut, Trophy, Flame, Star, Calendar } from 'lucide-react'

export function Profile() {
  const { member, family, signOut } = useAuth()
  const levelInfo = getLevelFromXp(member?.xp || 0)
```

to:

```tsx
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getLevelFromXp, calculateScreenTimeRedeem } from '../lib/gamification'
import { updateMember } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { LogOut, Trophy, Flame, Star, Calendar, Clock } from 'lucide-react'

export function Profile() {
  const { member, family, signOut } = useAuth()
  const levelInfo = getLevelFromXp(member?.xp || 0)
  const [showRedeemDialog, setShowRedeemDialog] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const redeemable = Math.max(0, (member?.xp || 0) - (member?.xp_redeemed || 0))

  const handleRedeem = async () => {
    if (!member || redeemable <= 0) return
    setRedeeming(true)
    try {
      const { minutes, newRedeemed, newBalance } = calculateScreenTimeRedeem(
        member.xp,
        member.xp_redeemed,
        member.screen_time_balance
      )
      const { data: updated } = await updateMember(member.id, {
        xp_redeemed: newRedeemed,
        screen_time_balance: newBalance,
      })
      if (updated) {
        useAuthStore.getState().setMember(updated as any)
      }
      setShowRedeemDialog(false)
      setSuccessMessage(`✓ ${minutes} Minuten eingelöst!`)
      window.setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Failed to redeem screen time:', error)
      setShowRedeemDialog(false)
      setSuccessMessage('Ups, das hat nicht geklappt. Versuch es nochmal!')
    } finally {
      setRedeeming(false)
    }
  }
```

- [ ] **Step 2: Add the Bildschirmzeit card**

Insert between the closing `</div>` of the stats grid (currently ends line 67, right after the Bester Streak card) and the `{/* Role */}` section:

```tsx
      {/* Bildschirmzeit */}
      <div className="rounded-[16px] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#E0FFE0]">
            <Clock className="h-5 w-5 text-[#00A381]" />
          </div>
          <div>
            <p className="text-[18px] font-black text-[#2D1B69]">
              {member?.screen_time_balance || 0} Minuten
            </p>
            <p className="text-[10px] font-bold text-[#8E8AA0]">Bildschirmzeit</p>
          </div>
        </div>
        <p className="mb-3 text-[12px] font-semibold text-[#7C6BA0]">
          {redeemable > 0
            ? `Einlösbar: ${redeemable} Min`
            : 'Alles eingelöst — erst fleißig sein, dann einlösen!'}
        </p>
        {successMessage && (
          <p className="mb-3 rounded-2xl bg-[#E0FFE0] px-3 py-2 text-center text-[13px] font-bold text-[#00A381]">
            {successMessage}
          </p>
        )}
        <button
          onClick={() => setShowRedeemDialog(true)}
          disabled={redeemable <= 0}
          className={`w-full rounded-2xl bg-gradient-to-br from-[#00A381] to-[#2BBFA0] py-4 text-[14px] font-bold text-white shadow-md transition-all active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100 ${
            redeemable > 0 ? 'animate-pulse' : ''
          }`}
        >
          Jetzt einlösen
        </button>
      </div>
```

- [ ] **Step 3: Add the confirm dialog**

Insert right before the final closing `</div>` of the component (after the Sign Out button):

```tsx
      {/* Einlösen-Dialog */}
      {showRedeemDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-6 w-full max-w-sm rounded-[24px] bg-white p-8 text-center shadow-2xl">
            <div className="mb-4 text-[48px]">📺</div>
            <h2 className="mb-2 text-[20px] font-black text-[#2D1B69]">
              Bildschirmzeit einlösen?
            </h2>
            <p className="mb-6 text-[14px] text-[#7C6BA0]">
              Du bekommst{' '}
              <span className="font-black text-[#00A381]">{redeemable} Minuten</span> extra.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleRedeem}
                disabled={redeeming}
                className="rounded-2xl bg-gradient-to-br from-[#00A381] to-[#2BBFA0] py-3 text-[14px] font-bold text-white shadow-md transition-all active:scale-[0.97] disabled:opacity-40"
              >
                {redeeming ? 'Läuft…' : 'Ja, einlösen!'}
              </button>
              <button
                onClick={() => setShowRedeemDialog(false)}
                disabled={redeeming}
                className="rounded-2xl bg-[#F0EBF8] py-3 text-[14px] font-bold text-[#7C6BA0] transition-all active:scale-[0.97]"
              >
                Später
              </button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 4: Build to verify**

Run: `npm run build`
Expected: `tsc -b` passes, vite build completes without errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Profile.tsx
git commit -m "feat: add screen-time redemption card and dialog to Profile"
```

---

### Task 5: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: 49 tests pass (44 existing + 5 new screen-time tests).

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: 0 warnings, 0 errors.

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: tsc + vite build succeed.

- [ ] **Step 4: Manual check (optional, dev server)**

Run: `npm run dev`, open Profile page, confirm:
- Balance card shows `0 Minuten`, button disabled with hint text
- After earning XP (or temporarily setting `xp` higher in DB), button pulses; tapping shows dialog; confirm adds minutes and shows success message; button then disabled again

---

## Out of Scope (from design spec)

- Consumption tracking (parents enforce real-world time)
- Configurable rates / rewards table
- Parents area
- Game-based reward system (much later)
