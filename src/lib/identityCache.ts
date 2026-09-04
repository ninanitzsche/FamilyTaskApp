export interface LastMemberCache {
  name: string
  color: string
  initial: string
  familyName: string
}

const KEY = 'familyboard:lastMember'

export function loadLastMember(): LastMemberCache | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const p = parsed as { name?: unknown }
    if (typeof p.name !== 'string' || !p.name) return null
    return parsed as LastMemberCache
  } catch {
    return null
  }
}

export function saveLastMember(member: { name: string; color?: string | null; familyName?: string | null }): void {
  const cache: LastMemberCache = {
    name: member.name,
    color: member.color || '#FF7A5C',
    initial: member.name[0]?.toUpperCase() || '🥷',
    familyName: member.familyName || '',
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    // localStorage nicht verfügbar (z.B. private mode)
  }
}

export function clearLastMember(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignorieren
  }
}
