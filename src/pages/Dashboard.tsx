import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../store/authStore'
import { getMemberSessions, getFamilyTasks, getFamilyMembers } from '../lib/supabase'
import type { SessionRow, TaskRow, MemberRow } from '../types/supabase'
import { Zap, Flame, Trophy, Star } from 'lucide-react'
import { getLevelFromXp, getStreakSaveInfo, getCurrentWeekKey } from '../lib/gamification'
import { getMondayOf } from '../lib/utils'
import { updateMember } from '../lib/supabase'
import { loadSessionState, clearSessionState } from '../lib/sessionState'
import { getDueTask, getDaysAgoLabel } from '../lib/tasks'
import { WeeklyMission } from '../components/WeeklyMission'

export function Dashboard() {
  const navigate = useNavigate()
  const { member, family } = useAuth()
  const [todayXp, setTodayXp] = useState(0)
  const [todayCompleted, setTodayCompleted] = useState(0)
  const [pendingSession, setPendingSession] = useState<ReturnType<typeof loadSessionState> | null>(null)
  const [weekProgress, setWeekProgress] = useState<{ last: number; this: number } | null>(null)
  const [dueTask, setDueTask] = useState<TaskRow | null>(null)

  const levelInfo = getLevelFromXp(member?.xp || 0)
  const streakSaveInfo = getStreakSaveInfo(
    member?.role || 'child',
    member?.streak_saves_used || 0,
    member?.streak_save_week || null
  )

  const handleStreakSave = async () => {
    if (!member || !streakSaveInfo.canSave) return
    const currentWeek = getCurrentWeekKey()
    const { data: updated } = await updateMember(member.id, {
      streak_saves_used: streakSaveInfo.used + 1,
      streak_save_week: currentWeek,
      last_session_at: new Date().toISOString(),
    })
    if (updated) {
      useAuthStore.getState().setMember(updated as any)
    }
  }

  useEffect(() => {
    if (!member || !family) return
    getMemberSessions(member.id, 50).then(({ data }) => {
      if (!data) return
      const sessions = data as SessionRow[]

      // Today stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todaySessions = sessions.filter((s) => new Date(s.created_at) >= today)
      setTodayXp(todaySessions.reduce((sum, s) => sum + s.xp_earned, 0))
      setTodayCompleted(todaySessions.reduce((sum, s) => sum + s.completed_task_ids.length, 0))

      // Week progress: last week vs this week
      const now = new Date()
      const thisMonday = getMondayOf(now)
      const lastMonday = new Date(thisMonday)
      lastMonday.setDate(thisMonday.getDate() - 7)

      const thisWeek = sessions.filter((s) => new Date(s.created_at) >= thisMonday)
      const lastWeek = sessions.filter((s) => {
        const d = new Date(s.created_at)
        return d >= lastMonday && d < thisMonday
      })

      const thisWeekCompleted = thisWeek.reduce((sum, s) => sum + s.completed_task_ids.length, 0)
      const lastWeekCompleted = lastWeek.reduce((sum, s) => sum + s.completed_task_ids.length, 0)

      setWeekProgress({ last: lastWeekCompleted, this: thisWeekCompleted })
    })

    // Family tasks for "Das ist lange fällig!"
    getFamilyMembers(family.id).then(({ data }) => {
      const memberRows = (data ?? []) as MemberRow[]
      return getFamilyTasks(family.id).then(({ data: taskData }) => {
        if (!taskData) return
        const tasks = taskData as TaskRow[]
        const assigneeName = (id: number | null) =>
          memberRows.find((m) => m.id === id)?.name ?? 'jemand'
        setDueTask(getDueTask(tasks, member.id, assigneeName))
      })
    })

    // Check for pending session
    const session = loadSessionState(member?.id)
    if (session) setPendingSession(session)
  }, [member, family])

  const handleResumeSession = () => {
    if (!pendingSession) return
    clearSessionState()
    const route = pendingSession.mode === 'timer' ? '/session/active' : '/session/free'
    navigate(route, {
      state: {
        tasks: pendingSession.tasks,
        completedTaskIds: pendingSession.completedTaskIds,
        elapsed: pendingSession.elapsed,
        beforePhoto: pendingSession.beforePhoto ?? null,
      },
    })
  }

  const handleDiscardSession = () => {
    clearSessionState(member?.id)
    setPendingSession(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {pendingSession && (
        <div className="rounded-2xl border-2 border-coral bg-wash-plum p-4 shadow-sm">
          <p className="mb-2 text-[14px] font-bold text-ink">
            📍 Du hast eine Session begonnen!
          </p>
          <p className="mb-3 text-[12px] text-ink-soft">
            {pendingSession.completedTaskIds.length} von {pendingSession.tasks.length} erledigt
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleResumeSession}
              className="flex-1 rounded-xl bg-coral py-2.5 min-h-[44px] text-[13px] font-bold text-white transition-all active:scale-[0.97]"
            >
              Weitermachen 💪
            </button>
            <button
              onClick={handleDiscardSession}
              className="rounded-xl bg-white px-4 py-2.5 min-h-[44px] text-[13px] font-bold text-ink-soft transition-all active:scale-[0.97]"
            >
              Verwerfen
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-black text-ink">
            Hey {member?.name || 'Ninja'}! 👋
          </h1>
          <p className="text-[13px] font-semibold text-ink-soft">
            {family?.name || 'FamilyBoard'}
          </p>
        </div>
        <button
          onClick={() => navigate('/profile')}
          aria-label="Profil öffnen"
          className="flex h-11 w-11 items-center justify-center rounded-full text-[20px] font-black text-white shadow-md transition-transform active:scale-[0.95]"
          style={{ backgroundColor: member?.color || '#FF7A5C' }}
        >
          {member?.name?.[0]?.toUpperCase() || '🥷'}
        </button>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink-soft">
          Heute geschafft ✨
        </p>
        {todayCompleted > 0 ? (
          <p className="text-center text-[14px] font-bold text-teal">
            {todayCompleted} Aufgabe{todayCompleted !== 1 ? 'n' : ''} erledigt! 🎉
          </p>
        ) : (
          <div className="py-4 text-center">
            <p className="mb-1 text-[36px]">🚀</p>
            <p className="text-[14px] font-semibold text-ink-soft">
              Bereit für heute?
            </p>
          </div>
        )}
      </div>

      {dueTask && (
        <button
          onClick={() =>
            navigate('/session/active', { state: { tasks: [dueTask] } })
          }
          className="flex items-center gap-3 rounded-2xl border-2 border-gold bg-wash-gold p-4 text-left shadow-sm transition-transform active:scale-[0.97]"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-wash-plum">
            {dueTask.image_url ? (
              <img src={dueTask.image_url} alt={dueTask.title} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[28px]">{dueTask.emoji}</span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-bold uppercase tracking-widest text-gold-deep">
              ⏰ Das ist lange fällig!
            </p>
            <p className="text-[16px] font-black text-ink">{dueTask.title}</p>
            <p className="text-[11px] font-semibold text-ink-soft">
              {getDaysAgoLabel(dueTask.last_completed_at)}
            </p>
          </div>
          <Zap className="h-5 w-5 shrink-0 text-gold-deep" />
        </button>
      )}

      <div className="rounded-2xl bg-gradient-to-r from-rose to-rose-deep p-5 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white/20">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[28px] font-black leading-tight">
              {member?.streak || 0} <span className="text-[16px] font-bold">Tage</span>
            </p>
            <p className="text-[13px] font-semibold opacity-85">
              Längste: {member?.longest_streak || 0} Tage
            </p>
          </div>
        </div>
        {streakSaveInfo.canSave && (
          <button
            onClick={handleStreakSave}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-black/20 py-2.5 min-h-[44px] text-[13px] font-bold transition-all active:scale-[0.97] hover:bg-black/30"
          >
            🛡️ Streak retten
            {member?.role === 'child' && (
              <span className="text-[11px] opacity-80">(1x pro Woche)</span>
            )}
          </button>
        )}
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 items-center gap-3 rounded-2xl bg-gradient-to-br from-teal to-teal-deep p-4 text-white shadow-md">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white/20">
            <Star className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[22px] font-black leading-tight">+{todayXp}</p>
            <p className="text-[11px] font-semibold opacity-80">Heute XP</p>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-3 rounded-2xl bg-gradient-to-br from-coral to-coral-deep p-4 text-white shadow-md">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white/20">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[22px] font-black leading-tight">
              {levelInfo.emoji} {levelInfo.name}
            </p>
            <p className="text-[11px] font-semibold opacity-80">
              {member?.xp || 0} XP · Level {member?.level ?? 1}
            </p>
          </div>
        </div>
      </div>

      <WeeklyMission />

      <button
        onClick={() => navigate('/session/select')}
        className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-coral to-coral-deep py-[22px] text-[22px] font-black tracking-wide text-white shadow-[0_8px_28px_rgba(255,122,92,0.35)] transition-transform active:scale-[0.97]"
      >
        <Zap className="h-7 w-7" strokeWidth={2.5} />
        LOS GEHT'S!
      </button>

      {weekProgress && (weekProgress.last > 0 || weekProgress.this > 0) && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-soft">
            📈 Wochen-Vergleich
          </p>
          <p className="text-[14px] font-bold text-ink">
            Letzte Woche: {weekProgress.last} → Diese Woche: {weekProgress.this}
            {weekProgress.this > weekProgress.last && (
              <span className="ml-1 text-teal">+{weekProgress.this - weekProgress.last} 📈</span>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
