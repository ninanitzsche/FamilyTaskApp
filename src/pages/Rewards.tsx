import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../store/authStore'
import { getFamilyRewards, createRewardRedemption, updateMember, getRewardRedemptionsThisWeek } from '../lib/supabase'
import { calculateRewardRedemption, getCurrentWeekKey } from '../lib/gamification'
import type { RewardRow } from '../types/supabase'

export function Rewards() {
  const { member, family } = useAuth()
  const [rewards, setRewards] = useState<RewardRow[]>([])
  const [weeklyCounts, setWeeklyCounts] = useState<Record<number, number>>({})
  const [redeemingId, setRedeemingId] = useState<number | null>(null)
  const [confirmReward, setConfirmReward] = useState<RewardRow | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const spendable = Math.max(0, (member?.xp || 0) - (member?.xp_redeemed || 0))

  useEffect(() => {
    if (!family) return
    getFamilyRewards(family.id).then(({ data }) => {
      if (data) setRewards(data as RewardRow[])
    })
  }, [family])

  useEffect(() => {
    if (!family || !member) return
    const weekStart = getCurrentWeekKey()
    getRewardRedemptionsThisWeek(weekStart, member.id).then(({ data }) => {
      if (!data) return
      const counts: Record<number, number> = {}
      for (const row of data as { reward_id: number }[]) {
        counts[row.reward_id] = (counts[row.reward_id] || 0) + 1
      }
      setWeeklyCounts(counts)
    })
  }, [family])

  const handleConfirm = async () => {
    if (!member || !confirmReward) return
    const weekCount = weeklyCounts[confirmReward.id] || 0
    const maxWeekly = confirmReward.max_redemptions_per_week ?? 0
    const result = calculateRewardRedemption(
      member.xp,
      member.xp_redeemed,
      confirmReward.xp_cost,
      weekCount,
      maxWeekly
    )

    if (!result.ok) {
      setConfirmReward(null)
      setMessage({
        type: 'error',
        text:
          result.reason === 'weekly-limit'
            ? 'Diese Woche ist schon eingelöst! 🙈'
            : 'Nicht genug einlösbare XP. Erst fleißig sein! 💪',
      })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setRedeemingId(confirmReward.id)
    try {
      await createRewardRedemption(confirmReward.id, member.id)
      const { data: updated, error } = await updateMember(member.id, {
        xp_redeemed: result.newRedeemed,
      })
      if (error || !updated) {
        throw new Error('updateMember failed')
      }
      useAuthStore.getState().setMember(updated)
      setWeeklyCounts((prev) => ({
        ...prev,
        [confirmReward.id]: (prev[confirmReward.id] || 0) + 1,
      }))
      setConfirmReward(null)
      setMessage({ type: 'success', text: `✓ „${confirmReward.title}" eingelöst!` })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Failed to redeem reward:', error)
      setConfirmReward(null)
      setMessage({ type: 'error', text: 'Ups, das hat nicht geklappt. Versuch es nochmal!' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setRedeemingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[24px] font-black text-ink">🎁 Belohnungen</h1>

      <div className="rounded-[16px] bg-white p-4 shadow-sm">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
          Einlösbare XP
        </p>
        <p className="text-[24px] font-black text-ink tabular-nums">
          {spendable} <span className="text-[13px] font-bold text-ink-soft">von {member?.xp || 0} XP</span>
        </p>
        <p className="mt-1 text-[11px] font-semibold text-ink-soft">
          Beim Einlösen wird der Betrag von deinen einlösbaren XP abgezogen.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-2xl px-3 py-2 text-center text-[13px] font-bold ${
            message.type === 'success'
              ? 'bg-wash-teal text-teal'
              : 'bg-wash-coral text-rose-deep'
          }`}
        >
          {message.text}
        </div>
      )}

      {rewards.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="mb-2 text-[48px]">⏳</p>
          <p className="text-[16px] font-bold text-ink-soft">Noch keine Belohnungen</p>
          <p className="text-[13px] text-ink-soft">Deine Familie kann bald welche anlegen!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rewards.map((reward) => {
            const weekCount = weeklyCounts[reward.id] || 0
            const maxWeekly = reward.max_redemptions_per_week ?? 0
            const limitReached = maxWeekly > 0 && weekCount >= maxWeekly
            const affordable = spendable >= reward.xp_cost
            return (
              <div key={reward.id} className="rounded-[18px] bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[15px] font-extrabold text-ink">🎁 {reward.title}</p>
                  <p className="text-[14px] font-black text-coral tabular-nums">
                    {reward.xp_cost} XP
                  </p>
                </div>
                <p className="mb-3 text-[12px] font-semibold text-ink-soft">
                  diese Woche: {weekCount}
                  {maxWeekly > 0 ? `/${maxWeekly}` : ''}
                  {limitReached && ' · Limit erreicht'}
                </p>
                <button
                  onClick={() => setConfirmReward(reward)}
                  disabled={limitReached || !affordable || redeemingId !== null}
                  className="w-full rounded-2xl bg-gradient-to-br from-coral to-coral-deep py-3.5 text-[14px] font-bold text-white shadow-md transition-all active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100"
                >
                  {limitReached
                    ? 'Diese Woche fertig'
                    : affordable
                    ? 'Einlösen'
                    : `Noch ${reward.xp_cost - spendable} XP nötig`}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Confirm dialog */}
      {confirmReward && (
        <div role="dialog" aria-modal="true" aria-labelledby="redeem-reward-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-6 w-full max-w-sm rounded-[24px] bg-white p-8 text-center shadow-2xl">
            <div className="mb-4 text-[48px]">🎁</div>
            <h2 id="redeem-reward-title" className="mb-2 text-[20px] font-black text-ink">Einlösen?</h2>
            <p className="mb-6 text-[14px] text-ink-soft">
              <span className="font-black text-ink">{confirmReward.title}</span> kostet{' '}
              <span className="font-black text-coral">{confirmReward.xp_cost} XP</span>.
              Danach bleiben dir{' '}
              <span className="font-black text-ink">
                {Math.max(0, spendable - confirmReward.xp_cost)} XP
              </span>{' '}
              zum Einlösen.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleConfirm}
                disabled={redeemingId !== null}
                className="rounded-2xl bg-gradient-to-br from-coral to-coral-deep py-3 text-[14px] font-bold text-white shadow-md transition-all active:scale-[0.97] disabled:opacity-40"
              >
                {redeemingId !== null ? 'Läuft…' : 'Ja, einlösen!'}
              </button>
              <button
                onClick={() => setConfirmReward(null)}
                disabled={redeemingId !== null}
                className="rounded-2xl bg-wash-plum py-3 text-[14px] font-bold text-ink-soft transition-all active:scale-[0.97]"
              >
                Später
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}