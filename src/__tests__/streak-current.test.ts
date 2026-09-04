import { describe, it, expect, vi, afterEach } from 'vitest'
import { calculateStreak } from '../lib/gamification'

// BUG 1: calculateStreak must accept the current streak and increment it,
// rather than always resetting to 1. Verified as fixed.
describe('calculateStreak current-streak support', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('increments current streak for a 5-day streak continued yesterday', () => {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const { streak, longestStreak } = calculateStreak(yesterday.toISOString(), 5, 5)
    expect(streak).toBe(6)
    expect(longestStreak).toBe(6)
  })

  it('keeps the streak when a session happened today (no double increment)', () => {
    const today = new Date().toISOString()
    const { streak, longestStreak } = calculateStreak(today, 5, 7)
    expect(streak).toBe(5)
    expect(longestStreak).toBe(7)
  })

  it('resets to 1 after a gap longer than one day', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    const { streak, longestStreak } = calculateStreak(twoDaysAgo, 9, 12)
    expect(streak).toBe(1)
    expect(longestStreak).toBe(12)
  })

  it('starts a streak at 1 for the first ever session', () => {
    const { streak, longestStreak } = calculateStreak(null, 0, 0)
    expect(streak).toBe(1)
    expect(longestStreak).toBe(1)
  })
})