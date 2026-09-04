import { supabase } from '../config/supabase'
import type {
  SelfCareItemRow,
  SelfCareItemInsert,
  SelfCareCompletionRow,
  MyDayTaskRow,
  TaskRow,
  SelfCareCategory,
} from '../types/supabase'
import { getTaskStatus } from './tasks'
import { weekKey } from './utils'

export { type SelfCareCategory }

export const SELF_CARE_CATEGORIES: Record<SelfCareCategory, string> = {
  meds: '💊 Medikamente',
  movement: '🚶 Bewegung',
  basics: '🍎 Grundversorgung',
  rest: '🧘 Ruhe & Hobby',
  morning_evening: '🌅 Morgen & Abend',
}

export function dateKey(date: Date): string {
  return weekKey(date)
}

export function isItemDoneToday(itemId: number, completions: SelfCareCompletionRow[]): boolean {
  return completions.some((c) => c.item_id === itemId)
}

export function getChecklistProgress(
  items: SelfCareItemRow[],
  completions: SelfCareCompletionRow[]
): { done: number; total: number } {
  return {
    done: items.filter((i) => isItemDoneToday(i.id, completions)).length,
    total: items.length,
  }
}

export function isDayComplete(
  items: SelfCareItemRow[],
  completions: SelfCareCompletionRow[]
): boolean {
  if (items.length === 0) return false
  return items.every((i) => isItemDoneToday(i.id, completions))
}

export function nothingDoneToday(completions: SelfCareCompletionRow[]): boolean {
  return completions.length === 0
}

export function getOpenPicks(picks: MyDayTaskRow[]): MyDayTaskRow[] {
  return picks.filter((p) => p.completed_at === null)
}

export function canPickMore(picks: MyDayTaskRow[], limit = 3): boolean {
  return getOpenPicks(picks).length < limit
}

export function getCompleteDaysInRange(
  items: SelfCareItemRow[],
  dayKeys: string[],
  completions: SelfCareCompletionRow[]
): { day: string; complete: boolean }[] {
  const ids = items.map((i) => i.id)
  return dayKeys.map((day) => {
    const doneIds = new Set(
      completions.filter((c) => c.done_date === day).map((c) => c.item_id)
    )
    return { day, complete: ids.length > 0 && ids.every((id) => doneIds.has(id)) }
  })
}

export function getAvailableTasksForPicker(
  tasks: TaskRow[],
  memberId: number,
  getAssigneeName: (assigneeId: number | null) => string,
  pickedTaskIds: number[],
  now: Date = new Date()
): TaskRow[] {
  const picked = new Set(pickedTaskIds)
  return tasks
    .filter(
      (t) =>
        getTaskStatus(t, memberId, getAssigneeName(t.assignee_id ?? null), now).available &&
        !picked.has(t.id)
    )
    .sort((a, b) => {
      if (a.last_completed_at === null && b.last_completed_at === null) return a.id - b.id
      if (a.last_completed_at === null) return -1
      if (b.last_completed_at === null) return 1
      return new Date(a.last_completed_at).getTime() - new Date(b.last_completed_at).getTime()
    })
}

export async function getSelfCareLibrary(familyId: number) {
  return supabase
    .from('self_care_items')
    .select('*')
    .or(`family_id.is.null,family_id.eq.${familyId}`)
    .order('id')
}

export async function createSelfCareItem(item: SelfCareItemInsert) {
  return supabase.from('self_care_items').insert(item).select('*').single()
}

export async function getMemberSelfCare(memberId: number) {
  return supabase.from('member_self_care').select('*').eq('member_id', memberId).order('position')
}

export async function setMemberSelfCare(memberId: number, itemIds: number[]) {
  const { error: deleteError } = await supabase
    .from('member_self_care')
    .delete()
    .eq('member_id', memberId)
  if (deleteError) return { error: deleteError }
  if (itemIds.length === 0) return { error: null }
  const rows = itemIds.map((itemId, position) => ({ member_id: memberId, item_id: itemId, position }))
  return supabase.from('member_self_care').insert(rows)
}

export async function getSelfCareCompletions(memberId: number, day: string) {
  return supabase
    .from('self_care_completions')
    .select('*')
    .eq('member_id', memberId)
    .eq('done_date', day)
}

export async function getSelfCareCompletionsRange(memberId: number, from: string, to: string) {
  return supabase
    .from('self_care_completions')
    .select('*')
    .eq('member_id', memberId)
    .gte('done_date', from)
    .lte('done_date', to)
}

export async function toggleSelfCareCompletion(
  memberId: number,
  itemId: number,
  day: string,
  done: boolean
) {
  if (done) {
    return supabase
      .from('self_care_completions')
      .insert({ member_id: memberId, item_id: itemId, done_date: day })
  }
  return supabase
    .from('self_care_completions')
    .delete()
    .eq('member_id', memberId)
    .eq('item_id', itemId)
    .eq('done_date', day)
}

export async function getMyDayTasks(memberId: number, day: string) {
  return supabase.from('my_day_tasks').select('*').eq('member_id', memberId).eq('day', day).order('position')
}

export async function pickTaskForDay(memberId: number, taskId: number, day: string) {
  return supabase
    .from('my_day_tasks')
    .insert({ member_id: memberId, task_id: taskId, day })
    .select('*')
    .single()
}

export async function markPickCompleted(pickId: number) {
  return supabase
    .from('my_day_tasks')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', pickId)
    .select('*')
    .single()
}

export async function removePick(pickId: number) {
  return supabase.from('my_day_tasks').delete().eq('id', pickId)
}
