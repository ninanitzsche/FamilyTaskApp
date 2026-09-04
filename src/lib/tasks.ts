import type { TaskRow } from '../types/supabase'
import { calculateTaskStreak } from './gamification'

export type TaskStatus =
  | { available: true }
  | { available: false; reason: 'other-assignee' | 'cooldown'; label: string }

const DAY_MS = 24 * 60 * 60 * 1000

export function getTaskStatus(
  task: Pick<TaskRow, 'assignee_id' | 'cooldown_days' | 'last_completed_at'>,
  memberId: number,
  assigneeName: string,
  now: Date = new Date()
): TaskStatus {
  if (task.assignee_id !== null && task.assignee_id !== undefined && task.assignee_id !== memberId) {
    return { available: false, reason: 'other-assignee', label: `Nur für ${assigneeName}` }
  }

  const cooldownDays = task.cooldown_days ?? 0
  if (cooldownDays > 0 && task.last_completed_at) {
    const lastCompleted = new Date(task.last_completed_at)
    const cooldownEnd = new Date(lastCompleted.getTime() + cooldownDays * DAY_MS)
    const remainingMs = cooldownEnd.getTime() - now.getTime()
    if (remainingMs > 0) {
      const remainingDays = Math.max(1, Math.ceil(remainingMs / DAY_MS))
      return {
        available: false,
        reason: 'cooldown',
        label: `${remainingDays} Tag${remainingDays !== 1 ? 'e' : ''} warten`,
      }
    }
  }

  return { available: true }
}

export function getDueTask(
  tasks: TaskRow[],
  memberId: number,
  getAssigneeName: (assigneeId: number | null) => string,
  now: Date = new Date()
): TaskRow | null {
  const available = tasks.filter(
    (t) => getTaskStatus(t, memberId, getAssigneeName(t.assignee_id ?? null), now).available
  )
  if (available.length === 0) return null
  return available.sort((a, b) => {
    if (a.last_completed_at === null && b.last_completed_at === null) return a.id - b.id
    if (a.last_completed_at === null) return -1
    if (b.last_completed_at === null) return 1
    return new Date(a.last_completed_at).getTime() - new Date(b.last_completed_at).getTime()
  })[0]
}

export function getDaysAgoLabel(lastCompletedAt: string | null, now: Date = new Date()): string {
  if (!lastCompletedAt) return 'Noch nie erledigt'
  const days = Math.floor((now.getTime() - new Date(lastCompletedAt).getTime()) / DAY_MS)
  return days <= 1 ? 'Vor 1 Tag' : `Vor ${days} Tagen`
}

export function completeTaskRow(
  task: Pick<
    TaskRow,
    'completed_count' | 'last_completed_at' | 'current_streak' | 'longest_streak' | 'recurring'
  >,
  now: Date | string = new Date()
): Partial<TaskRow> {
  const nowIso = typeof now === 'string' ? now : now.toISOString()
  const { currentStreak, longestStreak } = calculateTaskStreak(
    task.last_completed_at,
    task.current_streak,
    task.longest_streak,
    task.recurring
  )
  return {
    completed_count: task.completed_count + 1,
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_completed_at: nowIso,
  }
}
