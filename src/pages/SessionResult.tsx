import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { createSession, updateMember, updateTask, updateSession, getCurrentWeekMission, updateWeeklyMission } from '../lib/supabase'
import { getLevelFromXp, calculateStreak } from '../lib/gamification'
import { completeTaskRow } from '../lib/tasks'
import { CameraCapture } from '../components/CameraCapture'
import { Camera } from 'lucide-react'
import type { TaskRow, SessionRow } from '../types/supabase'

const XP_PER_TASK = 10
const XP_BONUS_ALL_COMPLETED = 5
const XP_PER_OVERTIME_MINUTE = 5
const TARGET_DURATION = 5 * 60

type PhotoSlot = 'before' | 'after'

function useAnimatedNumber(target: number, durationMs = 1500) {
  const [displayed, setDisplayed] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (target === 0) return
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / durationMs, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, durationMs])

  return displayed
}

export function SessionResult() {
  const navigate = useNavigate()
  const location = useLocation()
  const family = useAuthStore((s) => s.family)
  const member = useAuthStore((s) => s.member)
  const setMember = useAuthStore((s) => s.setMember)
  const [saving, setSaving] = useState(true)
  const [sessionRow, setSessionRow] = useState<SessionRow | null>(null)
  const [cameraSlot, setCameraSlot] = useState<PhotoSlot | null>(null)
  const beforeFromState = (location.state?.beforePhoto as string | null) ?? null
  const [beforePhoto, setBeforePhoto] = useState<string | null>(beforeFromState)
  const [afterPhoto, setAfterPhoto] = useState<string | null>(null)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [beforeSaved, setBeforeSaved] = useState(false)
  const [afterSaved, setAfterSaved] = useState(false)
  const [levelUpInfo, setLevelUpInfo] = useState<{ emoji: string; name: string } | null>(null)
  const savedRef = useRef(false)

  const tasks = (location.state?.tasks ?? []) as TaskRow[]
  const completedTaskIds = (location.state?.completedTaskIds ?? []) as number[]
  const duration = (location.state?.duration ?? 0) as number
  const allCompleted = (location.state?.allCompleted ?? false) as boolean

  const completedTasks = tasks.filter((t) => completedTaskIds.includes(t.id))
  const overtimeMinutes = Math.max(0, Math.floor((duration - TARGET_DURATION) / 60))
  const xpOvertime = overtimeMinutes * XP_PER_OVERTIME_MINUTE
  const xpEarned = completedTasks.length * XP_PER_TASK + (allCompleted && completedTasks.length > 0 ? XP_BONUS_ALL_COMPLETED : 0) + xpOvertime

  const animatedXp = useAnimatedNumber(saving ? 0 : xpEarned, 1500)

  useEffect(() => {
    if (savedRef.current) return
    savedRef.current = true
    if (!family || !member || !duration) {
      setSaving(false)
      return
    }

    const save = async () => {
      try {
        const currentMember = useAuthStore.getState().member
        if (!currentMember) {
          setSaving(false)
          return
        }

        const oldLevel = currentMember.level

        const { data: session } = await createSession({
          family_id: family.id,
          member_id: currentMember.id,
          duration,
          task_ids: tasks.map((t) => t.id),
          completed_task_ids: completedTaskIds,
          xp_earned: xpEarned,
        })

        if (session) {
          setSessionRow(session as SessionRow)
          // Upload the before-photo (taken at session start) as soon as the
          // session row exists. This is the single upload point for it.
          if (beforeFromState) {
            const { uploadPhoto } = await import('../lib/storage')
            const uploadedUrl = await uploadPhoto(family.id, session.id, 'before', beforeFromState)
            const photoUrl = uploadedUrl ?? beforeFromState
            setBeforePhoto(photoUrl)
            if (uploadedUrl) {
              await updateSession(session.id, { before_photo: photoUrl })
              setBeforeSaved(true)
            }
          }
        }

        const newXp = currentMember.xp + xpEarned
        const newLevelInfo = getLevelFromXp(newXp)
        const newLevel = newLevelInfo.level
        const now = new Date().toISOString()

        const { streak: newStreak, longestStreak: newLongestStreak } = calculateStreak(
          currentMember.last_session_at,
          currentMember.streak,
          currentMember.longest_streak
        )

        const { data: updated } = await updateMember(currentMember.id, {
          xp: newXp,
          level: newLevel,
          streak: newStreak,
          longest_streak: newLongestStreak,
          last_session_at: now,
        })

        if (updated) {
          setMember(updated as any)
        }

        // Check for level-up
        if (newLevel > oldLevel) {
          setLevelUpInfo({ emoji: newLevelInfo.emoji, name: newLevelInfo.name })
          setShowLevelUp(true)
        }

        for (const taskId of completedTaskIds) {
          const task = tasks.find((t) => t.id === taskId)
          if (task) {
            await updateTask(taskId, completeTaskRow(task, now))
          }
        }

        // Update weekly mission progress
        const { data: currentMission } = await getCurrentWeekMission(family.id)
        if (currentMission) {
          const mission = currentMission as { id: number; task_ids: number[]; member_progress: Record<string, number>; target_completions: number }
          const memberIdStr = String(currentMember.id)
          const currentProgress = mission.member_progress?.[memberIdStr] || 0
          const missionTasksCompleted = completedTaskIds.filter((id) => mission.task_ids.includes(id)).length

          if (missionTasksCompleted > 0) {
            const newProgress = currentProgress + missionTasksCompleted
            const updates: Record<string, unknown> = { member_progress: { ...mission.member_progress, [memberIdStr]: newProgress } }

            // Award +50 XP bonus if mission just completed
            if (newProgress >= mission.target_completions && currentProgress < mission.target_completions) {
              const bonusXp = newXp + 50
              const bonusLevel = getLevelFromXp(bonusXp).level
              const { data: bonusUpdated } = await updateMember(currentMember.id, { xp: bonusXp, level: bonusLevel })
              if (bonusUpdated) {
                setMember(bonusUpdated as any)
              }
            }

            await updateWeeklyMission(mission.id, updates)
          }
        }
      } catch (error) {
        console.error('Failed to save session:', error)
        setSaving(false)
        navigate('/dashboard', { replace: true })
      }
    }

    save().finally(() => setSaving(false))
  }, [])

  const handlePhotoCapture = async (dataUrl: string) => {
    if (!sessionRow || !family || !cameraSlot) return

    try {
      const { uploadPhoto } = await import('../lib/storage')
      const uploadedUrl = await uploadPhoto(family.id, sessionRow.id, cameraSlot, dataUrl)

      if (cameraSlot === 'before') {
        const photoUrl = uploadedUrl ?? dataUrl
        setBeforePhoto(photoUrl)
        if (uploadedUrl) {
          await updateSession(sessionRow.id, { before_photo: photoUrl })
          setBeforeSaved(true)
        }
      } else if (cameraSlot === 'after') {
        const photoUrl = uploadedUrl ?? dataUrl
        setAfterPhoto(photoUrl)
        if (uploadedUrl) {
          await updateSession(sessionRow.id, { after_photo: photoUrl })
          setAfterSaved(true)
        }
      }
    } catch (err) {
      console.error('Failed to save photo:', err)
    } finally {
      setCameraSlot(null)
    }
  }

  const hasPhotos = beforeSaved || afterSaved

  useEffect(() => {
    if (saving || cameraSlot) return
    let timer = setTimeout(() => navigate('/dashboard', { replace: true }), 30000)
    const resetOnFocus = () => {
      if (document.visibilityState !== 'visible') return
      clearTimeout(timer)
      timer = setTimeout(() => navigate('/dashboard', { replace: true }), 30000)
    }
    document.addEventListener('visibilitychange', resetOnFocus)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', resetOnFocus)
    }
  }, [saving, cameraSlot, navigate])

  return (
    <div className="flex min-h-screen flex-col items-center bg-sun px-6 pt-12 pb-24 text-center">
      {saving ? (
        <div className="mb-4 text-[64px] animate-bounce">⏳</div>
      ) : (
        <>
          <div className="mb-3 text-[80px]">
            {allCompleted ? '🎉' : completedTasks.length > 0 ? '👏' : '💪'}
          </div>

          <h1 className="mb-1 text-[28px] font-black text-ink">
            {allCompleted
              ? 'Alles geschafft!'
              : completedTasks.length > 0
              ? 'Super gemacht!'
              : 'Jeder Schritt zählt!'}
          </h1>

          <p className="mb-6 text-[14px] font-semibold text-ink-soft">
            {allCompleted
              ? 'Du bist ein Star! ⭐'
              : completedTasks.length > 0
              ? `${completedTasks.length} von ${tasks.length} erledigt — weiter so! 💪`
              : 'Du hast angefangen, das ist das Wichtigste! 🌱'}
          </p>

          {completedTasks.length > 0 && (
            <div className="mb-6 flex flex-wrap justify-center gap-2">
              {completedTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 min-h-[44px] shadow-sm"
                >
                  {t.image_url ? (
                    <img src={t.image_url} alt={t.title} className="h-8 w-8 rounded-xl object-cover" />
                  ) : (
                    <span className="text-[18px]">{t.emoji}</span>
                  )}
                  <span className="text-[14px] font-bold text-ink">{t.title}</span>
                  {t.current_streak > 1 && (
                    <span className="text-[12px] font-bold text-rose-deep">
                      🔥 {t.current_streak}T
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Before / After Photos */}
          {completedTasks.length > 0 && (
            <div className="mb-6 w-full max-w-sm">
              <p className="mb-3 text-[14px] font-bold text-ink">
                Vorher / Nachher Foto?
              </p>

              <div className="flex gap-3">
                {/* Before slot */}
                <button
                  onClick={() => !saving && setCameraSlot('before')}
                  disabled={saving}
                  className="flex flex-1 flex-col items-center gap-2 rounded-[20px] border-2 border-dashed border-ink-soft bg-white p-4 transition-all active:scale-95 disabled:opacity-50"
                >
                  {beforePhoto ? (
                    <img
                      src={beforePhoto}
                      alt="Vorher"
                      className="h-24 w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-full items-center justify-center rounded-2xl bg-wash-plum">
                      <Camera className="h-8 w-8 text-ink-soft" />
                    </div>
                  )}
                  <span className="text-[12px] font-bold text-ink-soft">Vorher</span>
                </button>

                {/* After slot */}
                <button
                  onClick={() => !saving && setCameraSlot('after')}
                  disabled={saving}
                  className="flex flex-1 flex-col items-center gap-2 rounded-[20px] border-2 border-dashed border-ink-soft bg-white p-4 transition-all active:scale-95 disabled:opacity-50"
                >
                  {afterPhoto ? (
                    <img
                      src={afterPhoto}
                      alt="Nachher"
                      className="h-24 w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-full items-center justify-center rounded-2xl bg-wash-plum">
                      <Camera className="h-8 w-8 text-ink-soft" />
                    </div>
                  )}
                  <span className="text-[12px] font-bold text-ink-soft">Nachher</span>
                </button>
              </div>

              {hasPhotos && (
                <p className="mt-2 text-[12px] font-semibold text-teal">
                  ✓ Fotos gespeichert
                </p>
              )}
            </div>
          )}

          <div className="mb-6 rounded-[20px] bg-gradient-to-br from-gold to-sunset px-8 py-5 shadow-[0_8px_24px_rgba(255,215,0,0.25)]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink/80">
              XP verdient
            </p>
            <p className="text-[48px] font-black text-ink tabular-nums">
              +{animatedXp}
            </p>
            {allCompleted && (
              <p className="text-[12px] font-bold text-ink/80">
                +5 Bonus für alles geschafft!
              </p>
            )}
            {xpOvertime > 0 && (
              <p className="text-[12px] font-bold text-ink/80">
                +{xpOvertime} Bonus für Extra-Fokus!
              </p>
            )}
          </div>

          <button
            onClick={() => navigate('/dashboard', { replace: true })}
            className="mt-2 rounded-2xl bg-ink px-8 py-3 text-[14px] font-bold text-white shadow-lg transition-all active:scale-95"
          >
            Weiter zum Dashboard
          </button>

          {tasks.length > 0 && (
            <button
              onClick={() => {
                const route = duration > 0 ? '/session/active' : '/session/free'
                navigate(route, { state: { tasks }, replace: true })
              }}
              className="mt-3 rounded-2xl border-2 border-coral bg-white px-8 py-3 text-[14px] font-bold text-coral transition-all active:scale-95"
            >
              🔄 Nochmal versuchen!
            </button>
          )}

          <p className="mt-2 text-[12px] text-ink-soft">
            oder automatisch in 30 Sekunden
          </p>
        </>
      )}

      {cameraSlot && (
        <CameraCapture onCapture={handlePhotoCapture} onClose={() => setCameraSlot(null)} />
      )}

      {/* Level-Up Modal */}
      {showLevelUp && levelUpInfo && (
        <div role="dialog" aria-modal="true" aria-labelledby="levelup-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          {/* Firework particles */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {[...Array(24)].map((_, i) => {
              const angle = (i / 24) * 360
              const delay = Math.random() * 0.4
              const distance = 100 + Math.random() * 120
              const colors = ['#FFD700', '#FF6B6B', '#6C5CE7', '#00A381', '#FF8E53', '#55EFC4']
              const color = colors[i % colors.length]
              return (
                <div
                  key={i}
                  className="absolute left-1/2 top-1/2 h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: color,
                    animation: `firework-${i % 4} 1.2s ${delay}s ease-out forwards`,
                    ['--tx' as string]: `${Math.cos((angle * Math.PI) / 180) * distance}px`,
                    ['--ty' as string]: `${Math.sin((angle * Math.PI) / 180) * distance}px`,
                  }}
                />
              )
            })}
          </div>

          <div
            className="mx-6 w-full max-w-sm rounded-[28px] bg-white p-8 text-center shadow-2xl"
            onClick={() => setShowLevelUp(false)}
          >
            <p className="mb-2 text-[14px] font-bold uppercase tracking-wider text-gold-deep">
              LEVEL UP!
            </p>
            <div className="mb-3 text-[72px] animate-bounce">{levelUpInfo.emoji}</div>
            <h2 id="levelup-title" className="mb-1 text-[28px] font-black text-ink">
              {levelUpInfo.name}
            </h2>
            <p className="mb-4 text-[14px] font-semibold text-ink-soft">
              Du hast ein neues Level erreicht!
            </p>
            <p className="text-[12px] text-ink-soft">Tippen zum Schließen</p>
          </div>
        </div>
      )}

      {/* Firework keyframes */}
      <style>{`
        @keyframes firework-0 {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1); opacity: 0; }
        }
        @keyframes firework-1 {
          0% { transform: translate(-50%, -50%) scale(0) rotate(90deg); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.2) rotate(90deg); opacity: 0; }
        }
        @keyframes firework-2 {
          0% { transform: translate(-50%, -50%) scale(0) rotate(180deg); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.8) rotate(180deg); opacity: 0; }
        }
        @keyframes firework-3 {
          0% { transform: translate(-50%, -50%) scale(0) rotate(270deg); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.1) rotate(270deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
