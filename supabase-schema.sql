-- FamilyBoard Supabase Schema
-- Run this in Supabase SQL Editor

-- 1. FAMILIES
create table families (
  id bigint primary key generated always as identity,
  name text not null default '',
  invite_code text unique not null,
  created_at timestamptz not null default now()
);

-- 2. MEMBERS
create table members (
  id bigint primary key generated always as identity,
  family_id bigint not null references families(id) on delete cascade,
  auth_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  color text not null default '#6C5CE7',
  role text not null check (role in ('parent', 'child')) default 'child',
  xp integer not null default 0,
  level integer not null default 0,
  streak integer not null default 0,
  longest_streak integer not null default 0,
  last_session_at timestamptz,
  screen_time_balance integer not null default 0,
  xp_redeemed integer not null default 0,
  streak_saves_used integer not null default 0,
  streak_save_week text,
  created_at timestamptz not null default now()
);

-- 3. TASKS
create table tasks (
  id bigint primary key generated always as identity,
  family_id bigint not null references families(id) on delete cascade,
  title text not null,
  emoji text not null default '✅',
  image_url text,
  assignee_id bigint references members(id) on delete set null,
  recurring text not null check (recurring in ('never', 'daily', 'weekly')) default 'never',
  cooldown_days integer default 2,
  last_completed_at timestamptz,
  completed_count integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  task_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 4. SESSIONS
create table sessions (
  id bigint primary key generated always as identity,
  family_id bigint not null references families(id) on delete cascade,
  member_id bigint not null references members(id) on delete cascade,
  duration integer not null default 300,
  task_ids bigint[] not null default '{}',
  completed_task_ids bigint[] not null default '{}',
  xp_earned integer not null default 0,
  before_photo text,
  after_photo text,
  created_at timestamptz not null default now()
);

-- 5. REWARDS
create table rewards (
  id bigint primary key generated always as identity,
  family_id bigint not null references families(id) on delete cascade,
  title text not null,
  xp_cost integer not null default 100,
  max_redemptions_per_week integer default 0,
  created_at timestamptz not null default now()
);

-- 6. REWARD REDEMPTIONS
create table reward_redemptions (
  id bigint primary key generated always as identity,
  reward_id bigint not null references rewards(id) on delete cascade,
  member_id bigint not null references members(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 7. WEEKLY MISSIONS
create table weekly_missions (
  id bigint primary key generated always as identity,
  family_id bigint not null references families(id) on delete cascade,
  week_start date not null,
  task_ids bigint[] not null default '{}',
  target_completions integer not null default 3,
  member_progress jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint weekly_missions_family_week_unique unique (family_id, week_start)
);

-- Indexes
create index members_family_id_idx on members(family_id);
create index members_auth_id_idx on members(auth_id);
create index tasks_family_id_idx on tasks(family_id);
create index sessions_family_id_idx on sessions(family_id);
create index sessions_member_id_idx on sessions(member_id);
create index weekly_missions_family_id_idx on weekly_missions(family_id);
create index reward_redemptions_reward_created_idx on reward_redemptions(reward_id, created_at);
create index reward_redemptions_member_idx on reward_redemptions(member_id);

-- Row Level Security
alter table families enable row level security;
alter table members enable row level security;
alter table tasks enable row level security;
alter table sessions enable row level security;
alter table rewards enable row level security;
alter table reward_redemptions enable row level security;
alter table weekly_missions enable row level security;

-- SECURITY DEFINER helper for family-scoped lookups without RLS recursion
create or replace function public.get_family_id_for_auth_uid()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select family_id from members where auth_id = auth.uid() limit 1;
$$;

revoke all on function public.get_family_id_for_auth_uid() from public;
grant execute on function public.get_family_id_for_auth_uid() to authenticated;

-- RLS Policies: family-scoped access (MVP)
-- Families: members can only see their own family
create policy "members can read own family"
  on families for select to authenticated
  using (id in (select family_id from members where auth_id = auth.uid()));
create policy "authenticated can insert families"
  on families for insert to authenticated with check (true);

-- Members: can see members in their family; can only update their own row
create policy "members can read own family members"
  on members for select to authenticated
  using (family_id in (select family_id from members where auth_id = auth.uid()));
-- members INSERT intentionally stays WITH CHECK (true): joining a family by
-- invite code happens before any members row exists for the current auth.uid(),
-- so a family check here would reject the join itself. Residual risk: an
-- authenticated user can create a members row with any family_id.
create policy "authenticated can insert members"
  on members for insert to authenticated with check (true);
-- members UPDATE restricted to the caller's own row (self-update only).
create policy "Members update own row"
  on members for update to authenticated
  using (auth_id = auth.uid())
  with check (auth_id = auth.uid());

-- Tasks: can only see/update tasks in their family
create policy "members can read own family tasks"
  on tasks for select to authenticated
  using (family_id in (select family_id from members where auth_id = auth.uid()));
create policy "authenticated can insert tasks"
  on tasks for insert to authenticated
  with check (family_id = public.get_family_id_for_auth_uid());
create policy "members can update own family tasks"
  on tasks for update to authenticated
  using (family_id in (select family_id from members where auth_id = auth.uid()));
create policy "members can delete own family tasks"
  on tasks for delete to authenticated
  using (family_id in (select family_id from members where auth_id = auth.uid()));

-- Sessions: can only see/update sessions in their family
create policy "members can read own family sessions"
  on sessions for select to authenticated
  using (family_id in (select family_id from members where auth_id = auth.uid()));
create policy "authenticated can insert sessions"
  on sessions for insert to authenticated
  with check (family_id = public.get_family_id_for_auth_uid());
create policy "members can update own family sessions"
  on sessions for update to authenticated
  using (family_id in (select family_id from members where auth_id = auth.uid()));

-- Rewards: can only see/insert rewards in their family
create policy "members can read own family rewards"
  on rewards for select to authenticated
  using (family_id in (select family_id from members where auth_id = auth.uid()));
create policy "authenticated can insert rewards"
  on rewards for insert to authenticated
  with check (family_id = public.get_family_id_for_auth_uid());

-- Reward redemptions: members can track redemptions in their family
create policy "members can read own family redemptions"
  on reward_redemptions for select to authenticated
  using (reward_id in (select id from rewards where family_id = public.get_family_id_for_auth_uid()));
create policy "authenticated can insert redemptions"
  on reward_redemptions for insert to authenticated
  with check (reward_id in (select id from rewards where family_id = public.get_family_id_for_auth_uid()));

-- Weekly Missions: can only see/update missions in their family
create policy "members can read own family missions"
  on weekly_missions for select to authenticated
  using (family_id in (select family_id from members where auth_id = auth.uid()));
create policy "authenticated can insert missions"
  on weekly_missions for insert to authenticated
  with check (family_id = public.get_family_id_for_auth_uid());
create policy "members can update own family missions"
  on weekly_missions for update to authenticated
  using (family_id in (select family_id from members where auth_id = auth.uid()));
