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
