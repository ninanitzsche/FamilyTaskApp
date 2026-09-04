import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getLevelFromXp, getXpForNextLevel, LEVEL_THRESHOLDS } from '../lib/gamification'
import { getMemberSessions, getFamilyTasks } from '../lib/supabase'
import { Flame, Trophy, Star, Target } from 'lucide-react'
import { SessionCard, EmptySessions } from '../components/sessions'
import type { SessionRow, TaskRow } from '../types/supabase'

const ALL_LEVELS = LEVEL_THRESHOLDS

const STREAK_BADGES = [
  { id: 'streak-3', name: 'Feuer-Laune', emoji: '🔥', desc: '3 Tage streak', required: 3 },
  { id: 'streak-7', name: 'Blitz-Streak', emoji: '⚡', desc: '7 Tage streak', required: 7 },
  { id: 'streak-14', name: 'Diamant-Fokus', emoji: '💎', desc: '14 Tage streak', required: 14 },
  { id: 'streak-30', name: 'Streak-König', emoji: '👑', desc: '30 Tage streak', required: 30 },
]

const FOCUS_BADGES = [
  { id: 'focus-7', name: 'Fokus-Star', emoji: '⭐', desc: 'Session ≥ 7 Min', requiredMin: 7 },
  { id: 'focus-10', name: 'Hyperfocus', emoji: '🧠', desc: 'Session ≥ 10 Min', requiredMin: 10 },
  { id: 'focus-15', name: 'Meister-Fokus', emoji: '🏆', desc: 'Session ≥ 15 Min', requiredMin: 15 },
  { id: 'early-bird', name: 'Early Bird', emoji: '🌅', desc: 'Session vor 9 Uhr', earlyBird: true },
  { id: 'nachteule', name: 'Nachteule', emoji: '🦉', desc: 'Session nach 20 Uhr', nachteule: true },
]

const BASE_BADGES = [
  { id: 'first-session', name: 'Erste Session', emoji: '🎯', desc: 'Erste Session abgeschlossen', check: (xp: number) => xp >= 10 },
  { id: 'level-3', name: 'Lehrling', emoji: '⚔️', desc: 'Level 3 erreicht', check: (xp: number) => xp >= 300 },
  { id: 'level-5', name: 'Held', emoji: '🦸', desc: 'Level 5 erreicht', check: (xp: number) => xp >= 1000 },
  { id: 'xp-100', name: '100 XP Club', emoji: '⭐', desc: '100 XP gesammelt', check: (xp: number) => xp >= 100 },
  { id: 'xp-500', name: '500 XP Club', emoji: '🌟', desc: '500 XP gesammelt', check: (xp: number) => xp >= 500 },
  { id: 'xp-1000', name: '1000 XP Club', emoji: '💫', desc: '1000 XP gesammelt', check: (xp: number) => xp >= 1000 },
]

export function Achievements() {
  const { member, family } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [tasksById, setTasksById] = useState<Map<number, TaskRow>>(new Map())
  const xp = member?.xp || 0
  const streak = member?.streak || 0

  useEffect(() => {
    if (!member) return
    getMemberSessions(member.id, 50).then(({ data }) => {
      if (data) setSessions(data as SessionRow[])
    })
    if (family) {
      getFamilyTasks(family.id).then(({ data }) => {
        if (data) setTasksById(new Map((data as TaskRow[]).map((t) => [t.id, t])))
      })
    }
  }, [member, family])

  // Compute focus badge earned status from sessions
  const focusBadgeStatus = FOCUS_BADGES.map((badge) => {
    if (badge.earlyBird) {
      const earned = sessions.some((s) => {
        const h = new Date(s.created_at).getHours()
        return h < 9
      })
      return { ...badge, earned }
    }
    if (badge.nachteule) {
      const earned = sessions.some((s) => {
        const h = new Date(s.created_at).getHours()
        return h >= 20
      })
      return { ...badge, earned }
    }
    const reqMin = badge.requiredMin ?? 0
    const earned = sessions.some((s) => reqMin > 0 && s.duration >= reqMin * 60)
    return { ...badge, earned }
  })

  const streakBadgeStatus = STREAK_BADGES.map((badge) => ({
    ...badge,
    earned: streak >= badge.required,
  }))

  const levelInfo = getLevelFromXp(xp)
  const nextLevelXp = getXpForNextLevel(xp)
  const currentLevelXp = ALL_LEVELS.find((l) => l.level === levelInfo.level)?.xp || 0
  const xpInLevel = xp - currentLevelXp
  const xpNeeded = nextLevelXp - currentLevelXp
  const progress = xpNeeded > 0 ? Math.min((xpInLevel / xpNeeded) * 100, 100) : 100

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[24px] font-black text-ink">🏆 Erfolge</h1>

      {/* Level Card */}
      <div className="rounded-[24px] bg-gradient-to-br from-coral to-coral-deep p-6 text-white shadow-lg">
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-white/20 text-[36px]">
            {levelInfo.emoji}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-100">Aktuelles Level</p>
            <p className="text-[28px] font-black leading-tight">{levelInfo.name}</p>
            <p className="text-[13px] font-semibold opacity-100">Level {levelInfo.level}</p>
          </div>
        </div>

        <div className="mb-2 flex justify-between text-[12px] font-bold opacity-100">
          <span>{xp} XP</span>
          <span>{nextLevelXp} XP</span>
        </div>
        <div className="h-[8px] overflow-hidden rounded-[4px] bg-white/20">
          <div
            className="h-full rounded-[4px] bg-white transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-[12px] font-semibold opacity-100">
          {nextLevelXp - xp > 0 ? `${nextLevelXp - xp} XP bis Level ${levelInfo.level + 1}` : 'Max Level erreicht! 👑'}
        </p>
      </div>

      {/* Streak Card */}
      <div className="rounded-[20px] bg-gradient-to-r from-rose to-rose-deep p-5 text-white shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-white/20">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[28px] font-black leading-tight">
              {streak} <span className="text-[16px] font-bold">Tage</span>
            </p>
            <p className="text-[13px] font-semibold opacity-100">
              Längste Serie: {member?.longest_streak || 0} Tage
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[16px] bg-white p-4 text-center shadow-sm">
          <Star className="mx-auto mb-1 h-6 w-6 text-gold-deep" />
          <p className="text-[20px] font-black text-ink">{xp}</p>
          <p className="text-[10px] font-bold text-ink-soft">Gesamt XP</p>
        </div>
        <div className="rounded-[16px] bg-white p-4 text-center shadow-sm">
          <Trophy className="mx-auto mb-1 h-6 w-6 text-coral" />
          <p className="text-[20px] font-black text-ink">{member?.level ?? 1}</p>
          <p className="text-[10px] font-bold text-ink-soft">Level</p>
        </div>
        <div className="rounded-[16px] bg-white p-4 text-center shadow-sm">
          <Target className="mx-auto mb-1 h-6 w-6 text-teal" />
          <p className="text-[20px] font-black text-ink">{member?.longest_streak || 0}</p>
          <p className="text-[10px] font-bold text-ink-soft">Bester Streak</p>
        </div>
      </div>

      {/* Streak Badges */}
      <div>
        <h2 className="mb-3 text-[16px] font-black text-ink">🔥 Streak-Belohnungen</h2>
        <div className="grid grid-cols-2 gap-3">
          {streakBadgeStatus.map((badge) => (
            <div
              key={badge.id}
              className={`flex items-center gap-3 rounded-[16px] p-4 ${
                badge.earned ? 'bg-white shadow-sm' : 'bg-wash-plum'
              }`}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-[14px] text-[24px] ${
                  badge.earned ? 'bg-wash-plum' : 'bg-[#E7D9F2] grayscale opacity-50'
                }`}
              >
                {badge.emoji}
              </div>
              <div>
                <p className={`text-[13px] font-extrabold ${badge.earned ? 'text-ink' : 'text-ink-soft'}`}>
                  {badge.name}
                </p>
                <p className={`text-[10px] font-semibold ${badge.earned ? 'text-teal' : 'text-ink-soft'}`}>
                  {badge.earned ? '✅ Erreicht' : badge.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Focus Badges */}
      <div>
        <h2 className="mb-3 text-[16px] font-black text-ink">🧠 Fokus-Abzeichen</h2>
        <div className="grid grid-cols-2 gap-3">
          {focusBadgeStatus.map((badge) => (
            <div
              key={badge.id}
              className={`flex items-center gap-3 rounded-[16px] p-4 ${
                badge.earned ? 'bg-white shadow-sm' : 'bg-wash-plum'
              }`}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-[14px] text-[24px] ${
                  badge.earned ? 'bg-wash-plum' : 'bg-[#E7D9F2] grayscale opacity-50'
                }`}
              >
                {badge.emoji}
              </div>
              <div>
                <p className={`text-[13px] font-extrabold ${badge.earned ? 'text-ink' : 'text-ink-soft'}`}>
                  {badge.name}
                </p>
                <p className={`text-[10px] font-semibold ${badge.earned ? 'text-teal' : 'text-ink-soft'}`}>
                  {badge.earned ? '✅ Erreicht' : badge.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Base Badges */}
      <div>
        <h2 className="mb-3 text-[16px] font-black text-ink">🎖️ Abzeichen</h2>
        <div className="grid grid-cols-2 gap-3">
          {BASE_BADGES.map((badge) => {
            const earned = badge.check(xp)
            return (
              <div
                key={badge.id}
                className={`flex items-center gap-3 rounded-[16px] p-4 ${
                  earned ? 'bg-white shadow-sm' : 'bg-wash-plum'
                }`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-[14px] text-[24px] ${
                    earned ? 'bg-wash-plum' : 'bg-[#E7D9F2] grayscale opacity-50'
                  }`}
                >
                  {badge.emoji}
                </div>
                <div>
                  <p className={`text-[13px] font-extrabold ${earned ? 'text-ink' : 'text-ink-soft'}`}>
                    {badge.name}
                  </p>
                  <p className={`text-[10px] font-semibold ${earned ? 'text-teal' : 'text-ink-soft'}`}>
                    {earned ? '✅ Erreicht' : badge.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Aufräum-Actions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-black text-ink">🧹 Deine Aufräum-Actions</h2>
          {sessions.length > 0 && (
            <span className="text-[10px] font-bold text-ink-soft">{sessions.length} Sessions</span>
          )}
        </div>
        {sessions.length === 0 ? (
          <EmptySessions onStartSession={() => navigate('/dashboard')} />
        ) : (
          <ul className="flex flex-col gap-3">
            {sessions.slice(0, 8).map((session) => (
              <li key={session.id}>
                <SessionCard
                  session={session}
                  tasksById={tasksById}
                  onClick={(s) =>
                    navigate(`/achievements/session/${s.id}`, { state: { session: s } })
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Level Roadmap */}
      <div>
        <h2 className="mb-3 text-[16px] font-black text-ink">🗺️ Level-Weg</h2>
        <div className="flex flex-col gap-2">
          {ALL_LEVELS.map((l) => {
            const isCurrent = l.level === levelInfo.level
            const isUnlocked = xp >= l.xp
            return (
              <div
                key={l.level}
                className={`flex items-center gap-3 rounded-[14px] p-3 ${
                  isCurrent
                    ? 'border-2 border-coral bg-wash-plum'
                    : isUnlocked
                    ? 'bg-white shadow-sm'
                    : 'bg-wash-plum'
                }`}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-[12px] text-[20px]"
                  style={{ backgroundColor: l.color + '20' }}
                >
                  {l.emoji}
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-extrabold text-ink">{l.name}</p>
                  <p className="text-[10px] font-semibold text-ink-soft">{l.xp} XP</p>
                </div>
                {isCurrent && (
                  <span className="rounded-full bg-coral px-3 py-1 text-[10px] font-bold text-white">
                    AKTUELL
                  </span>
                )}
                {isUnlocked && !isCurrent && (
                  <span className="text-[18px]">✅</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
