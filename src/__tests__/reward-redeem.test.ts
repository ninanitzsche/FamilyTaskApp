import { describe, it, expect } from 'vitest'
import { calculateRewardRedemption } from '../lib/gamification'

describe('calculateRewardRedemption', () => {
  it('returns insufficient-xp when there is not enough spendable xp left', () => {
    expect(calculateRewardRedemption(100, 80, 50, 0, 0)).toMatchObject({
      ok: false,
      reason: 'insufficient-xp',
    })
  })

  it('returns ok and increments xpRedeemed by cost', () => {
    expect(calculateRewardRedemption(200, 0, 50, 0, 0)).toEqual({
      ok: true,
      newRedeemed: 50,
    })
  })

  it('accounts for xp already spent on screen-time (shared pool)', () => {
    expect(calculateRewardRedemption(200, 150, 40, 0, 0)).toEqual({
      ok: true,
      newRedeemed: 190,
    })
  })

  it('rejects when the reward costs more than the remaining spendable xp', () => {
    expect(calculateRewardRedemption(200, 150, 60, 0, 0)).toMatchObject({
      ok: false,
      reason: 'insufficient-xp',
    })
  })

  it('enforces a weekly redemption limit', () => {
    expect(calculateRewardRedemption(200, 0, 20, 2, 2)).toMatchObject({
      ok: false,
      reason: 'weekly-limit',
    })
  })

  it('allows redemption when weekly limit not reached yet', () => {
    expect(calculateRewardRedemption(200, 0, 20, 1, 2)).toEqual({
      ok: true,
      newRedeemed: 20,
    })
  })

  it('treats maxWeekly 0 as unlimited', () => {
    expect(calculateRewardRedemption(200, 0, 20, 50, 0)).toEqual({
      ok: true,
      newRedeemed: 20,
    })
  })
})