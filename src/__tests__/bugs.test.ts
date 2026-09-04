import { describe, it, expect, vi, afterEach } from 'vitest'
import { calculateStreak } from '../lib/gamification'

describe('Bug Regressions', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('BUG 1 regression: calculateStreak increments the current streak', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const { streak } = calculateStreak(yesterday.toISOString(), 4, 4)
    expect(streak).toBe(5)
  })

  it('BUG 3 regression: streak does not reset on a future/skewed date', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const { streak, longestStreak } = calculateStreak(tomorrow.toISOString(), 3, 9)
    expect(streak).toBe(3)
    expect(longestStreak).toBe(9)
  })
})