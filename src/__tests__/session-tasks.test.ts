import { describe, it, expect } from 'vitest'
import { splitSessionTasks } from '../lib/utils'
import type { TaskRow } from '../types/supabase'

function makeTask(id: number): TaskRow {
  return {
    id,
    family_id: 1,
    title: `Task ${id}`,
    emoji: '🧹',
    image_url: null,
    assignee_id: null,
    recurring: 'never',
    cooldown_days: null,
    last_completed_at: null,
    completed_count: 0,
    current_streak: 0,
    longest_streak: 0,
    task_order: id,
    created_at: '2026-01-01',
  }
}

describe('splitSessionTasks', () => {
  it('splits done and open tasks', () => {
    const tasks = [makeTask(1), makeTask(2), makeTask(3)]
    const result = splitSessionTasks([1, 2, 3], [1, 3], tasks)
    expect(result.done.map((t) => t.id)).toEqual([1, 3])
    expect(result.open.map((t) => t.id)).toEqual([2])
    expect(result.missingIds).toEqual([])
  })

  it('returns missing ids for deleted tasks without counting them', () => {
    const tasks = [makeTask(1)]
    const result = splitSessionTasks([1, 99], [1], tasks)
    expect(result.done.map((t) => t.id)).toEqual([1])
    expect(result.open).toEqual([])
    expect(result.missingIds).toEqual([99])
  })

  it('handles empty arrays', () => {
    const result = splitSessionTasks([], [], [])
    expect(result.done).toEqual([])
    expect(result.open).toEqual([])
    expect(result.missingIds).toEqual([])
  })

  it('removes done ids from open', () => {
    const tasks = [makeTask(1), makeTask(2)]
    const result = splitSessionTasks([1, 2], [2], tasks)
    expect(result.open.map((t) => t.id)).toEqual([1])
  })
})