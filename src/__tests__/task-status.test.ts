import { describe, it, expect } from 'vitest'
import { getTaskStatus } from '../lib/tasks'
import type { TaskRow } from '../types/supabase'

const baseTask = (overrides: Partial<TaskRow> = {}): TaskRow => ({
  id: 1,
  family_id: 1,
  title: 'Test',
  emoji: '🧹',
  image_url: null,
  assignee_id: null,
  recurring: 'never',
  cooldown_days: null,
  last_completed_at: null,
  completed_count: 0,
  current_streak: 0,
  longest_streak: 0,
  task_order: 0,
  created_at: new Date().toISOString(),
  ...overrides,
})

describe('getTaskStatus', () => {
  const now = new Date('2026-08-08T10:00:00')
  const yesterday = new Date('2026-08-07T10:00:00')

  it('marks a task assigned to another child as unavailable', () => {
    const status = getTaskStatus(baseTask({ assignee_id: 2 }), 1, 'Mia', now)
    expect(status).toEqual({ available: false, reason: 'other-assignee', label: 'Nur für Mia' })
  })

  it('leaves an unassigned (Alle) task available', () => {
    const status = getTaskStatus(baseTask({ assignee_id: null }), 1, 'Mia', now)
    expect(status).toEqual({ available: true })
  })

  it('leaves a task assigned to me available', () => {
    const status = getTaskStatus(baseTask({ assignee_id: 1 }), 1, 'Mia', now)
    expect(status).toEqual({ available: true })
  })

  it('applies a cooldown based on last_completed_at plus cooldown_days', () => {
    const status = getTaskStatus(
      baseTask({ cooldown_days: 2, last_completed_at: yesterday.toISOString() }),
      1,
      'Mia',
      now
    )
    expect(status).toEqual({
      available: false,
      reason: 'cooldown',
      label: '1 Tag warten',
    })
  })

  it('counts full days on the first cooldown day', () => {
    const lastCompleted = new Date('2026-08-08T08:00:00')
    const status = getTaskStatus(
      baseTask({ cooldown_days: 3, last_completed_at: lastCompleted.toISOString() }),
      1,
      'Mia',
      new Date('2026-08-08T06:00:00')
    )
    expect(status).toMatchObject({ available: false, reason: 'cooldown' })
  })

  it('allows once cooldown elapsed', () => {
    const status = getTaskStatus(
      baseTask({ cooldown_days: 2, last_completed_at: yesterday.toISOString() }),
      1,
      'Mia',
      new Date('2026-08-10T10:00:00')
    )
    expect(status).toEqual({ available: true })
  })

  it('ignores cooldown when it is null or 0', () => {
    expect(
      getTaskStatus(baseTask({ cooldown_days: 0, last_completed_at: yesterday.toISOString() }), 1, 'Mia', now)
    ).toEqual({ available: true })
    expect(
      getTaskStatus(baseTask({ cooldown_days: null, last_completed_at: yesterday.toISOString() }), 1, 'Mia', now)
    ).toEqual({ available: true })
  })

  it('is available when never completed before', () => {
    const status = getTaskStatus(baseTask({ cooldown_days: 5, last_completed_at: null }), 1, 'Mia', now)
    expect(status).toEqual({ available: true })
  })
})