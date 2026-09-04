import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getFamilyTasks, getFamilyMembers } from '../lib/supabase'
import { getTaskStatus } from '../lib/tasks'
import type { TaskRow, MemberRow } from '../types/supabase'
import { ArrowLeft, Zap, Check, Clock, RotateCcw } from 'lucide-react'

export function SessionSelect() {
  const navigate = useNavigate()
  const family = useAuthStore((s) => s.family)
  const member = useAuthStore((s) => s.member)
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [mode, setMode] = useState<'timer' | 'free'>('timer')
  const [members, setMembers] = useState<MemberRow[]>([])

  useEffect(() => {
    if (!family) return
    getFamilyTasks(family.id).then(({ data }) => {
      if (data) setTasks(data as TaskRow[])
    })
    getFamilyMembers(family.id).then(({ data }) => {
      if (data) setMembers(data as MemberRow[])
    })
  }, [family])

  const getAssigneeName = (task: TaskRow) => {
    if (task.assignee_id == null) return ''
    return members.find((m) => m.id === task.assignee_id)?.name ?? 'jemand'
  }

  const toggleTask = (id: number) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    const status = getTaskStatus(task, member?.id ?? -1, getAssigneeName(task))
    if (!status.available) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 3) next.add(id)
      return next
    })
  }

  const handleStart = () => {
    const selectedTasks = tasks.filter((t) => selected.has(t.id))
    if (mode === 'free') {
      navigate('/session/free', { state: { tasks: selectedTasks } })
    } else {
      navigate('/session/active', { state: { tasks: selectedTasks } })
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-sun px-5 pb-6 pt-6">
      <div className="mb-1">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-4 flex items-center gap-1 text-[13px] font-bold text-ink-soft"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </button>
        <h1 className="text-[24px] font-black text-ink">🧹 Was machen wir?</h1>
        <p className="mt-1 text-[14px] font-semibold text-ink-soft">
          Tipp Aufgaben an
        </p>
      </div>

      {/* Mode Selector */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setMode('timer')}
          aria-pressed={mode === 'timer'}
          className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-bold transition ${
            mode === 'timer'
              ? 'bg-coral text-white shadow-md'
              : 'bg-white text-ink-soft'
          }`}
        >
          <Clock className="h-4 w-4" />
          5-Min Timer
        </button>
        <button
          onClick={() => setMode('free')}
          aria-pressed={mode === 'free'}
          className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-bold transition ${
            mode === 'free'
              ? 'bg-teal text-white shadow-md'
              : 'bg-white text-ink-soft'
          }`}
        >
          <RotateCcw className="h-4 w-4" />
          Frei
        </button>
      </div>

      {mode === 'free' && (
        <p className="mt-2 text-center text-[11px] font-semibold text-ink-soft">
          So lange du magst – ohne Timer
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        {tasks.map((task) => {
          const isSelected = selected.has(task.id)
          const status = getTaskStatus(task, member?.id ?? -1, getAssigneeName(task))
          const disabled = !status.available
          return (
            <button
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className={`overflow-hidden rounded-[20px] border-[3px] bg-white text-left transition-all active:scale-[0.97] ${
                disabled
                  ? 'border-transparent opacity-40 saturate-0'
                  : isSelected
                  ? 'border-coral shadow-[0_4px_20px_rgba(255,122,92,0.25)]'
                  : 'border-transparent shadow-sm'
              }`}
            >
              <div className="flex aspect-square items-center justify-center bg-wash-plum">
                {task.image_url ? (
                  <img
                    src={task.image_url}
                    alt={task.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[48px]">{task.emoji}</span>
                )}
              </div>
              <div className="flex flex-col gap-1 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-extrabold text-ink">
                    {task.title}
                  </span>
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[2.5px] transition-all ${
                      isSelected
                        ? 'border-coral bg-coral text-white'
                        : 'border-ink-soft'
                    }`}
                  >
                    {isSelected && <Check className="h-5 w-5" strokeWidth={3} />}
                  </div>
                </div>
                {disabled && status.available === false && (
                  <span className="text-[11px] font-bold text-ink-soft">
                    {status.label}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {tasks.length === 0 && (
        <div className="mt-16 text-center">
          <p className="mb-2 text-[48px]">📭</p>
          <p className="text-[16px] font-bold text-ink-soft">
            Keine Aufgaben im Backlog
          </p>
        </div>
      )}

      {selected.size > 0 && (
        <div className="mt-auto pt-4">
          <button
            onClick={handleStart}
            className={`flex w-full items-center justify-center gap-3 rounded-2xl py-[18px] text-[18px] font-black text-white transition-transform active:scale-[0.97] ${
              mode === 'timer'
                ? 'bg-gradient-to-br from-coral to-coral-deep shadow-[0_6px_20px_rgba(255,122,92,0.35)]'
                : 'bg-gradient-to-br from-teal to-teal-deep shadow-[0_6px_20px_rgba(47,182,164,0.35)]'
            }`}
          >
            <Zap className="h-6 w-6" strokeWidth={2.5} />
            {selected.size} Aufgabe{selected.size !== 1 ? 'n' : ''} {mode === 'timer' ? 'starten' : 'frei'}
          </button>
        </div>
      )}
    </div>
  )
}
