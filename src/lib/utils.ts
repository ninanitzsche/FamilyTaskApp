import type { TaskRow } from '../types/supabase'

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function getMondayOf(date: Date): Date {
  const monday = new Date(date)
  monday.setHours(0, 0, 0, 0)
  const offset = (monday.getDay() + 6) % 7
  monday.setDate(monday.getDate() - offset)
  return monday
}

export function weekKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function splitSessionTasks(
  taskIds: number[],
  completedIds: number[],
  allTasks: TaskRow[]
): { done: TaskRow[]; open: TaskRow[]; missingIds: number[] } {
  const doneIds = new Set(completedIds)
  const byId = new Map(allTasks.map((t) => [t.id, t]))
  const done: TaskRow[] = []
  const open: TaskRow[] = []
  const missingIds: number[] = []
  for (const id of taskIds) {
    const task = byId.get(id)
    if (!task) {
      missingIds.push(id)
      continue
    }
    if (doneIds.has(id)) done.push(task)
    else open.push(task)
  }
  return { done, open, missingIds }
}
