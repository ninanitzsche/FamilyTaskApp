-- Migration 008: Remap legacy avatar colors to AA-safe palette
-- Run this in Supabase SQL Editor
--
-- Background (UX audit 2026-08-09):
--   The member picker used to offer #FDCB6E / #FF8E53 / #A29BFE. These are
--   stored in members.color and rendered as the avatar background behind a
--   white initial (Profile.tsx). White text on these three fails WCAG AA
--   (1.4-2.3:1). The picker palette now uses AA-safe replacements, but rows
--   created earlier keep the legacy hex values.
--
-- Remap (all old values fail with white text):
--   '#FDCB6E' (1.40)  -> '#8A6D00' (4.92)
--   '#FF8E53' (~2.2)  -> '#C9422B' (4.89)
--   '#A29BFE' (2.43)  -> '#7968CA' (4.52)
--
-- Idempotent: only touches rows that still hold a legacy value.
-- '#' must be escaped as '\\#' in a standard-conforming string.

update members
set color = case
  when color = '#FDCB6E' then '#8A6D00'
  when color = '#FF8E53' then '#C9422B'
  when color = '#A29BFE' then '#7968CA'
  else color
end;
