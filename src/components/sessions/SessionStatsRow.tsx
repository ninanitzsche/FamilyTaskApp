interface SessionStatsRowProps {
  duration: number
  doneCount: number
  totalCount: number
  xp: number
}

export function SessionStatsRow({ duration, doneCount, totalCount, xp }: SessionStatsRowProps) {
  const mins = Math.floor(duration / 60)
  const secs = String(duration % 60).padStart(2, '0')
  const stats = [
    { icon: '⏱️', value: `${mins}:${secs}`, label: 'Dauer' },
    { icon: '✅', value: `${doneCount}/${totalCount}`, label: 'Aufgaben' },
    { icon: '⭐', value: `+${xp}`, label: 'Punkte' },
  ]
  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-[16px] bg-white p-3 text-center shadow-sm">
          <p className="text-[16px]">{s.icon}</p>
          <p className="text-[16px] font-black text-ink tabular-nums">{s.value}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">{s.label}</p>
        </div>
      ))}
    </div>
  )
}