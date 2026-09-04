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
    const inCooldown = task({ id: 5, cooldown_days: 1, last_completed_at: '2026-08-10T07:00:00.000Z' })
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
