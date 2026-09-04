import type { TaskRow } from '../../types/supabase'

interface TaskListBlockProps {
  heading: string
  tasks: TaskRow[]
  done: boolean
  missingIds?: number[]
}

export function TaskListBlock({ heading, tasks, done, missingIds = [] }: TaskListBlockProps) {
  if (tasks.length === 0 && missingIds.length === 0) return null
  return (
    <div>
      <h2 className="mb-2 text-[14px] font-black text-ink">{heading}</h2>
      <div className="flex flex-col gap-2">
        {tasks.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 rounded-[14px] p-3 shadow-sm ${
              done ? 'bg-white' : 'bg-wash-plum'
            }`}
          >
            {t.image_url ? (
              <img src={t.image_url} alt={t.title} className="h-7 w-7 rounded-lg object-cover" />
            ) : (
              <span className="text-[16px]">{t.emoji}</span>
            )}
            <span className={`flex-1 text-[13px] ${done ? 'font-bold text-ink' : 'font-semibold text-ink-soft'}`}>
              {t.title}
            </span>
            {done ? (
              <span className="text-[14px] font-bold text-teal">✓</span>
            ) : (
              <span className="text-[14px] font-bold text-ink-soft">○</span>
            )}
          </div>
        ))}
        {missingIds.map((id) => (
          <div key={id} className="rounded-[14px] bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold text-ink-soft">🤷 Aufgabe gelöscht</p>
          </div>
        ))}
      </div>
    </div>
  )
}