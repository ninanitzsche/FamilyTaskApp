-- Migration 006: reward_redemptions table for weekly redemption limits
-- Run this in Supabase SQL Editor
--
-- Tracks each time a member redeems a reward so the app can enforce
-- max_redemptions_per_week. XP spent on rewards shares the members.xp_redeemed
-- counter with screen-time (single spend pool, no double counting).

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id bigint primary key generated always as identity,
  reward_id bigint not null references rewards(id) on delete cascade,
  member_id bigint not null references members(id) on delete cascade,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS reward_redemptions_reward_created_idx ON reward_redemptions(reward_id, created_at);
CREATE INDEX IF NOT EXISTS reward_redemptions_member_idx ON reward_redemptions(member_id);

ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Family-scoped access via the SECURITY DEFINER helper from migration 005
-- (avoids self-referential members subqueries -> RLS recursion).

DROP POLICY IF EXISTS "members can read own family redemptions" ON reward_redemptions;
CREATE POLICY "members can read own family redemptions"
  ON reward_redemptions FOR SELECT TO authenticated
  USING (
    reward_id IN (
      SELECT id FROM rewards WHERE family_id = public.get_family_id_for_auth_uid()
    )
  );

DROP POLICY IF EXISTS "authenticated can insert redemptions" ON reward_redemptions;
CREATE POLICY "authenticated can insert redemptions"
  ON reward_redemptions FOR INSERT TO authenticated
  WITH CHECK (true);
