ALTER TABLE public.user_manuals
  ADD COLUMN IF NOT EXISTS file_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS file_name TEXT NOT NULL DEFAULT '';

INSERT INTO storage.buckets (id, name, public)
VALUES ('manual-files', 'manual-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Manual files are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'manual-files');

CREATE POLICY "Admins can upload manual files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'manual-files'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);

CREATE POLICY "Admins can update manual files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'manual-files'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);

CREATE POLICY "Admins can delete manual files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'manual-files'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);