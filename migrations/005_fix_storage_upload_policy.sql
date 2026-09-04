-- Migration 005: Fix storage upload policy RLS recursion
-- Run this in Supabase SQL Editor
--
-- The old storage policies compared the folder name against a subquery on
-- members (self-referential RLS -> recursion / 403 on upload). We replace that
-- with a SECURITY DEFINER helper that looks up the caller's family id with
-- owner privileges, bypassing members RLS entirely.

CREATE OR REPLACE FUNCTION public.get_family_id_for_auth_uid()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM members WHERE auth_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_family_id_for_auth_uid() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_family_id_for_auth_uid() TO authenticated;

-- Recreate storage policies using the helper (idempotent)

DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'session-photos' AND
  (storage.foldername(name))[1] = public.get_family_id_for_auth_uid()::text
);

DROP POLICY IF EXISTS "Authenticated users can update own family photos" ON storage.objects;
CREATE POLICY "Authenticated users can update own family photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'session-photos' AND
  (storage.foldername(name))[1] = public.get_family_id_for_auth_uid()::text
);

DROP POLICY IF EXISTS "Authenticated users can delete own family photos" ON storage.objects;
CREATE POLICY "Authenticated users can delete own family photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'session-photos' AND
  (storage.foldername(name))[1] = public.get_family_id_for_auth_uid()::text
);
