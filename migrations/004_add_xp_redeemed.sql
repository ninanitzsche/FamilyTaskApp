-- Migration 004: Add xp_redeemed column to prevent screen-time double-counting
-- Run this in Supabase SQL Editor

ALTER TABLE members ADD COLUMN IF NOT EXISTS xp_redeemed integer not null default 0;
