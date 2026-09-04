import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  loadMemberSessions,
  saveMemberSession,
  getMemberSession,
  clearMemberSessions,
  type MemberCacheEntry,
} from '../lib/memberSessionCache'

const store = new Map<string, string>()

beforeEach(() => {
  store.clear()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  })
})

const entry = (overrides: Partial<MemberCacheEntry> = {}): MemberCacheEntry => ({
  memberId: 1,
  name: 'Emil',
  color: '#00A381',
  role: 'child',
  familyId: 7,
  familyName: 'Muster',
  session: { access_token: 'at-1', refresh_token: 'rt-1' },
  ...overrides,
})

describe('memberSessionCache', () => {
  it('returns an empty list when nothing is cached', () => {
    expect(loadMemberSessions()).toEqual([])
  })

  it('stores and loads a member entry', () => {
    saveMemberSession(entry())
    expect(loadMemberSessions()).toEqual([entry()])
  })

  it('upserts by memberId', () => {
    saveMemberSession(entry({ memberId: 1 }))
    saveMemberSession(entry({ memberId: 1, name: 'Lena' }))
    const all = loadMemberSessions()
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('Lena')
  })

  it('keeps multiple members', () => {
    saveMemberSession(entry({ memberId: 1, name: 'Emil' }))
    saveMemberSession(entry({ memberId: 2, name: 'Lena' }))
    expect(loadMemberSessions()).toHaveLength(2)
  })

  it('gets a single member by id', () => {
    saveMemberSession(entry({ memberId: 2, name: 'Lena' }))
    expect(getMemberSession(2)?.name).toBe('Lena')
    expect(getMemberSession(99)).toBeNull()
  })

  it('clears the cache', () => {
    saveMemberSession(entry())
    clearMemberSessions()
    expect(loadMemberSessions()).toEqual([])
  })

  it('ignores corrupt JSON', () => {
    store.set('familyboard:memberSessions', '{oops')
    expect(loadMemberSessions()).toEqual([])
  })
})
