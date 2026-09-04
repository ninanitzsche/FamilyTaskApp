import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { TaskRow } from '../types/supabase'
import { saveSessionState, clearSessionState } from '../lib/sessionState'
import { useAuthStore } from '../store/authStore'
import { CameraCapture } from '../components/CameraCapture'
import { Check, Flag, Camera } from 'lucide-react'

export function SessionFree() {
  const navigate = useNavigate()
  const location = useLocation()
  const tasks = (location.state?.tasks ?? []) as TaskRow[]
  const resumeCompleted = (location.state?.completedTaskIds ?? []) as number[]
  const resumeElapsed = (location.state?.elapsed ?? 0) as number
  const resumeBeforePhoto = (location.state?.beforePhoto ?? null) as string | null
  const [completed, setCompleted] = useState<Set<number>>(new Set(resumeCompleted))
  const [elapsed, setElapsed] = useState(resumeElapsed)
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

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Save state to localStorage periodically
  useEffect(() => {
    if (tasks.length === 0) return
    saveSessionState({
      tasks,
      completedTaskIds: Array.from(completed),
      elapsed,
      mode: 'free',
      startedAt: new Date(Date.now() - elapsed * 1000).toISOString(),
      beforePhoto,
    }, member?.id)
  }, [tasks, completed, elapsed, beforePhoto, member?.id])

  const allDone = completed.size === tasks.length && tasks.length > 0

  const handleFinish = () => {
    clearSessionState(member?.id)
    const completedTasks = tasks.filter((t) => completed.has(t.id))
    navigate('/session/result', {
      state: {
        tasks,
        completedTaskIds: Array.from(completed),
        completedTasks,
        duration: Math.max(1, elapsed),
        allCompleted: completed.size === tasks.length,
        beforePhoto,
      },
    })
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

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  const handleCancel = () => {
    clearSessionState(member?.id)
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-sun px-5 pb-6 pt-10">
      {/* Zurück-Button */}
      <button
        onClick={() => setShowCancelDialog(true)}
        className="fixed left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-ink-soft shadow-sm backdrop-blur transition-all active:scale-95 hover:bg-white"
        aria-label="Session abbrechen"
      >
        <span className="text-[20px] leading-none">✕</span>
      </button>

      <p className="mb-2 text-[12px] font-semibold text-ink-soft">
        Aufgaben abhaken wenn fertig
      </p>

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
              <Camera className="h-4 w-4 text-teal" />
            </div>
            <span className="text-[12px] font-bold text-ink">Vorher-Foto 📸</span>
          </>
        )}
      </button>

      <div className="mb-4 text-center">
        <div className="text-[48px] font-black leading-none tabular-nums tracking-tight text-ink">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
        <p className="mt-1 text-[13px] font-semibold text-ink-soft">
          {allDone
            ? 'Alles geschafft! 🎉'
            : elapsed >= 300
            ? `Super Fokus! Das sind schon ${minutes} Minuten! 🧠`
            : `${completed.size} von ${tasks.length} erledigt`}
        </p>
      </div>

      <div className="mb-6 h-[6px] w-full max-w-[260px] overflow-hidden rounded-[3px] bg-wash-plum">
        <div
          className="h-full rounded-[3px] bg-gradient-to-r from-teal to-teal-deep transition-all duration-300"
          style={{ width: `${tasks.length > 0 ? (completed.size / tasks.length) * 100 : 0}%` }}
        />
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        {tasks.map((task) => {
          const done = completed.has(task.id)
          return (
            <button
              key={task.id}
              onClick={() => toggleCompleted(task.id)}
              className={`flex items-center gap-4 rounded-[16px] border-[2px] p-3.5 text-left transition-all active:scale-[0.98] ${
                done
                  ? 'border-teal bg-wash-teal '
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
              {done && (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal">
                  <Check className="h-5 w-5 text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-auto w-full pt-6">
        <button
          onClick={handleFinish}
          disabled={completed.size === 0}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-teal to-teal-deep py-[18px] text-[18px] font-black text-white shadow-[0_6px_20px_rgba(47,182,164,0.35)] transition-transform active:scale-[0.97] disabled:opacity-40"
        >
          <Flag className="h-5 w-5" strokeWidth={2.5} />
          {allDone ? 'Alles geschafft!' : 'Fertig!'}
        </button>
      </div>

      {/* Abbruch-Dialog */}
      {showCancelDialog && (
        <div role="dialog" aria-modal="true" aria-labelledby="free-cancel-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-6 w-full max-w-sm rounded-[24px] bg-white p-8 text-center shadow-2xl">
            <div className="mb-4 text-[48px]">🛑</div>
            <h2 id="free-cancel-title" className="mb-2 text-[20px] font-black text-ink">
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
