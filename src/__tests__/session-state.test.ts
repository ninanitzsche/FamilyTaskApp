import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { saveSessionState, loadSessionState, clearSessionState } from '../lib/sessionState'

function makeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => {
      map.delete(k)
    },
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
  } as Storage
}

function baseState(overrides: Partial<Parameters<typeof saveSessionState>[0]> = {}) {
  return {
    tasks: [],
    completedTaskIds: [],
    elapsed: 0,
    mode: 'free' as const,
    startedAt: '2026-08-08T09:00:00Z',
    ...overrides,
  }
}

describe('sessionState', () => {
  let original: Storage | undefined
  let nowSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    original = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: makeStorage(),
      configurable: true,
    })
    nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000_000_000)
  })

  afterEach(() => {
    nowSpy.mockRestore()
    Object.defineProperty(globalThis, 'localStorage', {
      value: original,
      configurable: true,
    })
  })

  it('round-trips a session state including beforePhoto', () => {
    const state = baseState({ completedTaskIds: [1, 2], elapsed: 42, beforePhoto: 'data:image/jpeg;base64,ABC123' })
    saveSessionState(state)
    expect(loadSessionState()).toEqual({ ...state, tasks: [] })
  })

  it('loads states without beforePhoto (backwards compatible)', () => {
    saveSessionState(baseState())
    const loaded = loadSessionState()
    expect(loaded?.beforePhoto).toBeUndefined()
  })

  it('clears the stored session', () => {
    saveSessionState(baseState())
    clearSessionState()
    expect(loadSessionState()).toBeNull()
  })

  it('returns null when localStorage is empty', () => {
    expect(loadSessionState()).toBeNull()
  })

  it('scopes sessions by member, and clearing one does not wipe the other', () => {
    saveSessionState(baseState({ elapsed: 5 }), 1)
    saveSessionState(baseState({ elapsed: 9 }), 2)
    expect(loadSessionState(1)?.elapsed).toBe(5)
    expect(loadSessionState(2)?.elapsed).toBe(9)
    clearSessionState(1)
    expect(loadSessionState(1)).toBeNull()
    expect(loadSessionState(2)?.elapsed).toBe(9)
  })

  it('throttles pure elapsed ticks within the window', () => {
    saveSessionState(baseState({ elapsed: 1 }))
    const raw1 = globalThis.localStorage.getItem('activeSession:anon')
    saveSessionState(baseState({ elapsed: 2 }))
    const raw2 = globalThis.localStorage.getItem('activeSession:anon')
    expect(raw1).toBe(raw2)
  })

  it('persists immediately when completed tasks change, even mid-window', () => {
    saveSessionState(baseState({ elapsed: 1 }))
    const raw1 = globalThis.localStorage.getItem('activeSession:anon')
    saveSessionState(baseState({ elapsed: 2, completedTaskIds: [3] }))
    const raw2 = globalThis.localStorage.getItem('activeSession:anon')
    expect(raw1).not.toBe(raw2)
  })
})