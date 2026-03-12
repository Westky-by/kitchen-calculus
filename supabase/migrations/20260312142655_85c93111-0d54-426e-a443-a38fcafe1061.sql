
-- Add image_url column to assets
ALTER TABLE public.assets ADD COLUMN image_url TEXT NOT NULL DEFAULT '';

-- Create storage bucket for asset images
INSERT INTO storage.buckets (id, name, public) VALUES ('asset-images', 'asset-images', true);

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload asset images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'asset-images');

-- Allow public read
CREATE POLICY "Anyone can view asset images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'asset-images');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete asset images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'asset-images');

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update asset images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'asset-images');
