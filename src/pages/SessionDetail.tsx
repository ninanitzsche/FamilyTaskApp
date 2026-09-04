import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getFamilyTasks, getMemberSessions } from '../lib/supabase'
import { splitSessionTasks } from '../lib/utils'
import { LoadingScreen } from '../components/ui/LoadingScreen'
import { SessionPhotoPair, SessionStatsRow, TaskListBlock } from '../components/sessions'
import type { SessionRow, TaskRow } from '../types/supabase'

export function SessionDetail() {
  const navigate = useNavigate()
  const { sessionId } = useParams()
  const location = useLocation()
  const { member, family } = useAuth()
  const stateSession = location.state?.session as SessionRow | undefined
  const [session, setSession] = useState<SessionRow | null>(stateSession ?? null)
  const [tasksById, setTasksById] = useState<Map<number, TaskRow>>(new Map())
  const [tasksLoaded, setTasksLoaded] = useState(false)
  const [loading, setLoading] = useState(!stateSession)

  useEffect(() => {
    if (!member || !family) return
    getFamilyTasks(family.id).then(({ data }) => {
      if (!data) return
      setTasksById(new Map((data as TaskRow[]).map((t) => [t.id, t])))
      setTasksLoaded(true)
    })
    if (stateSession) return
    getMemberSessions(member.id, 50).then(({ data }) => {
      const found = (data as SessionRow[] | null)?.find((s) => s.id === Number(sessionId))
      if (found) {
        setSession(found)
      } else {
        navigate('/achievements', { replace: true })
      }
      setLoading(false)
    })
  }, [member, family, sessionId, stateSession])

  const goBack = useCallback(() => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/achievements', { replace: true })
  }, [navigate])

  if (loading || !session) return <LoadingScreen />

  const { done, open, missingIds } = tasksLoaded
    ? splitSessionTasks(session.task_ids, session.completed_task_ids, Array.from(tasksById.values()))
    : { done: [], open: [], missingIds: [] }
  const dateLabel = new Date(session.created_at).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const allDone = session.task_ids.length > 0 && session.completed_task_ids.length === session.task_ids.length

  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col bg-sun px-5 pb-8 pt-4">
      <header className="sticky top-0 z-10 -mx-5 mb-4 flex items-center gap-3 bg-sun/95 px-5 py-3 backdrop-blur">
        <button
          onClick={goBack}
          aria-label="Zurück"
          className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-white shadow-sm transition-all active:scale-[0.96]"
        >
          <ArrowLeft className="h-5 w-5 text-ink" />
        </button>
        <h1 className="flex-1 text-[14px] font-black text-ink">{dateLabel}</h1>
      </header>

      <div className="mb-4 rounded-[20px] bg-gradient-to-br from-gold to-sunset p-6 text-ink shadow-[0_8px_24px_rgba(255,215,0,0.25)]">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink/80">XP verdient</p>
        <p className="text-[40px] font-black tabular-nums">+{session.xp_earned}</p>
        <p className="text-[12px] font-bold text-ink/85">
          {allDone
            ? 'Alle geschafft! ✅'
            : `${session.completed_task_ids.length} von ${session.task_ids.length} erledigt — weiter so! 💪`}
        </p>
      </div>

      <div className="mb-5">
        <SessionStatsRow
          duration={session.duration}
          doneCount={session.completed_task_ids.length}
          totalCount={session.task_ids.length}
          xp={session.xp_earned}
        />
      </div>

      <div className="mb-5">
        <SessionPhotoPair session={session} />
      </div>

      {tasksLoaded && (
        <div className="flex flex-col gap-5">
          <TaskListBlock heading={`✅ ERLEDIGT (${done.length})`} tasks={done} done />
          <TaskListBlock heading={`○ OFFEN (${open.length})`} tasks={open} done={false} missingIds={missingIds} />
        </div>
      )}
    </div>
  )
}