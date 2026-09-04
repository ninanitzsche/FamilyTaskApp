export interface Database {
  public: {
    Tables: {
      families: { Row: FamilyRow; Insert: FamilyInsert }
      members: { Row: MemberRow; Insert: MemberInsert }
      tasks: { Row: TaskRow; Insert: TaskInsert }
      sessions: { Row: SessionRow; Insert: SessionInsert }
      rewards: { Row: RewardRow; Insert: RewardInsert }
      reward_redemptions: { Row: RewardRedemptionRow; Insert: RewardRedemptionInsert }
      weekly_missions: { Row: WeeklyMissionRow; Insert: WeeklyMissionInsert }
      self_care_items: { Row: SelfCareItemRow; Insert: SelfCareItemInsert }
      member_self_care: { Row: MemberSelfCareRow; Insert: MemberSelfCareInsert }
      self_care_completions: { Row: SelfCareCompletionRow; Insert: SelfCareCompletionInsert }
      my_day_tasks: { Row: MyDayTaskRow; Insert: MyDayTaskInsert }
    }
  }
}

export interface FamilyRow {
  id: number
  name: string
  invite_code: string
  created_at: string
}
export interface FamilyInsert { name: string; invite_code: string }

export interface MemberRow {
  id: number
  family_id: number
  auth_id: string | null
  name: string
  color: string
  role: 'parent' | 'child'
  xp: number
  level: number
  streak: number
  longest_streak: number
  last_session_at: string | null
  screen_time_balance: number
  xp_redeemed: number
  streak_saves_used: number
  streak_save_week: string | null
  created_at: string
}
export interface MemberInsert {
  family_id: number; auth_id: string; name: string; color: string; role: 'parent' | 'child'
}

export interface TaskRow {
  id: number
  family_id: number
  title: string
  emoji: string
  image_url: string | null
  assignee_id: number | null
  recurring: 'never' | 'daily' | 'weekly'
  cooldown_days: number | null
  last_completed_at: string | null
  completed_count: number
  current_streak: number
  longest_streak: number
  task_order: number
  created_at: string
}
export interface TaskInsert {
  family_id: number; title: string; emoji: string; image_url?: string; assignee_id?: number | null; recurring?: 'never' | 'daily' | 'weekly'; cooldown_days?: number | null
}

export interface SessionRow {
  id: number
  family_id: number
  member_id: number
  duration: number
  task_ids: number[]
  completed_task_ids: number[]
  xp_earned: number
  before_photo: string | null
  after_photo: string | null
  created_at: string
}
export interface SessionInsert {
  family_id: number; member_id: number; duration: number; task_ids: number[]; completed_task_ids: number[]; xp_earned: number
}

export interface RewardRow {
  id: number
  family_id: number
  title: string
  xp_cost: number
  max_redemptions_per_week: number | null
  created_at: string
}
export interface RewardInsert { family_id: number; title: string; xp_cost: number }

export interface RewardRedemptionRow {
  id: number
  reward_id: number
  member_id: number
  created_at: string
}
export interface RewardRedemptionInsert { reward_id: number; member_id: number }

export interface WeeklyMissionRow {
  id: number
  family_id: number
  week_start: string
  task_ids: number[]
  target_completions: number
  member_progress: Record<string, number>
  created_at: string
}
export interface WeeklyMissionInsert {
  family_id: number; week_start: string; task_ids: number[]; target_completions: number
}

export type SelfCareCategory = 'meds' | 'movement' | 'basics' | 'rest' | 'morning_evening'
export type SelfCareTimeOfDay = 'morning' | 'evening' | 'any'

export interface SelfCareItemRow {
  id: number
  family_id: number | null
  category: SelfCareCategory
  label: string
  emoji: string
  time_of_day: SelfCareTimeOfDay
  created_at: string
}
export interface SelfCareItemInsert {
  family_id: number | null; category: SelfCareCategory; label: string; emoji: string; time_of_day: SelfCareTimeOfDay
}

export interface MemberSelfCareRow {
  id: number
  member_id: number
  item_id: number
  position: number
  created_at: string
}
export interface MemberSelfCareInsert {
  member_id: number; item_id: number; position: number
}

export interface SelfCareCompletionRow {
  id: number
  member_id: number
  item_id: number
  done_date: string
  completed_at: string
}
export interface SelfCareCompletionInsert {
  member_id: number; item_id: number; done_date: string
}

export interface MyDayTaskRow {
  id: number
  member_id: number
  task_id: number
  day: string
  position: number
  completed_at: string | null
  created_at: string
}
export interface MyDayTaskInsert {
  member_id: number; task_id: number; day: string; position?: number
}
