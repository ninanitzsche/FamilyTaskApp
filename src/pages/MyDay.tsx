import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useEveningReminder } from '../hooks/useEveningReminder'
import {
  getSelfCareLibrary,
  getMemberSelfCare,
  setMemberSelfCare,
  createSelfCareItem,
  getSelfCareCompletions,
  toggleSelfCareCompletion,
  getMyDayTasks,
  pickTaskForDay,
  removePick,
  markPickCompleted,
  getOpenPicks,
  canPickMore,
  getAvailableTasksForPicker,
  dateKey,
  SELF_CARE_CATEGORIES,
  getSelfCareCompletionsRange,
  getCompleteDaysInRange,
  nothingDoneToday,
  type SelfCareCategory,
} from '../lib/selfCare'
import { getFamilyTasks, getFamilyMembers, updateTask } from '../lib/supabase'
import { completeTaskRow } from '../lib/tasks'
import type {
  SelfCareItemRow,
  MemberSelfCareRow,
  SelfCareCompletionRow,
  MyDayTaskRow,
  TaskRow,
  MemberRow,
} from '../types/supabase'
import { Check, Settings, X, Plus } from 'lucide-react'

const WIP_LIMIT = 3
const CATEGORY_ORDER: SelfCareCategory[] = ['morning_evening', 'meds', 'movement', 'basics', 'rest']

function getGreeting(hour: number): string {
  if (hour < 11) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

export function MyDay() {
  const { member, family } = useAuth()
  const [showEditor, setShowEditor] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const [customEmoji, setCustomEmoji] = useState('🌟')
  const [customCategory, setCustomCategory] = useState<SelfCareCategory>('rest')
  const [saving, setSaving] = useState(false)
  const [library, setLibrary] = useState<SelfCareItemRow[]>([])
  const [selection, setSelection] = useState<SelfCareItemRow[]>([])
  const [completions, setCompletions] = useState<SelfCareCompletionRow[]>([])
  const [picks, setPicks] = useState<MyDayTaskRow[]>([])
  const [pickedTasks, setPickedTasks] = useState<TaskRow[]>([])
  const [allTasks, setAllTasks] = useState<TaskRow[]>([])
  const [memberRows, setMemberRows] = useState<MemberRow[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [completing, setCompleting] = useState<number | null>(null)
  const [permission, setPermission] = useState<NotificationPermission | undefined>(undefined)
  const [weekDays, setWeekDays] = useState<{ day: string; complete: boolean }[]>([])
  const [notifyAsked, setNotifyAsked] = useState(false)

  const todayKey = dateKey(new Date())
  const hour = new Date().getHours()

  const reload = useCallback(async () => {
    if (!member || !family) return
    const [libRes, selRes, compRes, pickRes, taskRes, memberRes] = await Promise.all([
      getSelfCareLibrary(family.id),
      getMemberSelfCare(member.id),
      getSelfCareCompletions(member.id, todayKey),
      getMyDayTasks(member.id, todayKey),
      getFamilyTasks(family.id),
      getFamilyMembers(family.id),
    ])
    const lib = (libRes.data as SelfCareItemRow[] | null) ?? []
    const selRows = (selRes.data as MemberSelfCareRow[] | null) ?? []
    const itemById = new Map(lib.map((i) => [i.id, i]))
    setLibrary(lib)
    setSelection(
      selRows
        .map((r) => itemById.get(r.item_id))
        .filter((i): i is SelfCareItemRow => Boolean(i))
    )
    setCompletions((compRes.data as SelfCareCompletionRow[] | null) ?? [])

    const tasks = (taskRes.data as TaskRow[] | null) ?? []
    const pickRows = (pickRes.data as MyDayTaskRow[] | null) ?? []
    const taskById = new Map(tasks.map((t) => [t.id, t]))

    setAllTasks(tasks)
    setMemberRows((memberRes.data as MemberRow[] | null) ?? [])
    setPicks(pickRows)
    setPickedTasks(
      pickRows
        .map((p) => taskById.get(p.task_id))
        .filter((t): t is TaskRow => Boolean(t))
    )

    const dayKeys = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return dateKey(d)
    })
    const { data: rangeComps } = await getSelfCareCompletionsRange(member.id, dayKeys[0], todayKey)
    setWeekDays(
      getCompleteDaysInRange(
        selRows
          .map((r) => itemById.get(r.item_id))
          .filter((i): i is SelfCareItemRow => Boolean(i)),
        dayKeys,
        (rangeComps as SelfCareCompletionRow[] | null) ?? []
      )
    )
  }, [member, family, todayKey])

  useEffect(() => {
    reload()
  }, [reload])

  const handleToggleItem = async (itemId: number) => {
    if (!member) return
    const done = completions.some((c) => c.item_id === itemId)
    await toggleSelfCareCompletion(member.id, itemId, todayKey, !done)
    await reload()
  }

  const openPicks = getOpenPicks(picks)

  const nothingDone = nothingDoneToday(completions)
  useEveningReminder(permission === 'granted', nothingDone)
  const completeCount = weekDays.filter((d) => d.complete).length

  const progress = { done: completions.length, total: selection.length }

  const handleSelectionToggle = async (itemId: number) => {
    if (!member) return
    const next = selection.some((i) => i.id === itemId)
      ? selection.filter((i) => i.id !== itemId)
      : [...selection, library.find((i) => i.id === itemId)].filter(
          (i): i is SelfCareItemRow => Boolean(i)
        )
    const res = await setMemberSelfCare(member.id, next.map((i) => i.id))
    if (res?.error) {
      reload()
      return
    }
    setSelection(next)
  }

  const handleCreateCustom = async () => {
    if (!member || !family || !customLabel.trim() || saving) return
    setSaving(true)
    const { data } = await createSelfCareItem({
      family_id: family.id,
      category: customCategory,
      label: customLabel.trim(),
      emoji: customEmoji || '🌟',
      time_of_day: 'any',
    })
    if (data) {
      setLibrary((prev) => [...prev, data])
      await handleSelectionToggle(data.id)
      setCustomLabel('')
      setCustomEmoji('🌟')
    }
    setSaving(false)
  }

  const availableForPicker = getAvailableTasksForPicker(
    allTasks,
    member?.id ?? 0,
    (id) => memberRows.find((m) => m.id === id)?.name ?? 'jemand',
    picks.map((p) => p.task_id)
  )

  const handlePickTask = async (taskId: number) => {
    if (!member || !canPickMore(picks)) return
    setShowPicker(false)
    await pickTaskForDay(member.id, taskId, todayKey)
    await reload()
  }

  const handleRemovePick = async (pickId: number) => {
    await removePick(pickId)
    await reload()
  }

  const handleCompletePick = async (pick: MyDayTaskRow) => {
    if (completing || pick.completed_at !== null) return
    const task = pickedTasks.find((t) => t.id === pick.task_id)
    if (!task) return
    setCompleting(pick.id)
    await updateTask(task.id, completeTaskRow(task))
    await markPickCompleted(pick.id)
    setCompleting(null)
    await reload()
  }

  const handleAskNotification = async () => {
    if (!('Notification' in window)) return
    const p =
      Notification.permission === 'default'
        ? await Notification.requestPermission().catch(() => 'denied' as NotificationPermission)
        : Notification.permission
    setPermission(p)
    setNotifyAsked(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[24px] font-black text-ink">
          {getGreeting(hour)}, {member?.name}! 🌞
        </h1>
        <p className="text-[13px] font-semibold text-ink-soft">
          {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {!notifyAsked && 'Notification' in window && Notification.permission === 'default' && (
        <div className="rounded-2xl border-2 border-wash-sky bg-wash-sky p-4 shadow-sm">
          <p className="text-[14px] font-bold text-ink">🔔 Abends erinnern?</p>
          <p className="mb-3 text-[12px] font-semibold text-ink-soft">
            Wenn bis 18 Uhr nichts erledigt ist, erinnern wir dich sanft.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleAskNotification}
              className="flex-1 rounded-xl bg-coral py-2.5 text-[13px] font-bold text-white transition-transform active:scale-[0.97]"
            >
              Ja, bitte
            </button>
            <button
              onClick={() => setNotifyAsked(true)}
              className="rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold text-ink-soft"
            >
              Nein
            </button>
          </div>
        </div>
      )}

      {hour >= 18 && nothingDone && selection.length > 0 && (
        <div className="rounded-2xl border-2 border-gold bg-wash-gold p-4 shadow-sm">
          <p className="text-[14px] font-bold text-ink">🌇 Heute noch nichts erledigt?</p>
          <p className="text-[12px] font-semibold text-ink-soft">
            Nimm dir 5 Minuten für deine Self-Care-Liste.
          </p>
        </div>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">
              Self-Care
            </p>
            <p className="text-[18px] font-black text-ink">
              {progress.done}/{progress.total}
            </p>
          </div>
          <button
            onClick={() => setShowEditor(true)}
            aria-label="Self-Care bearbeiten"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-wash-plum text-coral-deep transition-transform active:scale-95"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
        {selection.length === 0 ? (
          <p className="py-6 text-center text-[13px] font-semibold text-ink-soft">
            Wähle deine Self-Care-Punkte aus 🌱
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {selection.map((item) => {
              const done = completions.some((c) => c.item_id === item.id)
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleToggleItem(item.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-transform active:scale-[0.98] ${
                      done ? 'border-teal bg-wash-teal' : 'border-wash-plum bg-white'
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[18px] shadow-sm">
                      {item.emoji}
                    </span>
                    <span className="flex-1">
                      <span className={`block text-[15px] font-bold ${done ? 'text-teal-deep' : 'text-ink'}`}>
                        {item.label}
                      </span>
                      <span className="block text-[11px] font-semibold text-ink-soft">
                        {SELF_CARE_CATEGORIES[item.category as SelfCareCategory]}
                      </span>
                    </span>
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                        done ? 'border-teal bg-teal text-white' : 'border-wash-plum'
                      }`}
                    >
                      {done && <Check className="h-5 w-5" strokeWidth={3} />}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">
            Heute-Aufgaben
          </p>
          <p className="text-[12px] font-semibold text-ink-soft">
            Max. {WIP_LIMIT} gleichzeitig · {openPicks.length}/{WIP_LIMIT} offen
          </p>
        </div>
        {pickedTasks.length === 0 ? (
          <p className="py-4 text-center text-[13px] font-semibold text-ink-soft">
            Noch nichts gewählt — zieh dir Aufgaben aus dem Brett rein.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {picks.map((pick) => {
              const task = pickedTasks.find((t) => t.id === pick.task_id)
              if (!task) return null
              const done = pick.completed_at !== null
              return (
                <li key={pick.id} className="flex items-center gap-2">
                  <button
                    onClick={() => handleCompletePick(pick)}
                    disabled={completing !== null}
                    aria-pressed={done}
                    aria-disabled={done}
                    className={`flex flex-1 items-center gap-3 rounded-2xl border-2 p-3 text-left transition-transform active:scale-[0.98] ${
                      done ? 'border-teal bg-wash-teal opacity-70' : 'border-wash-plum bg-white'
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-wash-gold text-[18px]">
                      {task.emoji}
                    </span>
                    <span className={`flex-1 text-[15px] font-bold ${done ? 'line-through text-teal-deep' : 'text-ink'}`}>
                      {task.title}
                    </span>
                    {done ? (
                      <span className="rounded-full bg-teal px-2 py-0.5 text-[11px] font-bold text-white">
                        Fertig ✓
                      </span>
                    ) : (
                      <span className="rounded-full bg-wash-coral px-2 py-0.5 text-[11px] font-bold text-coral-deep">
                        Erledigen ✓
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleRemovePick(pick.id)}
                    aria-label="Aufgabe entfernen"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wash-coral text-rose-deep"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {canPickMore(picks) ? (
          <button
            onClick={() => setShowPicker(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-wash-plum bg-white py-3 text-[13px] font-bold text-coral-deep transition-transform active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" /> Aufgabe wählen
          </button>
        ) : (
          <p className="mt-3 rounded-xl bg-wash-gold px-3 py-2 text-center text-[12px] font-bold text-gold-deep">
            {WIP_LIMIT} in Arbeit — erst eine abschließen 😉
          </p>
        )}
      </section>
      <section className="rounded-2xl bg-wash-plum p-5 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">
          🌙 Abend-Rückblick
        </p>
        <p className="mt-1 text-[14px] font-bold text-ink">
          Heute offen: {progress.total - progress.done} von {progress.total} Self-Care ·{' '}
          {openPicks.length} von {WIP_LIMIT} Aufgaben
        </p>
        <div className="mt-3 flex items-center gap-1">
          {weekDays.map((d) => (
            <span
              key={d.day}
              title={d.day}
              className={`flex h-8 flex-1 items-center justify-center rounded-lg text-[12px] font-black ${
                d.complete ? 'bg-teal text-white' : 'bg-white text-ink-soft'
              }`}
            >
              {d.complete ? '✓' : ''}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[12px] font-semibold text-ink-soft">
          {completeCount} von 7 Tagen komplett — kein Stress, morgen ist auch ein Tag 🌱
        </p>
      </section>
      {showEditor && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="self-care-editor-title"
          className="fixed inset-0 z-50 flex items-end bg-black/30 pb-6"
        >
          <div className="mx-auto w-full max-w-[420px] rounded-t-3xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="self-care-editor-title" className="text-[18px] font-black text-ink">
                Self-Care auswählen
              </h2>
              <button
                onClick={() => setShowEditor(false)}
                aria-label="Schließen"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-wash-plum text-ink-soft"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {CATEGORY_ORDER.map((cat) => {
              const catItems = library.filter((i) => i.category === cat)
              if (catItems.length === 0) return null
              return (
                <div key={cat} className="mb-4">
                  <p className="mb-2 text-[12px] font-bold uppercase tracking-widest text-ink-soft">
                    {SELF_CARE_CATEGORIES[cat]}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {catItems.map((item) => {
                      const selected = selection.some((i) => i.id === item.id)
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectionToggle(item.id)}
                          className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-2 text-[13px] font-bold transition-transform active:scale-95 ${
                            selected
                              ? 'border-coral bg-wash-coral text-coral-deep'
                              : 'border-wash-plum bg-white text-ink-soft'
                          }`}
                        >
                          <span>{item.emoji}</span>
                          {item.label}
                          {selected && <Check className="h-4 w-4" strokeWidth={3} />}
                        </button>
                      )
                    })}
                  </div>
                  </div>
                )
              })}
            </div>
            <div className="rounded-2xl bg-wash-plum p-4">
              <p className="mb-2 text-[12px] font-bold uppercase tracking-widest text-ink-soft">
                Eigener Punkt
              </p>
              <div className="flex gap-2">
                <input
                  value={customEmoji}
                  onChange={(e) => setCustomEmoji(e.target.value)}
                  maxLength={4}
                  className="w-14 rounded-xl border-2 border-wash-plum bg-white px-2 py-2 text-center text-[16px]"
                  aria-label="Emoji"
                />
                <input
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="z.B. Tee trinken"
                  className="flex-1 rounded-xl border-2 border-wash-plum bg-white px-3 py-2 text-[14px] font-semibold text-ink outline-none focus:border-coral"
                  aria-label="Name"
                />
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as SelfCareCategory)}
                  className="rounded-xl border-2 border-wash-plum bg-white px-2 py-2 text-[12px] font-semibold text-ink-soft"
                  aria-label="Rubrik"
                >
                  {(Object.keys(SELF_CARE_CATEGORIES) as SelfCareCategory[]).map((c) => (
                    <option key={c} value={c}>
                      {SELF_CARE_CATEGORIES[c]}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleCreateCustom}
                disabled={!customLabel.trim() || saving}
                className="mt-2 w-full rounded-xl bg-coral py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
              >
                Punkt hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}
      {showPicker && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="my-day-picker-title"
          className="fixed inset-0 z-50 flex items-end bg-black/30 pb-6"
        >
          <div className="mx-auto w-full max-w-[420px] rounded-t-3xl bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="my-day-picker-title" className="text-[18px] font-black text-ink">
                Aufgabe wählen
              </h2>
              <button
                onClick={() => setShowPicker(false)}
                aria-label="Schließen"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-wash-plum text-ink-soft"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {availableForPicker.length === 0 ? (
              <p className="py-6 text-center text-[13px] font-semibold text-ink-soft">
                Keine verfügbaren Aufgaben im Brett — später nochmal schauen 🛠️
              </p>
            ) : (
              <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
                {availableForPicker.map((task) => (
                  <li key={task.id}>
                    <button
                      onClick={() => handlePickTask(task.id)}
                      className="flex w-full items-center gap-3 rounded-2xl border-2 border-wash-plum bg-white p-3 text-left transition-transform active:scale-[0.98]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-wash-gold text-[18px]">
                        {task.emoji}
                      </span>
                      <span className="flex-1 text-[15px] font-bold text-ink">{task.title}</span>
                      <Plus className="h-5 w-5 text-coral-deep" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
