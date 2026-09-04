import { describe, it, expect } from 'vitest'
import { getMondayOf, weekKey } from '../lib/utils'

describe('weekKey', () => {
  it('formats local date as YYYY-MM-DD', () => {
    expect(weekKey(new Date(2026, 7, 8))).toBe('2026-08-08')
    expect(weekKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('getMondayOf', () => {
  it('returns the same day for a Monday', () => {
    const monday = new Date(2026, 7, 3)
    expect(weekKey(getMondayOf(monday))).toBe('2026-08-03')
  })

  it('returns the current weeks Monday for a Sunday (not next week)', () => {
    const sunday = new Date(2026, 7, 9)
    expect(weekKey(getMondayOf(sunday))).toBe('2026-08-03')
  })

  it('returns the current weeks Monday for a Saturday', () => {
    const saturday = new Date(2026, 7, 8)
    expect(weekKey(getMondayOf(saturday))).toBe('2026-08-03')
  })

  it('handles month boundaries', () => {
    const first = new Date(2026, 8, 1) // Tuesday, Sep 1 2026
    expect(weekKey(getMondayOf(first))).toBe('2026-08-31')
  })

  it('normalizes time to midnight', () => {
    const noonSunday = new Date(2026, 7, 9, 14, 30)
    const monday = getMondayOf(noonSunday)
    expect(monday.getHours()).toBe(0)
    expect(monday.getMinutes()).toBe(0)
  })
})
