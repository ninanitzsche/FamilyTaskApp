import { supabase } from '../config/supabase'
import { weekKey, getMondayOf } from './utils'

export async function getFamily(id: number) {
  return supabase.from('families').select('*').eq('id', id).single()
}

export async function createFamily(name: string, inviteCode: string) {
  return supabase.from('families').insert({ name, invite_code: inviteCode }).select('*').single()
}

export async function getFamilyByInvite(code: string) {
  return supabase.from('families').select('*').eq('invite_code', code).single()
}

export async function getMemberByAuthId(authId: string) {
  return supabase.from('members').select('*').eq('auth_id', authId).single()
}

export async function getFamilyMembers(familyId: number) {
  return supabase.from('members').select('*').eq('family_id', familyId).order('created_at')
}

export async function createMember(member: {
  family_id: number
  auth_id: string
  name: string
  color: string
  role: 'parent' | 'child'
}) {
  return supabase.from('members').insert(member).select('*').single()
}

export async function updateMember(id: number, updates: Record<string, unknown>) {
  return supabase.from('members').update(updates).eq('id', id).select('*').single()
}

export async function getFamilyTasks(familyId: number) {
  return supabase.from('tasks').select('*').eq('family_id', familyId).order('task_order')
}

export async function createTask(task: {
  family_id: number
  title: string
  emoji: string
  image_url?: string
  assignee_id?: number | null
  recurring?: 'never' | 'daily' | 'weekly'
  cooldown_days?: number | null
}) {
  return supabase.from('tasks').insert(task).select('*').single()
}

export async function updateTask(id: number, updates: Record<string, unknown>) {
  return supabase.from('tasks').update(updates).eq('id', id).select('*').single()
}

export async function deleteTask(id: number) {
  return supabase.from('tasks').delete().eq('id', id)
}

export async function createSession(session: {
  family_id: number
  member_id: number
  duration: number
  task_ids: number[]
  completed_task_ids: number[]
  xp_earned: number
}) {
  return supabase.from('sessions').insert(session).select('*').single()
}

export async function updateSession(id: number, updates: Record<string, unknown>) {
  return supabase.from('sessions').update(updates).eq('id', id).select('*').single()
}

export async function getMemberSessions(memberId: number, limit = 20) {
  return supabase.from('sessions').select('*').eq('member_id', memberId).order('created_at', { ascending: false }).limit(limit)
}

export async function getFamilyRewards(familyId: number) {
  return supabase.from('rewards').select('*').eq('family_id', familyId)
}

export async function createReward(reward: {
  family_id: number
  title: string
  xp_cost: number
}) {
  return supabase.from('rewards').insert(reward).select('*').single()
}

export async function createRewardRedemption(rewardId: number, memberId: number) {
  return supabase
    .from('reward_redemptions')
    .insert({ reward_id: rewardId, member_id: memberId })
    .select('*')
    .single()
}

export async function getRewardRedemptionsThisWeek(sinceISO: string, memberId: number) {
  return supabase
    .from('reward_redemptions')
    .select('reward_id')
    .eq('member_id', memberId)
    .gte('created_at', sinceISO)
}

export async function getCurrentWeekMission(familyId: number) {
  const monday = getMondayOf(new Date())

  return supabase
    .from('weekly_missions')
    .select('*')
    .eq('family_id', familyId)
    .gte('week_start', weekKey(monday))
    .single()
}

export async function createWeeklyMission(mission: {
  family_id: number
  week_start: string
  task_ids: number[]
  target_completions: number
}) {
  return supabase.from('weekly_missions').insert(mission).select('*').single()
}

export async function updateWeeklyMission(id: number, updates: Record<string, unknown>) {
  return supabase.from('weekly_missions').update(updates).eq('id', id).select('*').single()
}
