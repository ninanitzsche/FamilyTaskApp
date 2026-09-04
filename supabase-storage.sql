-- Create storage bucket for session photos (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-photos', 'session-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Add file type and size restrictions
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'],
    file_size_limit = 5242880  -- 5MB
WHERE id = 'session-photos';

-- SECURITY DEFINER helper: looks up the caller's family id with owner
-- privileges, bypassing members RLS (self-referential members subqueries in
-- policies caused recursion -> 403 uploads). See migration 005.
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

-- Allow authenticated users to upload to their family's folder
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'session-photos' AND
  (storage.foldername(name))[1] = public.get_family_id_for_auth_uid()::text
);

-- Allow authenticated users to update their own family's photos
DROP POLICY IF EXISTS "Authenticated users can update own family photos" ON storage.objects;
CREATE POLICY "Authenticated users can update own family photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'session-photos' AND
  (storage.foldername(name))[1] = public.get_family_id_for_auth_uid()::text
);

-- Allow public read access to photos
DROP POLICY IF EXISTS "Public read access for photos" ON storage.objects;
CREATE POLICY "Public read access for photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'session-photos');

-- Allow authenticated users to delete their own family's photos
DROP POLICY IF EXISTS "Authenticated users can delete own family photos" ON storage.objects;
CREATE POLICY "Authenticated users can delete own family photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'session-photos' AND
  (storage.foldername(name))[1] = public.get_family_id_for_auth_uid()::text
);