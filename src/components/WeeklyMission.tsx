import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { getCurrentWeekMission, createWeeklyMission, getFamilyTasks, getMemberSessions } from '../lib/supabase'
import { weekKey, getMondayOf } from '../lib/utils'
import type { WeeklyMissionRow, TaskRow, SessionRow } from '../types/supabase'
import { Target, Check, Zap } from 'lucide-react'

export function WeeklyMission() {
  const family = useAuthStore((s) => s.family)
  const member = useAuthStore((s) => s.member)
  const [mission, setMission] = useState<WeeklyMissionRow | null>(null)
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!family) return

    const load = async () => {
      const { data: existing } = await getCurrentWeekMission(family.id)

      if (existing) {
        setMission(existing as WeeklyMissionRow)
      } else {
        const { data: allTasks } = await getFamilyTasks(family.id)
        if (allTasks && allTasks.length >= 3) {
          const shuffled = [...(allTasks as TaskRow[])].sort(() => Math.random() - 0.5)
          const picked = shuffled.slice(0, 3)

          const now = new Date()
          const monday = getMondayOf(now)
          const weekStart = weekKey(monday)

          const { data: newMission } = await createWeeklyMission({
            family_id: family.id,
            week_start: weekStart,
            task_ids: picked.map((t) => t.id),
            target_completions: 3,
          })

          if (newMission) setMission(newMission as WeeklyMissionRow)
        }
      }
      setLoading(false)
    }

    load()
  }, [family])

  useEffect(() => {
    if (!mission || !family || !member) return

    const loadTasksAndProgress = async () => {
      const { data: allTasks } = await getFamilyTasks(family.id)
      if (allTasks) {
        const missionTasks = (allTasks as TaskRow[]).filter((t) =>
          mission.task_ids.includes(t.id)
        )
        setTasks(missionTasks)
      }

      // Determine which mission tasks were completed this week from sessions
      const { data: sessions } = await getMemberSessions(member.id, 20)
      if (sessions) {
        const now = new Date()
        const monday = getMondayOf(now)

        const thisWeekSessions = (sessions as SessionRow[]).filter(
          (s) => new Date(s.created_at) >= monday
        )

        const completed = new Set<number>()
        for (const session of thisWeekSessions) {
          for (const taskId of session.completed_task_ids) {
            if (mission.task_ids.includes(taskId)) {
              completed.add(taskId)
            }
          }
        }
        setCompletedTaskIds(completed)
      }
    }

    loadTasksAndProgress()
  }, [mission, family, member])

  if (loading || !mission) return null

  const progress = mission.member_progress?.[String(member?.id)] || 0
  const allDone = progress >= mission.target_completions

  return (
    <div className={`rounded-[20px] p-5 ${allDone ? 'bg-gradient-to-br from-gold to-sunset text-ink' : 'bg-white'} shadow-sm`}>
      <div className="mb-3 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-[12px] ${allDone ? 'bg-ink/10' : 'bg-wash-plum'}`}>
          <Target className={`h-5 w-5 ${allDone ? 'text-ink' : 'text-coral'}`} />
        </div>
        <div>
          <p className={`text-[13px] font-extrabold ${allDone ? 'text-ink' : 'text-ink'}`}>
            Wochen-Challenge
          </p>
          <p className={`text-[11px] font-semibold ${allDone ? 'text-ink' : 'text-ink-soft'}`}>
            {allDone ? 'Abgeschlossen! +50 XP' : `${progress}/${mission.target_completions} Aufgaben`}
          </p>
        </div>
      </div>

      <p className={`mb-3 -mt-1 text-[11px] font-semibold ${allDone ? 'text-ink' : 'text-ink-soft'}`}>
        {allDone
          ? 'Super gemacht – nächste Woche gibt es eine neue Challenge!'
          : '3 zufällige Aufgaben diese Woche – schaffst du alle, gibt es +50 XP'}
      </p>

      <div className="flex gap-2">
        {tasks.map((task) => {
          const taskDone = completedTaskIds.has(task.id) || allDone
          return (
            <div
              key={task.id}
              className={`flex flex-1 items-center gap-2 rounded-[12px] px-3 py-2 ${
                allDone ? 'bg-white/20' : taskDone ? 'bg-wash-teal' : 'bg-wash-plum'
              }`}
            >
              {task.image_url ? (
                <img src={task.image_url} alt={task.title} className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <span className="text-[16px]">{task.emoji}</span>
              )}
              {taskDone && <Check className={`h-4 w-4 ${allDone ? 'text-ink' : 'text-teal'}`} />}
            </div>
          )
        })}
      </div>

      {allDone && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <Zap className="h-4 w-4" strokeWidth={2.5} />
          <span className="text-[12px] font-bold">+50 XP Bonus!</span>
        </div>
      )}
    </div>
  )
}
