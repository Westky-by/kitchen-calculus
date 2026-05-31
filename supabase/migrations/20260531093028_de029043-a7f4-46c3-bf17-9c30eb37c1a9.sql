
-- Create private bucket for tax invoice source bill images
INSERT INTO storage.buckets (id, name, public)
VALUES ('bill-images', 'bill-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies on storage.objects for this bucket
CREATE POLICY "Bill images are viewable by authenticated users"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'bill-images');

CREATE POLICY "Active users can upload bill images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bill-images' AND public.current_user_is_active());

CREATE POLICY "Admins can delete bill images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bill-images' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));
