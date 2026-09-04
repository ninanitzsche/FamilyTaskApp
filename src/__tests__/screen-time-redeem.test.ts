import { describe, it, expect } from 'vitest'
import { calculateScreenTimeRedeem } from '../lib/gamification'

describe('calculateScreenTimeRedeem', () => {
  it('returns no minutes when xp is 0', () => {
    expect(calculateScreenTimeRedeem(0, 0, 0)).toEqual({ minutes: 0, newRedeemed: 0, newBalance: 0 })
  })

  it('converts all XP when nothing was redeemed yet', () => {
    expect(calculateScreenTimeRedeem(35, 0, 10)).toEqual({ minutes: 35, newRedeemed: 35, newBalance: 45 })
  })

  it('returns no minutes when everything was already redeemed', () => {
    expect(calculateScreenTimeRedeem(35, 35, 20)).toEqual({ minutes: 0, newRedeemed: 35, newBalance: 20 })
  })

  it('only converts XP earned since the last redemption', () => {
    expect(calculateScreenTimeRedeem(50, 35, 5)).toEqual({ minutes: 15, newRedeemed: 50, newBalance: 20 })
  })

  it('never goes negative when xpRedeemed exceeds xp (defensive)', () => {
    expect(calculateScreenTimeRedeem(35, 40, 0)).toEqual({ minutes: 0, newRedeemed: 40, newBalance: 0 })
  })
})
