import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { getFamilyTasks, getFamilyMembers, createTask, deleteTask, updateTask } from '../lib/supabase'
import type { TaskRow, MemberRow } from '../types/supabase'
import { Plus, Check, X, GripVertical, Pencil } from 'lucide-react'
import { createLongPress } from '../lib/longPress'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const TASK_TEMPLATES = [
  { emoji: '🧱', title: 'Lego aufräumen', image: '/images/tasks/lego.png' },
  { emoji: '🦖', title: 'Dinos aufräumen', image: '/images/tasks/dinos.png' },
  { emoji: '🧸', title: 'Kuscheltiere', image: '/images/tasks/kuscheltiere.png' },
  { emoji: '🧹', title: 'Boden sauber', image: '/images/tasks/boden.png' },
  { emoji: '📚', title: 'Schreibtisch', image: '/images/tasks/schreibtisch.png' },
  { emoji: '👕', title: 'Wäsche', image: '/images/tasks/waesche.png' },
  { emoji: '🗑️', title: 'Müll raus', image: '/images/tasks/muell.png' },
  { emoji: '🪥', title: 'Zähne', image: '/images/tasks/zaehne.png' },
]

const RECURRING_OPTIONS = [
  { value: 'never', label: 'Niemals' },
  { value: 'daily', label: 'Täglich' },
  { value: 'weekly', label: 'Wöchentlich' },
] as const
type RecurringValue = 'never' | 'daily' | 'weekly'

function AssigneePicker({
  members,
  assignee,
  onChange,
}: {
  members: MemberRow[]
  assignee: number | null
  onChange: (id: number | null) => void
}) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-ink-soft">
        Für wen?
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          onClick={() => onChange(null)}
          className={`flex items-center gap-1.5 rounded-2xl px-3 py-2 text-[12px] font-bold transition ${
            assignee === null ? 'bg-coral text-white' : 'bg-white text-ink-soft'
          }`}
        >
          Alle
        </button>
        {members.map((m) => {
          const selected = assignee === m.id
          return (
            <button
              key={m.id}
              onClick={() => onChange(m.id)}
              className={`flex items-center gap-1.5 rounded-2xl px-2.5 py-2 text-[12px] font-bold transition ${
                selected ? 'text-white' : 'bg-white text-ink-soft'
              }`}
              style={selected ? { backgroundColor: m.color } : undefined}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black text-white"
                style={{ backgroundColor: selected ? 'rgba(255,255,255,0.35)' : m.color }}
              >
                {m.name[0]?.toUpperCase()}
              </span>
              {m.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RecurringOptions({
  value,
  onChange,
}: {
  value: RecurringValue
  onChange: (v: RecurringValue) => void
}) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-ink-soft">
        Wiederholen?
      </p>
      <div className="flex gap-2">
        {RECURRING_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded-2xl py-2.5 min-h-[44px] text-[12px] font-bold transition ${
              value === opt.value ? 'bg-coral text-white' : 'bg-white text-ink-soft'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function CooldownStepper({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-ink-soft">
        Pause nach dem Erledigen
      </p>
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
          aria-label="Pause verringern"
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[22px] font-black text-coral shadow-sm transition active:scale-90 disabled:opacity-30"
        >
          −
        </button>
        <span className="w-16 text-center text-[22px] font-black text-ink tabular-nums">
          {value} Tag{value !== 1 ? 'e' : ''}
        </span>
        <button
          onClick={() => onChange(Math.min(7, value + 1))}
          disabled={value >= 7}
          aria-label="Pause erhöhen"
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[22px] font-black text-coral shadow-sm transition active:scale-90 disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  )
}

function SortableTask({
  task,
  member,
  onDelete,
  onEdit,
}: {
  task: TaskRow
  member?: MemberRow
  onDelete: (id: number) => void
  onEdit: (task: TaskRow) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const [showActions, setShowActions] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const longPress = useMemo(() => createLongPress(() => setShowActions(true)), [])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onPointerDown={(e) => longPress.start(e.clientX, e.clientY)}
      onPointerMove={(e) => longPress.move(e.clientX, e.clientY)}
      onPointerUp={longPress.cancel}
      onPointerLeave={longPress.cancel}
      className={`relative overflow-hidden rounded-[18px] bg-white shadow-sm ${
        isDragging ? 'ring-2 ring-coral' : ''
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Aufgabe verschieben"
        className="absolute left-0 top-0 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-ink-soft shadow-sm"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex aspect-square items-center justify-center bg-wash-plum">
        {task.image_url ? (
          <img src={task.image_url} alt={task.title} className="h-full w-full object-cover" />
        ) : (
          <span className="text-[40px]">{task.emoji}</span>
        )}
      </div>
      <div className="px-2.5 py-2">
        <p className="text-[12px] font-extrabold text-ink">{task.title}</p>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-ink-soft">
            ×{task.completed_count} erledigt
          </p>
          {member && (
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black text-white"
              style={{ backgroundColor: member.color }}
              title={`Für ${member.name}`}
            >
              {member.name[0]?.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {showActions && (
        <div role="dialog" aria-modal="true" aria-labelledby="task-actions-title" className="fixed inset-0 z-50 flex items-end bg-black/30 pb-6">
          <div className="w-full max-w-[420px] rounded-3xl bg-sun px-6 py-6">
            <h2 id="task-actions-title" className="mb-4 text-center text-[18px] font-black text-ink">
              Aufgabe
            </h2>
            {confirmDelete ? (
              <>
                <p className="mb-6 text-center text-[16px] font-bold text-ink">
                  Wirklich löschen?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 rounded-2xl bg-white py-4 font-bold text-ink-soft"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => {
                      onDelete(task.id)
                      setConfirmDelete(false)
                      setShowActions(false)
                    }}
                    className="flex-1 rounded-2xl bg-rose-deep py-4 font-bold text-white"
                  >
                    Ja, löschen
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    onEdit(task)
                    setShowActions(false)
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-coral py-4 font-bold text-white"
                >
                  <Pencil className="h-4 w-4" />
                  Bearbeiten
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-white py-4 font-bold text-rose-deep"
                >
                  <X className="h-4 w-4" strokeWidth={3} />
                  Löschen
                </button>
                <button
                  onClick={() => setShowActions(false)}
                  className="rounded-2xl bg-wash-plum py-4 font-bold text-ink-soft"
                >
                  Abbrechen
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function Backlog() {
  const family = useAuthStore((s) => s.family)
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newEmoji, setNewEmoji] = useState('🧹')
  const [newImage, setNewImage] = useState<string | undefined>(undefined)
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editImage, setEditImage] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [newAssignee, setNewAssignee] = useState<number | null>(null)
  const [newRecurring, setNewRecurring] = useState<'never' | 'daily' | 'weekly'>('never')
  const [newCooldown, setNewCooldown] = useState(0)
  const [editAssignee, setEditAssignee] = useState<number | null>(null)
  const [editRecurring, setEditRecurring] = useState<'never' | 'daily' | 'weekly'>('never')
  const [editCooldown, setEditCooldown] = useState(0)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  useEffect(() => {
    if (!family) return
    getFamilyTasks(family.id).then(({ data }) => {
      if (data) setTasks(data as TaskRow[])
    })
    getFamilyMembers(family.id).then(({ data }) => {
      if (data) setMembers(data as MemberRow[])
    })
  }, [family])

  const handleAddTask = async (title: string, emoji: string, image?: string) => {
    if (!family) return
    setSaving(true)
    const { data } = await createTask({
      family_id: family.id,
      title,
      emoji,
      image_url: image,
      assignee_id: newAssignee,
      recurring: newRecurring,
      cooldown_days: newCooldown,
    })
    if (data) setTasks((prev) => [...prev, data as TaskRow])
    setSaving(false)
  }

  const handleDelete = async (id: number) => {
    setSaving(true)
    await deleteTask(id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
    setSaving(false)
  }

  const handleEditStart = (task: TaskRow) => {
    setEditingTask(task)
    setEditTitle(task.title)
    setEditEmoji(task.emoji)
    setEditImage(task.image_url ?? undefined)
    setEditAssignee(task.assignee_id)
    setEditRecurring(task.recurring)
    setEditCooldown(task.cooldown_days ?? 0)
  }

  const handleEditSave = async () => {
    if (!editingTask || !editTitle.trim()) return
    setSaving(true)
    await updateTask(editingTask.id, {
      title: editTitle.trim(),
      emoji: editEmoji,
      image_url: editImage ?? null,
      assignee_id: editAssignee,
      recurring: editRecurring,
      cooldown_days: editCooldown,
    })
    setTasks((prev) =>
      prev.map((t) =>
        t.id === editingTask.id
          ? {
              ...t,
              title: editTitle.trim(),
              emoji: editEmoji,
              image_url: editImage ?? null,
              assignee_id: editAssignee,
              recurring: editRecurring,
              cooldown_days: editCooldown,
            }
          : t
      )
    )
    setEditingTask(null)
    setSaving(false)
  }

  const handleCustomAdd = async () => {
    if (!family || !newTitle.trim()) return
    await handleAddTask(newTitle.trim(), newEmoji, newImage)
    setNewTitle('')
    setNewAssignee(null)
    setNewRecurring('never')
    setNewCooldown(0)
    setShowAdd(false)
  }

  const openAddFromSuggestion = (title: string, emoji: string, image?: string) => {
    setNewTitle(title)
    setNewEmoji(emoji)
    setNewImage(image)
    setNewAssignee(null)
    setNewRecurring('never')
    setNewCooldown(0)
    setShowAdd(true)
  }

  const [showHint, setShowHint] = useState(() => {
    try {
      return localStorage.getItem('familyboard:backlogHintDismissed') !== '1'
    } catch {
      return true
    }
  })

  const dismissHint = () => {
    try {
      localStorage.setItem('familyboard:backlogHintDismissed', '1')
    } catch {
      // localStorage nicht verfügbar
    }
    setShowHint(false)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setTasks((items) => {
      const oldIndex = items.findIndex((t) => t.id === active.id)
      const newIndex = items.findIndex((t) => t.id === over.id)
      const newOrder = arrayMove(items, oldIndex, newIndex)

      // Persist order to DB
      newOrder.forEach((task, idx) => {
        updateTask(task.id, { task_order: idx })
      })

      return newOrder
    })
  }

  const existingTitles = new Set(tasks.map((t) => t.title))
  const suggestions = TASK_TEMPLATES.filter((t) => !existingTitles.has(t.title))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-black text-ink">📋 Aufgaben</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-coral text-white shadow-md transition-transform active:scale-[0.95]"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>

      {showHint && (
        <div className="flex items-start gap-2 rounded-2xl border-2 border-coral/20 bg-wash-plum p-3">
          <p className="flex-1 text-[12px] font-bold text-ink">
            👆 Halten & ziehen zum Sortieren · Lang drücken zum Bearbeiten
          </p>
          <button
            onClick={dismissHint}
            aria-label="Hinweis schließen"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-ink-soft"
          >
            <X className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
        </div>
      )}

      {suggestions.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-soft">
            Vorschläge
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {suggestions.slice(0, 6).map((t) => (
              <button
                key={t.title}
                onClick={() => openAddFromSuggestion(t.title, t.emoji, t.image)}
                className="flex shrink-0 flex-col items-center gap-1 rounded-2xl bg-white p-2 shadow-sm transition-transform active:scale-[0.92]"
              >
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-wash-plum">
                  {t.image ? (
                    <img src={t.image} alt={t.title} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[28px]">{t.emoji}</span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-ink">{t.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && suggestions.length === 0 && (
        <div className="mt-12 text-center">
          <p className="mb-2 text-[48px]">📭</p>
          <p className="text-[16px] font-bold text-ink-soft">Noch keine Aufgaben</p>
          <p className="text-[13px] text-ink-soft">Tippe auf + um welche anzulegen</p>
        </div>
      )}

      {tasks.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tasks.map((t) => t.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3">
              {tasks.map((task) => {
                const member = task.assignee_id ? members.find((m) => m.id === task.assignee_id) : undefined
                return (
                  <SortableTask
                    key={task.id}
                    task={task}
                    member={member}
                    onDelete={handleDelete}
                    onEdit={handleEditStart}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {editingTask && (
        <div role="dialog" aria-modal="true" aria-labelledby="edit-task-title" className="fixed inset-0 z-50 flex items-end bg-black/30 pb-6">
          <div className="w-full max-w-[420px] rounded-3xl bg-sun px-6 py-6">
            <h2 id="edit-task-title" className="mb-4 text-center text-[18px] font-black text-ink">
              Aufgabe bearbeiten
            </h2>

            <div className="mb-4 grid grid-cols-4 gap-2">
              {TASK_TEMPLATES.map((t) => (
                <button
                  key={t.emoji}
                  onClick={() => { setEditEmoji(t.emoji); setEditTitle(t.title); setEditImage(t.image); }}
                  className={`flex flex-col items-center gap-1 rounded-xl p-2 text-[10px] font-bold transition ${
                    editEmoji === t.emoji ? 'bg-coral text-white' : 'bg-white text-ink'
                  }`}
                >
                  {t.image ? (
                    <img src={t.image} alt={t.title} className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <span className="text-[24px]">{t.emoji}</span>
                  )}
                  <span className="truncate w-full text-center">{t.title}</span>
                </button>
              ))}
            </div>

            <input
              className="mb-4 w-full rounded-2xl border-2 border-ink-soft bg-white px-5 py-4 text-center text-[16px] font-bold text-ink outline-none focus:border-coral"
              placeholder="Aufgabenname"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
            />

            <AssigneePicker members={members} assignee={editAssignee} onChange={setEditAssignee} />
            <RecurringOptions value={editRecurring} onChange={setEditRecurring} />
            <CooldownStepper value={editCooldown} onChange={setEditCooldown} />

            <div className="flex gap-3">
              <button
                onClick={() => setEditingTask(null)}
                className="flex-1 rounded-2xl bg-white py-4 font-bold text-ink-soft"
              >
                Abbrechen
              </button>
              <button
                onClick={handleEditSave}
                disabled={!editTitle.trim() || saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-coral py-4 font-bold text-white disabled:opacity-40"
              >
                {saving ? (
                  <span className="animate-pulse">Speichern...</span>
                ) : (
                  <>
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                    Speichern
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div role="dialog" aria-modal="true" aria-labelledby="add-task-title" className="fixed inset-0 z-50 flex items-end bg-black/30 pb-6">
          <div className="w-full max-w-[420px] rounded-3xl bg-sun px-6 py-6">
            <h2 id="add-task-title" className="mb-4 text-center text-[18px] font-black text-ink">
              Neue Aufgabe
            </h2>

            <div className="mb-4 grid grid-cols-4 gap-2">
              {TASK_TEMPLATES.map((t) => (
                <button
                  key={t.emoji}
                  onClick={() => { setNewEmoji(t.emoji); setNewTitle(t.title); setNewImage(t.image); }}
                  className={`flex flex-col items-center gap-1 rounded-xl p-2 text-[10px] font-bold transition ${
                    newEmoji === t.emoji ? 'bg-coral text-white' : 'bg-white text-ink'
                  }`}
                >
                  {t.image ? (
                    <img src={t.image} alt={t.title} className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <span className="text-[24px]">{t.emoji}</span>
                  )}
                  <span className="truncate w-full text-center">{t.title}</span>
                </button>
              ))}
            </div>

            <input
              className="mb-4 w-full rounded-2xl border-2 border-ink-soft bg-white px-5 py-4 text-center text-[16px] font-bold text-ink outline-none focus:border-coral"
              placeholder="Oder eigene Aufgabe"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCustomAdd()}
            />

            <AssigneePicker members={members} assignee={newAssignee} onChange={setNewAssignee} />
            <RecurringOptions value={newRecurring} onChange={setNewRecurring} />
            <CooldownStepper value={newCooldown} onChange={setNewCooldown} />

            <div className="flex gap-3">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 rounded-2xl bg-white py-4 font-bold text-ink-soft"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCustomAdd}
                disabled={!newTitle.trim() || saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-coral py-4 font-bold text-white disabled:opacity-40"
              >
                {saving ? (
                  <span className="animate-pulse">Hinzufügen...</span>
                ) : (
                  <>
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                    Hinzufügen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
