import { describe, it, expect } from 'vitest'
import { getLevelFromXp, getXpForNextLevel, calculateStreak, calculateTaskStreak } from '../lib/gamification'

describe('getLevelFromXp', () => {
  it('returns Ei for 0 XP', () => {
    const result = getLevelFromXp(0)
    expect(result.level).toBe(1)
    expect(result.name).toBe('Ei')
  })

  it('returns Ei for 99 XP (below Mini-Ninja)', () => {
    const result = getLevelFromXp(99)
    expect(result.level).toBe(1)
    expect(result.name).toBe('Ei')
  })

  it('returns Mini-Ninja for 100 XP', () => {
    const result = getLevelFromXp(100)
    expect(result.level).toBe(2)
    expect(result.name).toBe('Mini-Ninja')
  })

  it('returns Lehrling for 300 XP', () => {
    const result = getLevelFromXp(300)
    expect(result.level).toBe(3)
    expect(result.name).toBe('Lehrling')
  })

  it('returns Profi for 600 XP', () => {
    const result = getLevelFromXp(600)
    expect(result.level).toBe(4)
    expect(result.name).toBe('Profi')
  })

  it('returns Held for 1000 XP', () => {
    const result = getLevelFromXp(1000)
    expect(result.level).toBe(5)
    expect(result.name).toBe('Held')
  })

  it('returns Legende for 2000 XP', () => {
    const result = getLevelFromXp(2000)
    expect(result.level).toBe(6)
    expect(result.name).toBe('Legende')
  })

  it('returns highest level achieved for high XP', () => {
    const result = getLevelFromXp(5000)
    expect(result.level).toBe(6)
    expect(result.name).toBe('Legende')
  })
})

describe('getXpForNextLevel', () => {
  it('returns 100 for 0 XP (next level is Mini-Ninja)', () => {
    expect(getXpForNextLevel(0)).toBe(100)
  })

  it('returns 100 for 50 XP', () => {
    expect(getXpForNextLevel(50)).toBe(100)
  })

  it('returns 300 for 100 XP (next level is Lehrling)', () => {
    expect(getXpForNextLevel(100)).toBe(300)
  })

  it('returns 600 for 300 XP (next level is Profi)', () => {
    expect(getXpForNextLevel(300)).toBe(600)
  })

  it('returns 2000 for 1000 XP (next level is Legende)', () => {
    expect(getXpForNextLevel(1000)).toBe(2000)
  })

  it('returns 2000 for 2000 XP (already max level)', () => {
    expect(getXpForNextLevel(2000)).toBe(2000)
  })

  it('returns 2000 for 5000 XP (already max level)', () => {
    expect(getXpForNextLevel(5000)).toBe(2000)
  })
})

describe('calculateStreak', () => {
  it('returns streak 1 when no last session', () => {
    const result = calculateStreak(null)
    expect(result.streak).toBe(1)
    expect(result.longestStreak).toBe(1)
  })

  it('returns streak 0 when last session was today', () => {
    const now = new Date()
    const result = calculateStreak(now.toISOString())
    expect(result.streak).toBe(0)
  })

  it('returns streak 1 when last session was yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const result = calculateStreak(yesterday.toISOString())
    expect(result.streak).toBe(1)
  })

  it('returns streak 1 when last session was 2+ days ago', () => {
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const result = calculateStreak(twoDaysAgo.toISOString())
    expect(result.streak).toBe(1)
  })

  it('increments streak when current streak provided and last session yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const result = calculateStreak(yesterday.toISOString(), 5)
    expect(result.streak).toBe(6) // 5 + 1
    expect(result.longestStreak).toBe(6)
  })

  it('updates longest streak when current streak exceeds it', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const result = calculateStreak(yesterday.toISOString(), 5, 3)
    expect(result.streak).toBe(6)
    expect(result.longestStreak).toBe(6) // max(3, 6) = 6
  })

  it('keeps longest streak when current streak is lower', () => {
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const result = calculateStreak(twoDaysAgo.toISOString(), 5, 10)
    expect(result.streak).toBe(1) // Reset
    expect(result.longestStreak).toBe(10) // max(10, 1) = 10
  })

  it('handles future date (clock skew) without resetting streak', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const result = calculateStreak(tomorrow.toISOString(), 5, 10)
    // Should NOT reset streak due to clock skew
    expect(result.streak).toBe(5) // Keep current streak, don't reset
    expect(result.longestStreak).toBe(10) // Keep longest streak
  })
})

describe('calculateTaskStreak', () => {
  it('handles future date (clock skew) without resetting streak', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const result = calculateTaskStreak(tomorrow.toISOString(), 5, 10, 'daily')
    // Should NOT reset streak due to clock skew
    expect(result.currentStreak).toBe(5)
    expect(result.longestStreak).toBe(10)
  })
})
