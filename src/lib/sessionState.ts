import type { TaskRow } from '../types/supabase'

const THROTTLE_MS = 10_000
const lastWriteAt = new Map<string, number>()

export interface SessionState {
  tasks: TaskRow[]
  completedTaskIds: number[]
  elapsed: number
  mode: 'timer' | 'free'
  startedAt: string
  beforePhoto?: string | null
}

function keyFor(memberId?: number): string {
  return `activeSession:${memberId ?? 'anon'}`
}

function shouldWrite(state: SessionState, key: string): boolean {
  const now = Date.now()
  const last = lastWriteAt.get(key) ?? 0
  const snapshotChanged = state.completedTaskIds.length > 0 || state.beforePhoto
  // Always persist task/photo progression; only throttle pure elapsed ticks.
  if (snapshotChanged || now - last >= THROTTLE_MS) {
    lastWriteAt.set(key, now)
    return true
  }
  return false
}

export function saveSessionState(state: SessionState, memberId?: number): void {
  const key = keyFor(memberId)
  if (!shouldWrite(state, key)) return
  try {
    localStorage.setItem(key, JSON.stringify(state))
  } catch {
    // localStorage full or unavailable
  }
}

export function loadSessionState(memberId?: number): SessionState | null {
  try {
    const raw = localStorage.getItem(keyFor(memberId))
    if (!raw) return null
    return JSON.parse(raw) as SessionState
  } catch {
    return null
  }
}

export function clearSessionState(memberId?: number): void {
  try {
    localStorage.removeItem(keyFor(memberId))
  } catch {
    // ignore
  }
}