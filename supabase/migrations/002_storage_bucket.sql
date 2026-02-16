-- ProveIt: Storage bucket for submission images
-- Run in Supabase Dashboard -> SQL Editor

-- Create bucket for submission proof images (public read for display)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submission-images',
  'submission-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow authenticated users to upload to their own folder (path: user_id/filename)
DROP POLICY IF EXISTS "Users can upload submission images" ON storage.objects;
CREATE POLICY "Users can upload submission images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submission-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read for display
DROP POLICY IF EXISTS "Public read for submission images" ON storage.objects;
CREATE POLICY "Public read for submission images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'submission-images');
