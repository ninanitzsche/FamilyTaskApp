-- Migration 007: Harden RLS policies (family-scoped insert, self-update, unique mission)
-- Run this in Supabase SQL Editor
--
-- Audit findings C1/C2/C8:
--   C1: INSERT policies on all main tables used WITH CHECK (true) -> any
--       authenticated user could insert rows into any family.
--   C2: members UPDATE policy was family-wide -> a child could overwrite
--       another member's xp/level/role.
--   C8: weekly_missions had no UNIQUE(family_id, week_start) -> duplicate
--       rows under concurrent create-on-miss.
--
-- Fixes (all idempotent):
--   * Recreate INSERT policies for sessions/tasks/rewards/reward_redemptions/
--     weekly_missions so inserts are scoped to the caller's own family via
--     public.get_family_id_for_auth_uid() (SECURITY DEFINER from migration 005).
--   * Restrict members UPDATE to the caller's own row (self-update only).
--   * Add UNIQUE(family_id, week_start) on weekly_missions.
--
-- Known limitation: members INSERT is intentionally left as-is (WITH CHECK (true)).
--   At invite-join time there is no existing members row for the current
--   auth.uid(), so get_family_id_for_auth_uid() returns NULL and a family
--   check would reject the join itself. Residual risk: an authenticated user
--   can create a members row with ANY family_id (e.g. joinder a family without
--   the invite code). The join flow validates the invite code client-side only.
--
-- RLS is already enabled on all tables and SELECT policies for all of them
-- already exist (supabase-schema.sql / migration 006), so the app reads are
-- unaffected. families INSERT stays WITH CHECK (true): the user creates a
-- family before any member row exists.

-- 1. Harden INSERT policies: scope to the caller's own family (C1)

-- SESSIONS
DROP POLICY IF EXISTS "authenticated can insert sessions" ON sessions;
CREATE POLICY "authenticated can insert sessions"
  ON sessions FOR INSERT TO authenticated
  WITH CHECK (family_id = public.get_family_id_for_auth_uid());

-- TASKS
DROP POLICY IF EXISTS "authenticated can insert tasks" ON tasks;
CREATE POLICY "authenticated can insert tasks"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (family_id = public.get_family_id_for_auth_uid());

-- REWARDS
DROP POLICY IF EXISTS "authenticated can insert rewards" ON rewards;
CREATE POLICY "authenticated can insert rewards"
  ON rewards FOR INSERT TO authenticated
  WITH CHECK (family_id = public.get_family_id_for_auth_uid());

-- REWARD REDEMPTIONS (no family_id column: scope via reward -> family)
DROP POLICY IF EXISTS "authenticated can insert redemptions" ON reward_redemptions;
CREATE POLICY "authenticated can insert redemptions"
  ON reward_redemptions FOR INSERT TO authenticated
  WITH CHECK (
    reward_id IN (
      SELECT id FROM rewards WHERE family_id = public.get_family_id_for_auth_uid()
    )
  );

-- WEEKLY MISSIONS
DROP POLICY IF EXISTS "authenticated can insert missions" ON weekly_missions;
CREATE POLICY "authenticated can insert missions"
  ON weekly_missions FOR INSERT TO authenticated
  WITH CHECK (family_id = public.get_family_id_for_auth_uid());

-- 2. Restrict members UPDATE to the caller's own row (C2)
--    The app only ever calls updateMember(member.id, ...) on the signed-in
--    member (Profile, SessionResult, Dashboard, Rewards). This prevents a
--    child from changing another family member's role/xp/level/streak.
DROP POLICY IF EXISTS "members can update own family members" ON members;
CREATE POLICY "Members update own row"
  ON members FOR UPDATE TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- 3. Prevent duplicate weekly_missions rows per family per week (C8)
-- 3a. Deduplicate existing rows first: merge member_progress (max per key)
--     into the earliest id, then delete the duplicate rows. Idempotent:
--     runs only when duplicates exist for a given family+week.
UPDATE weekly_missions AS w
SET member_progress = (
  SELECT coalesce(jsonb_object_agg(kv.key, kv.value), '{}')
  FROM (
    SELECT p.key AS key, to_jsonb(max((p.value)::int)) AS value
    FROM weekly_missions m
    CROSS JOIN LATERAL jsonb_each_text(m.member_progress) AS p(key, value)
    WHERE (m.family_id, m.week_start) = (w.family_id, w.week_start)
    GROUP BY p.key
  ) kv
)
WHERE w.id IN (
  SELECT min(id) AS keep_id
  FROM weekly_missions
  GROUP BY family_id, week_start
  HAVING count(*) > 1
);

DELETE FROM weekly_missions w
USING weekly_missions w2
WHERE (w.family_id, w.week_start) = (w2.family_id, w2.week_start)
  AND w.id > w2.id;

-- 3b. Add the UNIQUE constraint now that duplicates are gone.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'weekly_missions_family_week_unique'
      AND conrelid = 'public.weekly_missions'::regclass
  ) THEN
    ALTER TABLE weekly_missions
      ADD CONSTRAINT weekly_missions_family_week_unique UNIQUE (family_id, week_start);
  END IF;
END $$;