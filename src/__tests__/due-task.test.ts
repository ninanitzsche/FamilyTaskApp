import { describe, it, expect } from 'vitest'
import { getDueTask, getDaysAgoLabel } from '../lib/tasks'

const now = new Date('2026-08-09T12:00:00Z')

interface TaskFixture {
  id: number
  family_id: number
  title: string
  emoji: string
  image_url: string | null
  assignee_id: number | null
  recurring: 'never' | 'daily' | 'weekly'
  cooldown_days: number | null
  last_completed_at: string | null
  completed_count: number
  current_streak: number
  longest_streak: number
  task_order: number
  created_at: string
}

const baseTask = (overrides: Partial<TaskFixture> = {}): TaskFixture => ({
  id: 1,
  family_id: 7,
  title: 'Lego aufräumen',
  emoji: '🧱',
  image_url: null,
  assignee_id: null,
  recurring: 'never',
  cooldown_days: null,
  last_completed_at: null,
  completed_count: 0,
  current_streak: 0,
  longest_streak: 0,
  task_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const getName = () => 'Emil'

describe('getDueTask', () => {
  it('returns null when there are no tasks', () => {
    expect(getDueTask([], 1, getName, now)).toBeNull()
  })

  it('prefers a never-done task over already done tasks', () => {
    const never = baseTask({ id: 1, last_completed_at: null })
    const done = baseTask({ id: 2, last_completed_at: '2026-08-07T10:00:00Z' })
    expect(getDueTask([done, never], 1, getName, now)?.id).toBe(1)
  })

  it('picks the oldest completed task among done tasks', () => {
    const recent = baseTask({ id: 1, last_completed_at: '2026-08-08T10:00:00Z' })
    const old = baseTask({ id: 2, last_completed_at: '2026-08-01T10:00:00Z' })
    expect(getDueTask([recent, old], 1, getName, now)?.id).toBe(2)
  })

  it('excludes tasks assigned to other members', () => {
    const mine = baseTask({ id: 1, last_completed_at: '2026-08-01T10:00:00Z' })
    const theirs = baseTask({ id: 2, assignee_id: 99, last_completed_at: '2026-07-01T10:00:00Z' })
    expect(getDueTask([theirs, mine], 1, getName, now)?.id).toBe(1)
  })

  it('excludes tasks still in cooldown', () => {
    const inCooldown = baseTask({ id: 1, cooldown_days: 3, last_completed_at: '2026-08-08T10:00:00Z' })
    const free = baseTask({ id: 2, last_completed_at: '2026-08-01T10:00:00Z' })
    expect(getDueTask([inCooldown, free], 1, getName, now)?.id).toBe(2)
  })

  it('returns null when every task is unavailable', () => {
    const theirs = baseTask({ id: 1, assignee_id: 99, last_completed_at: null })
    expect(getDueTask([theirs], 1, getName, now)).toBeNull()
  })
})

describe('getDaysAgoLabel', () => {
  it('labels never-done tasks', () => {
    expect(getDaysAgoLabel(null, now)).toBe('Noch nie erledigt')
  })

  it('labels a task done one day ago', () => {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    expect(getDaysAgoLabel(yesterday, now)).toBe('Vor 1 Tag')
  })

  it('labels a task done several days ago', () => {
    const old = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    expect(getDaysAgoLabel(old, now)).toBe('Vor 5 Tagen')
  })
})
