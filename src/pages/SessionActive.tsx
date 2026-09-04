import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { TaskRow } from '../types/supabase'
import { saveSessionState, clearSessionState } from '../lib/sessionState'
import { useAuthStore } from '../store/authStore'
import { CameraCapture } from '../components/CameraCapture'
import { Check, Flag, Clock, Zap, Camera } from 'lucide-react'

const TARGET_DURATION = 5 * 60

export function SessionActive() {
  const navigate = useNavigate()
  const location = useLocation()
  const tasks = (location.state?.tasks ?? []) as TaskRow[]
  const resumeCompleted = (location.state?.completedTaskIds ?? []) as number[]
  const resumeElapsed = (location.state?.elapsed ?? 0) as number
  const resumeBeforePhoto = (location.state?.beforePhoto ?? null) as string | null
  const [elapsed, setElapsed] = useState(resumeElapsed)
  const [completed, setCompleted] = useState<Set<number>>(new Set(resumeCompleted))
  const [isFinished, setIsFinished] = useState(false)
  const [showTimeUp, setShowTimeUp] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [beforePhoto, setBeforePhoto] = useState<string | null>(resumeBeforePhoto)
  const member = useAuthStore((s) => s.member)

  useEffect(() => {
    if (tasks.length === 0) {
      navigate('/session/select', { replace: true })
      return
    }
  }, [tasks, navigate])

  // Stopwatches: count up
  useEffect(() => {
    if (isFinished) return
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isFinished])

  // Show "Zeit!" overlay after 5 minutes
  useEffect(() => {
    if (elapsed === TARGET_DURATION && !isFinished) {
      setShowTimeUp(true)
    }
  }, [elapsed, isFinished])

  // Save state to localStorage periodically
  useEffect(() => {
    if (tasks.length === 0) return
    saveSessionState({
      tasks,
      completedTaskIds: Array.from(completed),
      elapsed,
      mode: 'timer',
      startedAt: new Date(Date.now() - elapsed * 1000).toISOString(),
      beforePhoto,
    }, member?.id)
  }, [tasks, completed, elapsed, beforePhoto, member?.id])

  // Navigate to result when finished
  useEffect(() => {
    if (!isFinished) return
    const delay = setTimeout(() => {
      clearSessionState(member?.id)
      const completedTasks = tasks.filter((t) => completed.has(t.id))
      navigate('/session/result', {
        state: {
          tasks,
          completedTaskIds: Array.from(completed),
          completedTasks,
          duration: elapsed,
          allCompleted: completed.size === tasks.length,
          beforePhoto,
        },
      })
    }, 1500)
    return () => clearTimeout(delay)
  }, [isFinished, tasks, completed, elapsed, navigate, beforePhoto])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const progress = Math.min((elapsed / TARGET_DURATION) * 100, 100)
  const isOvertime = elapsed > TARGET_DURATION
  const overtimeMinutes = Math.floor((elapsed - TARGET_DURATION) / 60)

  const handleFinish = () => {
    setShowTimeUp(false)
    setIsFinished(true)
  }

  const handleContinue = () => {
    setShowTimeUp(false)
  }

  const toggleCompleted = (id: number) => {
    setCompleted((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (tasks.length === 0) return null

  const handleCancel = () => {
    clearSessionState(member?.id)
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-sun px-5 pb-6 pt-10">
      {/* Zurück-Button */}
      {!isFinished && (
        <button
          onClick={() => setShowCancelDialog(true)}
          className="fixed left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-ink-soft shadow-sm backdrop-blur transition-all active:scale-95 hover:bg-white"
          aria-label="Session abbrechen"
        >
          <span className="text-[20px] leading-none">✕</span>
        </button>
      )}

      {!isFinished && (
        <p className="mb-2 text-[12px] font-semibold text-ink-soft">
          Auf erledigte Aufgaben tippen
        </p>
      )}

      {!isFinished && (
        <button
          onClick={() => setPhotoOpen(true)}
          className="mb-4 flex items-center gap-2 self-start rounded-2xl border-2 border-ink-soft bg-white px-4 py-2.5 min-h-[44px] shadow-sm transition-all active:scale-[0.97]"
        >
          {beforePhoto ? (
            <>
              <img src={beforePhoto} alt="Vorher-Foto" className="h-8 w-8 rounded-lg object-cover" />
              <span className="text-[12px] font-bold text-ink">Foto ändern</span>
            </>
          ) : (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-wash-plum">
                <Camera className="h-4 w-4 text-coral" />
              </div>
              <span className="text-[12px] font-bold text-ink">Vorher-Foto 📸</span>
            </>
          )}
        </button>
      )}

      <div className="mb-4 text-center">
        <div className={`text-[80px] font-black leading-none tabular-nums tracking-tight ${isOvertime ? 'text-teal' : 'text-ink'}`}>
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
        <p className="mt-1 text-[13px] font-semibold text-ink-soft">
          {isFinished
            ? 'Fertig!'
            : isOvertime
            ? `Super Fokus! +${overtimeMinutes} Bonus-Minute(n) 🧠`
            : elapsed >= TARGET_DURATION
            ? 'Geschafft! Weitermachen = Bonus ⭐'
            : `${Math.max(0, TARGET_DURATION - elapsed)}s bis 5 Minuten`}
        </p>
      </div>

      <div className="mb-8 h-[6px] w-full max-w-[260px] overflow-hidden rounded-[3px] bg-wash-plum">
        <div
          className={`h-full rounded-[3px] transition-all duration-1000 ${
            isOvertime
              ? 'bg-gradient-to-r from-teal to-teal-deep'
              : 'bg-gradient-to-r from-coral to-coral-deep'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {!isFinished && (
        <button
          onClick={handleFinish}
          className="mb-6 flex items-center justify-center gap-2 rounded-2xl border-2 border-ink-soft bg-white px-6 py-3 text-[14px] font-bold text-ink-soft transition-all active:scale-[0.97] hover:border-coral hover:text-coral"
        >
          <Flag className="h-4 w-4" />
          Fertig!
        </button>
      )}

      <div className="flex w-full max-w-sm flex-col gap-3">
        {tasks.map((task) => {
          const done = completed.has(task.id)
          return (
            <button
              key={task.id}
              onClick={() => !isFinished && toggleCompleted(task.id)}
className={`flex items-center gap-4 rounded-[16px] border-[2px] p-3.5 text-left transition-all active:scale-[0.98] ${
                done
                  ? 'border-teal bg-wash-teal'
                  : isFinished
                  ? 'border-ink-soft bg-wash-plum'
                  : 'border-transparent bg-white'
              }`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-wash-plum">
                {task.image_url ? (
                  <img src={task.image_url} alt={task.title} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[24px]">{task.emoji}</span>
                )}
              </div>
              <p className="flex-1 text-[16px] font-extrabold text-ink">{task.title}</p>
              {task.current_streak > 1 && (
                <span className="shrink-0 text-[12px] font-bold text-rose-deep">
                  🔥 {task.current_streak}T
                </span>
              )}
              {done && (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal">
                  <Check className="h-5 w-5 text-white" strokeWidth={3} />
                </div>
              )}
              {isFinished && !done && (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wash-plum">
                  <span className="text-[14px] font-bold text-ink-soft">○</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {isFinished && (
        <p className="mt-6 animate-pulse text-[13px] font-semibold text-ink-soft">
          Gleich geht's weiter...
        </p>
      )}

      {/* "Zeit!" Overlay */}
      {showTimeUp && (
        <div role="dialog" aria-modal="true" aria-labelledby="timeup-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-6 w-full max-w-sm rounded-[24px] bg-white p-8 text-center shadow-2xl">
            <div className="mb-4 text-[64px]">⏰</div>
            <h2 id="timeup-title" className="mb-2 text-[24px] font-black text-ink">
              5 Minuten geschafft!
            </h2>
            <p className="mb-2 text-[14px] text-ink-soft">
              Du hast {completed.size} von {tasks.length} Aufgaben erledigt!
            </p>
            {isOvertime && (
              <p className="mb-4 text-[13px] font-bold text-teal">
                <Zap className="mr-1 inline h-4 w-4" />
                +{overtimeMinutes * 5} Bonus-XP für {overtimeMinutes} Extra-Minute(n)!
              </p>
            )}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleContinue}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-coral to-coral-deep py-4 text-[16px] font-black text-white shadow-lg transition-all active:scale-[0.97]"
              >
                <Clock className="h-5 w-5" />
                Weitermachen! ⭐
              </button>
              <button
                onClick={handleFinish}
                className="rounded-2xl bg-wash-plum py-3 text-[14px] font-bold text-ink-soft transition-all active:scale-[0.97]"
              >
                Nein, ich bin fertig
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Abbruch-Dialog */}
      {showCancelDialog && (
        <div role="dialog" aria-modal="true" aria-labelledby="cancel-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-6 w-full max-w-sm rounded-[24px] bg-white p-8 text-center shadow-2xl">
            <div className="mb-4 text-[48px]">🛑</div>
            <h2 id="cancel-title" className="mb-2 text-[20px] font-black text-ink">
              Session abbrechen?
            </h2>
            <p className="mb-6 text-[14px] text-ink-soft">
              Dein Fortschritt wird nicht gespeichert.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowCancelDialog(false)}
                className="rounded-2xl bg-gradient-to-br from-coral to-coral-deep py-3 text-[14px] font-bold text-white shadow-md transition-all active:scale-[0.97]"
              >
                Nein, weitermachen!
              </button>
              <button
                onClick={handleCancel}
                className="rounded-2xl bg-wash-plum py-3 text-[14px] font-bold text-rose-deep transition-all active:scale-[0.97]"
              >
                Ja, abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    {/* Vorher-Foto Overlay */}
      {photoOpen && (
        <CameraCapture
          onCapture={(dataUrl) => {
            setBeforePhoto(dataUrl)
            setPhotoOpen(false)
          }}
          onClose={() => setPhotoOpen(false)}
        />
      )}
    </div>
  )
}
