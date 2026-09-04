import { weekKey, getMondayOf } from './utils'

export const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, name: 'Ei', emoji: '🥚', color: '#E7D9F2' },
  { level: 2, xp: 100, name: 'Mini-Ninja', emoji: '🥷', color: '#7B6B8E' },
  { level: 3, xp: 300, name: 'Lehrling', emoji: '⚔️', color: '#FF7A5C' },
  { level: 4, xp: 600, name: 'Profi', emoji: '🎯', color: '#2FB6A4' },
  { level: 5, xp: 1000, name: 'Held', emoji: '🦸', color: '#E85D5D' },
  { level: 6, xp: 2000, name: 'Legende', emoji: '👑', color: '#FFB84D' },
]

export function getLevelFromXp(xp: number) {
  let result = LEVEL_THRESHOLDS[0]
  for (const t of LEVEL_THRESHOLDS) {
    if (xp >= t.xp) result = t
  }
  return result
}

export function getXpForNextLevel(xp: number) {
  for (const t of LEVEL_THRESHOLDS) {
    if (xp < t.xp) return t.xp
  }
  return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].xp
}

export function calculateStreak(
  lastSessionAt: string | null,
  currentStreak: number = 0,
  longestStreak: number = 0
): { streak: number; longestStreak: number } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (!lastSessionAt) {
    return { streak: 1, longestStreak: Math.max(longestStreak, 1) }
  }

  const last = new Date(lastSessionAt)
  const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate())
  const diffDays = Math.floor((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24))

  // Handle clock skew: if last session is in the future, keep current streak
  if (diffDays < 0) {
    return { streak: currentStreak, longestStreak }
  }

  if (diffDays === 0) {
    return { streak: currentStreak, longestStreak }
  }

  if (diffDays === 1) {
    const newStreak = currentStreak + 1
    return { streak: newStreak, longestStreak: Math.max(longestStreak, newStreak) }
  }

  return { streak: 1, longestStreak: Math.max(longestStreak, 1) }
}

export function getCurrentWeekKey(): string {
  return weekKey(getMondayOf(new Date()))
}

export function canUseStreakSave(
  role: 'parent' | 'child',
  streakSavesUsed: number,
  streakSaveWeek: string | null
): boolean {
  const currentWeek = getCurrentWeekKey()
  const usedThisWeek = streakSaveWeek === currentWeek ? streakSavesUsed : 0

  if (role === 'parent') return true
  return usedThisWeek < 1
}

export function getStreakSaveInfo(
  role: 'parent' | 'child',
  streakSavesUsed: number,
  streakSaveWeek: string | null
): { used: number; max: number; canSave: boolean } {
  const currentWeek = getCurrentWeekKey()
  const usedThisWeek = streakSaveWeek === currentWeek ? streakSavesUsed : 0

  if (role === 'parent') {
    return { used: usedThisWeek, max: 999, canSave: true }
  }
  return { used: usedThisWeek, max: 1, canSave: usedThisWeek < 1 }
}

export function calculateTaskStreak(
  lastCompletedAt: string | null,
  currentStreak: number,
  longestStreak: number,
  recurring: 'never' | 'daily' | 'weekly'
): { currentStreak: number; longestStreak: number } {
  if (recurring === 'never') {
    return { currentStreak: 0, longestStreak }
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (!lastCompletedAt) {
    return { currentStreak: 1, longestStreak: Math.max(longestStreak, 1) }
  }

  const last = new Date(lastCompletedAt)
  const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate())
  const diffDays = Math.floor((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { currentStreak, longestStreak }
  }

  if (diffDays === 0) {
    return { currentStreak, longestStreak }
  }

  if (recurring === 'daily' && diffDays === 1) {
    const newStreak = currentStreak + 1
    return { currentStreak: newStreak, longestStreak: Math.max(longestStreak, newStreak) }
  }

  if (recurring === 'weekly' && diffDays <= 7) {
    const newStreak = currentStreak + 1
    return { currentStreak: newStreak, longestStreak: Math.max(longestStreak, newStreak) }
  }

  return { currentStreak: 1, longestStreak: Math.max(longestStreak, 1) }
}

export function calculateRewardRedemption(
  xp: number,
  xpRedeemed: number,
  cost: number,
  weekRedemptions: number,
  maxWeekly: number
): { ok: boolean; reason?: 'insufficient-xp' | 'weekly-limit'; newRedeemed?: number } {
  const spendable = Math.max(0, xp - xpRedeemed)
  if (spendable < cost) {
    return { ok: false, reason: 'insufficient-xp' }
  }
  if (maxWeekly > 0 && weekRedemptions >= maxWeekly) {
    return { ok: false, reason: 'weekly-limit' }
  }
  return { ok: true, newRedeemed: xpRedeemed + cost }
}

export function calculateScreenTimeRedeem(
  xp: number,
  xpRedeemed: number,
  balance: number
): { minutes: number; newRedeemed: number; newBalance: number } {
  const redeemable = Math.max(0, xp - xpRedeemed)
  if (redeemable <= 0) {
    return { minutes: 0, newRedeemed: xpRedeemed, newBalance: balance }
  }
  return { minutes: redeemable, newRedeemed: xp, newBalance: balance + redeemable }
}
