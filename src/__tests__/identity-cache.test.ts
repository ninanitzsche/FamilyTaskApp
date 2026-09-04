import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadLastMember, saveLastMember, clearLastMember } from '../lib/identityCache'

const store = new Map<string, string>()

beforeEach(() => {
  store.clear()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  })
})

describe('identityCache', () => {
  it('returns null when nothing cached', () => {
    expect(loadLastMember()).toBeNull()
  })

  it('saves and loads name, color, initial and family name', () => {
    saveLastMember({ name: 'Emil', color: '#00A381', familyName: 'Muster' })
    expect(loadLastMember()).toEqual({
      name: 'Emil',
      color: '#00A381',
      initial: 'E',
      familyName: 'Muster',
    })
  })

  it('falls back to default color when missing', () => {
    saveLastMember({ name: 'Lena' })
    expect(loadLastMember()?.color).toBe('#FF7A5C')
  })

  it('ignores corrupt JSON', () => {
    store.set('familyboard:lastMember', '{oops')
    expect(loadLastMember()).toBeNull()
  })

  it('clears the cache', () => {
    saveLastMember({ name: 'Emil' })
    clearLastMember()
    expect(loadLastMember()).toBeNull()
  })
})
