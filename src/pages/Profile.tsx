import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getLevelFromXp, calculateScreenTimeRedeem } from '../lib/gamification'
import { updateMember } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { LogOut, Trophy, Flame, Star, Calendar, Clock } from 'lucide-react'

export function Profile() {
  const { member, family, signOut } = useAuth()
  const levelInfo = getLevelFromXp(member?.xp || 0)
  const [showRedeemDialog, setShowRedeemDialog] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const redeemable = Math.max(0, (member?.xp || 0) - (member?.xp_redeemed || 0))

  const handleRedeem = async () => {
    if (!member || redeemable <= 0) return
    setRedeeming(true)
    try {
      const { minutes, newRedeemed, newBalance } = calculateScreenTimeRedeem(
        member.xp,
        member.xp_redeemed,
        member.screen_time_balance
      )
      const { data: updated, error } = await updateMember(member.id, {
        xp_redeemed: newRedeemed,
        screen_time_balance: newBalance,
      })
      if (error || !updated) {
        throw new Error('updateMember failed')
      }
      useAuthStore.getState().setMember(updated)
      setShowRedeemDialog(false)
      setSuccessMessage(`✓ ${minutes} Minuten eingelöst!`)
      window.setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Failed to redeem screen time:', error)
      setShowRedeemDialog(false)
      setSuccessMessage('Ups, das hat nicht geklappt. Versuch es nochmal!')
    } finally {
      setRedeeming(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[24px] font-black text-ink">👤 Profil</h1>

      {/* Avatar + Name */}
      <div className="flex flex-col items-center rounded-[24px] bg-white p-6 shadow-sm">
        <div
          className="mb-3 flex h-20 w-20 items-center justify-center rounded-full text-[36px] text-white shadow-md"
          style={{ backgroundColor: member?.color || '#FF7A5C' }}
        >
          {member?.name?.[0]?.toUpperCase() || '🥷'}
        </div>
        <p className="text-[20px] font-black text-ink">{member?.name || 'Ninja'}</p>
        <p className="text-[13px] font-semibold text-ink-soft">{family?.name || 'Familie'}</p>
        <div className="mt-2 flex items-center gap-1.5 rounded-full bg-wash-plum px-3 py-1">
          <span className="text-[14px]">{levelInfo.emoji}</span>
          <span className="text-[12px] font-bold text-ink-soft">{levelInfo.name}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-[16px] bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-wash-plum">
            <Star className="h-5 w-5 text-gold-deep" />
          </div>
          <div>
            <p className="text-[18px] font-black text-ink">{member?.xp || 0}</p>
            <p className="text-[10px] font-bold text-ink-soft">Gesamt XP</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[16px] bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-wash-plum">
            <Trophy className="h-5 w-5 text-ink-soft" />
          </div>
          <div>
            <p className="text-[18px] font-black text-ink">Level {member?.level ?? 1}</p>
            <p className="text-[10px] font-bold text-ink-soft">{levelInfo.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[16px] bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-wash-coral">
            <Flame className="h-5 w-5 text-rose-deep" />
          </div>
          <div>
            <p className="text-[18px] font-black text-ink">{member?.streak || 0}</p>
            <p className="text-[10px] font-bold text-ink-soft">Aktueller Streak</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[16px] bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-wash-teal">
            <Calendar className="h-5 w-5 text-teal" />
          </div>
          <div>
            <p className="text-[18px] font-black text-ink">{member?.longest_streak || 0}</p>
            <p className="text-[10px] font-bold text-ink-soft">Bester Streak</p>
          </div>
        </div>
      </div>

      {/* Bildschirmzeit */}
      <div className="rounded-[16px] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-wash-teal">
            <Clock className="h-5 w-5 text-teal" />
          </div>
          <div>
            <p className="text-[18px] font-black text-ink">
              {member?.screen_time_balance || 0} Minuten
            </p>
            <p className="text-[10px] font-bold text-ink-soft">Bildschirmzeit</p>
          </div>
        </div>
        <p className="mb-3 text-[12px] font-semibold text-ink-soft">
          {redeemable > 0
            ? `Einlösbar: ${redeemable} Min`
            : 'Alles eingelöst — erst fleißig sein, dann einlösen!'}
        </p>
        {successMessage && (
          <p className="mb-3 rounded-2xl bg-wash-teal px-3 py-2 text-center text-[13px] font-bold text-teal">
            {successMessage}
          </p>
        )}
        <button
          onClick={() => setShowRedeemDialog(true)}
          disabled={redeemable <= 0}
          className={`w-full rounded-2xl bg-gradient-to-br from-teal to-teal-deep py-4 text-[14px] font-bold text-white shadow-md transition-all active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100 ${
            redeemable > 0 ? 'animate-pulse' : ''
          }`}
        >
          Jetzt einlösen
        </button>
      </div>

      {/* Role */}
      <div className="rounded-[16px] bg-white p-4 shadow-sm">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft">Rolle</p>
        <p className="text-[16px] font-extrabold text-ink">
          {member?.role === 'parent' ? '👨‍👩‍👧 Elternteil' : '🥷 Kind'}
        </p>
      </div>

      {/* Sign Out */}
      <button
        onClick={signOut}
        className="flex items-center justify-center gap-2 rounded-[16px] border-2 border-rose-deep/20 bg-white py-4 text-[14px] font-bold text-rose-deep transition-all hover:bg-wash-coral active:scale-[0.97]"
      >
        <LogOut className="h-4 w-4" />
        Abmelden
      </button>

      {/* Einlösen-Dialog */}
      {showRedeemDialog && (
        <div role="dialog" aria-modal="true" aria-labelledby="redeem-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-6 w-full max-w-sm rounded-[24px] bg-white p-8 text-center shadow-2xl">
            <div className="mb-4 text-[48px]">📺</div>
            <h2 id="redeem-title" className="mb-2 text-[20px] font-black text-ink">
              Bildschirmzeit einlösen?
            </h2>
            <p className="mb-6 text-[14px] text-ink-soft">
              Du bekommst{' '}
              <span className="font-black text-teal">{redeemable} Minuten</span> extra.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleRedeem}
                disabled={redeeming}
                className="rounded-2xl bg-gradient-to-br from-teal to-teal-deep py-3 text-[14px] font-bold text-white shadow-md transition-all active:scale-[0.97] disabled:opacity-40"
              >
                {redeeming ? 'Läuft…' : 'Ja, einlösen!'}
              </button>
              <button
                onClick={() => setShowRedeemDialog(false)}
                disabled={redeeming}
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
