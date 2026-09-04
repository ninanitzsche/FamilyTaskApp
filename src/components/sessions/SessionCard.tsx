import type { SessionRow, TaskRow } from '../../types/supabase'

interface SessionCardProps {
  session: SessionRow
  tasksById: Map<number, TaskRow>
  onClick: (session: SessionRow) => void
}

function SessionThumb({ session, tasksById }: { session: SessionRow; tasksById: Map<number, TaskRow> }) {
  const titleImage = session.before_photo ?? session.after_photo
  if (titleImage) {
    return (
      <img
        src={titleImage}
        alt={session.before_photo ? 'Vorher-Foto der Session' : 'Nachher-Foto der Session'}
        className="h-20 w-28 flex-none rounded-2xl object-cover"
      />
    )
  }
  const resolved = session.completed_task_ids
    .map((id) => tasksById.get(id))
    .filter((t): t is TaskRow => Boolean(t))
  const doneEmojis = resolved.slice(0, 4).map((t) => t.emoji)
  const overflow = Math.max(0, resolved.length - 4)
  if (doneEmojis.length === 0) {
    return (
      <div className="grid h-20 w-28 flex-none place-items-center rounded-2xl border border-ink-soft bg-wash-plum">
        <span className="text-[22px]">🧹</span>
      </div>
    )
  }
  return (
    <div className="grid h-20 w-28 flex-none grid-cols-2 place-items-center rounded-2xl border border-ink-soft bg-wash-plum">
      {doneEmojis.map((e, i) => (
        <span key={i} className="text-[18px]">{e}</span>
      ))}
      {overflow > 0 && <span className="text-[10px] font-bold text-ink-soft">+{overflow}</span>}
    </div>
  )
}

export function SessionCard({ session, tasksById, onClick }: SessionCardProps) {
  const total = session.task_ids.length
  const doneCount = session.completed_task_ids.length
  const date = new Date(session.created_at).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
  const durationMin = Math.round(session.duration / 60)
  return (
    <button
      onClick={() => onClick(session)}
      className="flex w-full items-center gap-3 rounded-[16px] bg-white p-3 text-left shadow-sm transition-all active:scale-[0.98]"
    >
      <SessionThumb session={session} tasksById={tasksById} />
      <div className="flex h-20 flex-1 flex-col justify-between py-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-ink-soft">{date}</span>
          <span className="rounded-full bg-gradient-to-br from-gold to-sunset px-2.5 py-1 text-[11px] font-black text-ink">
            +{session.xp_earned}
          </span>
        </div>
        <span className="text-[11px] font-semibold text-ink-soft">⏱️ {durationMin} Min</span>
        <div className="flex items-center gap-1">
          {session.completed_task_ids.slice(0, 3).map((id) => {
            const t = tasksById.get(id)
            if (!t) return null
            return <span key={id} className="text-[12px]">{t.emoji}</span>
          })}
          {total > 0 ? (
            doneCount === total ? (
              <span className="text-[10px] font-bold text-teal">✅ Alles geschafft!</span>
            ) : (
              <span className="text-[10px] font-bold text-teal">✓ {doneCount}/{total}</span>
            )
          ) : null}
        </div>
      </div>
    </button>
  )
}