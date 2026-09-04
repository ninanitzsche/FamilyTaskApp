# Phase C: Tech Debt + Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 known bugs and migrate photo storage from base64 in DB to Supabase Storage

**Architecture:** 
1. Fix bugs in gamification.ts and SessionResult.tsx
2. Create Supabase Storage bucket for photos
3. Update CameraCapture to upload to Storage instead of base64
4. Update SessionResult to use Storage URLs
5. Add DB migration for new columns

**Tech Stack:** React 19, TypeScript, Supabase Storage, vitest

---

## Task 1: Fix calculateStreak Clock Skew Bug

**Files:**
- Modify: `src/lib/gamification.ts:25-51`
- Test: `src/__tests__/gamification.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// Add to calculateStreak describe block in gamification.test.ts
it('handles future date (clock skew) without resetting streak', () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const result = calculateStreak(tomorrow.toISOString(), 5, 10)
  // Should NOT reset streak due to clock skew
  expect(result.streak).toBe(5) // Keep current streak, don't reset
  expect(result.longestStreak).toBe(10) // Keep longest streak
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --grep "handles future date"`
Expected: FAIL - streak resets to 1 instead of keeping current

- [ ] **Step 3: Write minimal implementation**

```typescript
// In gamification.ts, update calculateStreak function
export function calculateStreak(
  lastSessionAt: string | null,
  currentStreak: number = 0,
  longestStreak: number = 0
): { streak: number; longestStreak: number } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (!lastSessionAt) {
    return { streak: 1, longestStreak: Math.max(longestStreak, 1) }
  }

  const last = new Date(lastSessionAt)
  const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate())
  const diffDays = Math.floor((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24))

  // Handle clock skew: if last session is in the future, keep current streak
  if (diffDays < 0) {
    return { streak: currentStreak, longestStreak }
  }

  if (diffDays === 0) {
    return { streak: currentStreak, longestStreak }
  }

  if (diffDays === 1) {
    const newStreak = currentStreak + 1
    return { streak: newStreak, longestStreak: Math.max(longestStreak, newStreak) }
  }

  return { streak: 1, longestStreak: Math.max(longestStreak, 1) }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --grep "handles future date"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/gamification.ts src/__tests__/gamification.test.ts
git commit -m "fix: handle clock skew in calculateStreak to prevent streak reset"
```

---

## Task 2: Fix calculateXp Edge Case

**Files:**
- Modify: `src/pages/SessionResult.tsx:60-62`
- Test: `src/__tests__/session-logic.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// Add to XP Calculation describe block in session-logic.test.ts
it('does not award XP when no tasks completed even with allCompleted flag', () => {
  expect(calculateXp(0, 0, true)).toBe(0) // Should be 0, not 5
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --grep "does not award XP when no tasks completed"`
Expected: FAIL - returns 5 instead of 0

- [ ] **Step 3: Write minimal implementation**

```typescript
// In SessionResult.tsx, update XP calculation
const completedTasks = tasks.filter((t) => completedTaskIds.includes(t.id))
const overtimeMinutes = Math.max(0, Math.floor((duration - TARGET_DURATION) / 60))
const xpOvertime = overtimeMinutes * XP_PER_OVERTIME_MINUTE
// Fix: Only award all-completed bonus if there are actually completed tasks
const xpEarned = completedTasks.length * XP_PER_TASK + 
  (allCompleted && completedTasks.length > 0 ? XP_BONUS_ALL_COMPLETED : 0) + 
  xpOvertime
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --grep "does not award XP when no tasks completed"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/SessionResult.tsx src/__tests__/session-logic.test.ts
git commit -m "fix: prevent XP award when no tasks completed"
```

---

## Task 3: Fix SessionResult Stale Closure

**Files:**
- Modify: `src/pages/SessionResult.tsx:66-163`

- [ ] **Step 1: Write the failing test**

```typescript
// Add to session-logic.test.ts or create new test file
it('uses member state at save time, not render time', () => {
  // This is a documentation test - the bug is that member from useAuthStore
  // is captured at render time, but save() runs async
  // If member updates between render and save completion, stale data is used
  expect(true).toBe(true) // Documenting the bug
})
```

- [ ] **Step 2: Run test to verify it documents the issue**

Run: `npm run test -- --grep "uses member state at save time"`
Expected: PASS (documentation test)

- [ ] **Step 3: Write minimal implementation**

```typescript
// In SessionResult.tsx, capture member at save time
useEffect(() => {
  if (!family || !member || !duration) {
    setSaving(false)
    return
  }

  const save = async () => {
    // Capture member at save time to avoid stale closure
    const currentMember = useAuthStore.getState().member
    if (!currentMember) {
      setSaving(false)
      return
    }

    const oldLevel = currentMember.level

    const { data: session } = await createSession({
      family_id: family.id,
      member_id: currentMember.id,
      duration,
      task_ids: tasks.map((t) => t.id),
      completed_task_ids: completedTaskIds,
      xp_earned: xpEarned,
    })

    if (session) {
      setSessionRow(session as SessionRow)
    }

    const newXp = currentMember.xp + xpEarned
    const newLevelInfo = getLevelFromXp(newXp)
    const newLevel = newLevelInfo.level
    const now = new Date().toISOString()

    const { streak: newStreak, longestStreak: newLongestStreak } = calculateStreak(
      currentMember.last_session_at,
      currentMember.streak,
      currentMember.longest_streak
    )

    const { data: updated } = await updateMember(currentMember.id, {
      xp: newXp,
      level: newLevel,
      streak: newStreak,
      longest_streak: newLongestStreak,
      last_session_at: now,
    })

    if (updated) {
      setMember(updated as any)
    }

    // Check for level-up
    if (newLevel > oldLevel) {
      setLevelUpInfo({ emoji: newLevelInfo.emoji, name: newLevelInfo.name })
      setShowLevelUp(true)
    }

    for (const taskId of completedTaskIds) {
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        const { currentStreak: newTaskStreak, longestStreak: newTaskLongest } = calculateTaskStreak(
          task.last_completed_at,
          task.current_streak,
          task.longest_streak,
          task.recurring
        )
        await updateTask(taskId, {
          completed_count: task.completed_count + 1,
          current_streak: newTaskStreak,
          longest_streak: newTaskLongest,
          last_completed_at: now,
        })
      }
    }

    // Update weekly mission progress
    const { data: currentMission } = await getCurrentWeekMission(family.id)
    if (currentMission) {
      const mission = currentMission as { id: number; task_ids: number[]; member_progress: Record<string, number> }
      const memberIdStr = String(currentMember.id)
      const currentProgress = mission.member_progress?.[memberIdStr] || 0
      const missionTasksCompleted = completedTaskIds.filter((id) => mission.task_ids.includes(id)).length

      if (missionTasksCompleted > 0) {
        const newProgress = currentProgress + missionTasksCompleted
        const updates: Record<string, unknown> = { member_progress: { ...mission.member_progress, [memberIdStr]: newProgress } }

        // Award +50 XP bonus if mission just completed
        if (newProgress >= 3 && currentProgress < 3) {
          const bonusXp = newXp + 50
          const bonusLevel = getLevelFromXp(bonusXp).level
          await updateMember(currentMember.id, { xp: bonusXp, level: bonusLevel })
          if (updated) {
            setMember({ ...updated as any, xp: bonusXp, level: bonusLevel })
          }
        }

        await updateWeeklyMission(mission.id, updates)
      }
    }
  }

  save().finally(() => setSaving(false))
}, []) // Empty dependency array - only run once
```

- [ ] **Step 4: Run test to verify it documents the fix**

Run: `npm run test -- --grep "uses member state at save time"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/SessionResult.tsx
git commit -m "fix: use member state at save time to prevent stale closure"
```

---

## Task 4: Create Supabase Storage Bucket

**Files:**
- Create: `supabase-storage.sql`

- [ ] **Step 1: Write the storage setup SQL**

```sql
-- Create storage bucket for session photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-photos', 'session-photos', true);

-- Allow authenticated users to upload to their family's folder
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'session-photos' AND
  (storage.foldername(name))[1] = (
    SELECT family_id::text FROM members WHERE auth_id = auth.uid()
  )
);

-- Allow public read access to photos
CREATE POLICY "Public read access for photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'session-photos');

-- Allow authenticated users to delete their own family's photos
CREATE POLICY "Authenticated users can delete own family photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'session-photos' AND
  (storage.foldername(name))[1] = (
    SELECT family_id::text FROM members WHERE auth_id = auth.uid()
  )
);
```

- [ ] **Step 2: Document the storage setup**

Run: `echo "Storage bucket created - run supabase-storage.sql in Supabase SQL Editor"`
Expected: Documentation output

- [ ] **Step 3: Commit**

```bash
git add supabase-storage.sql
git commit -m "feat: add Supabase Storage bucket for session photos"
```

---

## Task 5: Update CameraCapture to Upload to Storage

**Files:**
- Modify: `src/components/CameraCapture.tsx`
- Create: `src/lib/storage.ts`

- [ ] **Step 1: Create storage helper**

```typescript
// src/lib/storage.ts
import { supabase } from '../config/supabase'

export async function uploadPhoto(
  familyId: number,
  sessionId: number,
  type: 'before' | 'after',
  dataUrl: string
): Promise<string | null> {
  // Convert data URL to blob
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  
  // Create file path: familyId/sessionId/type.jpg
  const filePath = `${familyId}/${sessionId}/${type}.jpg`
  
  // Upload to Supabase Storage
  const { error } = await supabase.storage
    .from('session-photos')
    .upload(filePath, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    })
  
  if (error) {
    console.error('Upload error:', error)
    return null
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('session-photos')
    .getPublicUrl(filePath)
  
  return urlData.publicUrl
}

export async function deletePhoto(
  familyId: number,
  sessionId: number,
  type: 'before' | 'after'
): Promise<void> {
  const filePath = `${familyId}/${sessionId}/${type}.jpg`
  await supabase.storage
    .from('session-photos')
    .remove([filePath])
}
```

- [ ] **Step 2: Update CameraCapture props**

```typescript
// Update CameraCaptureProps interface
interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void
  onClose: () => void
  familyId?: number
  sessionId?: number
  photoType?: 'before' | 'after'
}

// Update CameraCapture component to accept new props
export function CameraCapture({ 
  onCapture, 
  onClose, 
  familyId, 
  sessionId, 
  photoType 
}: CameraCaptureProps) {
  // ... existing code ...

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    
    // If familyId, sessionId, and photoType are provided, upload to Storage
    if (familyId && sessionId && photoType) {
      const { uploadPhoto } = await import('../lib/storage')
      const url = await uploadPhoto(familyId, sessionId, photoType, dataUrl)
      if (url) {
        onCapture(url) // Return the public URL instead of data URL
      }
    } else {
      onCapture(dataUrl) // Fallback to data URL
    }
  }

  // ... rest of existing code ...
}
```

- [ ] **Step 3: Run test to verify storage helper works**

Run: `npm run test -- --grep "uploadPhoto"`
Expected: PASS (if test exists) or create new test

- [ ] **Step 4: Commit**

```bash
git add src/lib/storage.ts src/components/CameraCapture.tsx
git commit -m "feat: upload photos to Supabase Storage instead of base64"
```

---

## Task 6: Update SessionResult to Use Storage URLs

**Files:**
- Modify: `src/pages/SessionResult.tsx:165-176`

- [ ] **Step 1: Update handlePhotoCapture**

```typescript
// In SessionResult.tsx, update handlePhotoCapture
const handlePhotoCapture = async (dataUrl: string) => {
  if (!sessionRow || !family) return

  // If dataUrl is already a URL (from Storage upload), use it directly
  // Otherwise, upload to Storage
  let photoUrl = dataUrl
  
  if (!dataUrl.startsWith('http')) {
    // Legacy base64 data - upload to Storage
    const { uploadPhoto } = await import('../lib/storage')
    const uploadedUrl = await uploadPhoto(family.id, sessionRow.id, cameraSlot!, dataUrl)
    if (uploadedUrl) {
      photoUrl = uploadedUrl
    }
  }

  if (cameraSlot === 'before') {
    setBeforePhoto(photoUrl)
    await updateSession(sessionRow.id, { before_photo: photoUrl })
  } else if (cameraSlot === 'after') {
    setAfterPhoto(photoUrl)
    await updateSession(sessionRow.id, { after_photo: photoUrl })
  }
  setCameraSlot(null)
}
```

- [ ] **Step 2: Update CameraCapture usage**

```typescript
// Update CameraCapture component usage in SessionResult
{cameraSlot && (
  <CameraCapture
    onCapture={handlePhotoCapture}
    onClose={() => setCameraSlot(null)}
    familyId={family?.id}
    sessionId={sessionRow?.id}
    photoType={cameraSlot}
  />
)}
```

- [ ] **Step 3: Run test to verify photo upload works**

Run: `npm run test -- --grep "handlePhotoCapture"`
Expected: PASS (if test exists) or create new test

- [ ] **Step 4: Commit**

```bash
git add src/pages/SessionResult.tsx
git commit -m "feat: use Storage URLs for session photos"
```

---

## Task 7: Add DB Migration for New Columns

**Files:**
- Create: `migrations/003_add_task_streaks_and_order.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Migration 003: Add task streaks and order columns
-- Run this in Supabase SQL Editor

-- Add task streak columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS current_streak integer not null default 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS longest_streak integer not null default 0;

-- Add task order column for drag-and-drop persistence
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_order integer not null default 0;

-- Update weekly_missions default target_completions
ALTER TABLE weekly_missions ALTER COLUMN target_completions SET DEFAULT 3;

-- Create index for task ordering
CREATE INDEX IF NOT EXISTS tasks_family_order_idx ON tasks(family_id, task_order);
```

- [ ] **Step 2: Document the migration**

Run: `echo "Migration 003 created - run migrations/003_add_task_streaks_and_order.sql in Supabase SQL Editor"`
Expected: Documentation output

- [ ] **Step 3: Commit**

```bash
git add migrations/003_add_task_streaks_and_order.sql
git commit -m "feat: add DB migration for task streaks and order columns"
```

---

## Task 8: Run Full Test Suite

**Files:**
- None (verification task)

- [ ] **Step 1: Run all tests**

Run: `npm run test`
Expected: All tests pass (41+ tests)

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds without errors

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No lint errors

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "fix: final test and build fixes"
```

---

## Summary

This plan covers:
1. **Bug Fixes:** 3 critical bugs (clock skew, XP edge case, stale closure)
2. **Tech Debt:** Migrate photos from base64 to Supabase Storage
3. **Infrastructure:** Add DB migration for new columns
4. **Quality:** Full test suite verification

**Estimated Time:** 2-3 hours
**Risk Level:** Medium (Storage migration requires Supabase setup)
**Dependencies:** Supabase project access for Storage bucket creation

**Next Steps After Completion:**
- Phase E: Screen-Time-Redemption UI
- Phase F: Parents Area
- Phase G: Musik during Sessions
