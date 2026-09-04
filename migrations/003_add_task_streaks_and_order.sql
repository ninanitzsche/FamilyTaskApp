-- Migration 003: Add task streaks and order columns
-- Run this in Supabase SQL Editor

-- Add task streak columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS current_streak integer not null default 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS longest_streak integer not null default 0;

-- Add task order column for drag-and-drop persistence
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_order integer not null default 0;

-- Update weekly_missions default target_completions
ALTER TABLE weekly_missions ALTER COLUMN target_completions SET DEFAULT 3;

-- Create index for task ordering
CREATE INDEX IF NOT EXISTS tasks_family_order_idx ON tasks(family_id, task_order);
