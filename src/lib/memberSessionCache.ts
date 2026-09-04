export interface MemberCacheEntry {
  memberId: number
  name: string
  color: string
  role: string
  familyId: number
  familyName: string
  session: { access_token: string; refresh_token: string }
}

const KEY = 'familyboard:memberSessions'

export function loadMemberSessions(): MemberCacheEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidEntry)
  } catch {
    return []
  }
}

export function getMemberSession(memberId: number): MemberCacheEntry | null {
  return loadMemberSessions().find((e) => e.memberId === memberId) ?? null
}

export function saveMemberSession(entry: MemberCacheEntry): void {
  const all = loadMemberSessions()
  const existing = all.findIndex((e) => e.memberId === entry.memberId)
  if (existing >= 0) all[existing] = entry
  else all.push(entry)
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // localStorage nicht verfügbar (z.B. private mode)
  }
}

export function clearMemberSessions(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignorieren
  }
}

function isValidEntry(value: unknown): value is MemberCacheEntry {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.memberId === 'number' &&
    typeof v.name === 'string' &&
    typeof v.color === 'string' &&
    typeof v.role === 'string' &&
    typeof v.familyId === 'number' &&
    typeof v.familyName === 'string' &&
    typeof v.session === 'object' &&
    v.session !== null &&
    typeof (v.session as Record<string, unknown>).access_token === 'string' &&
    typeof (v.session as Record<string, unknown>).refresh_token === 'string'
  )
}
