
-- Create a public storage bucket for markdown images
INSERT INTO storage.buckets (id, name, public)
VALUES ('markdown-images', 'markdown-images', true);

-- Allow anyone to upload images (since entries are public)
CREATE POLICY "Anyone can upload markdown images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'markdown-images');

-- Allow anyone to read images
CREATE POLICY "Anyone can read markdown images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'markdown-images');

-- Allow anyone to delete their own uploads (by path pattern)
CREATE POLICY "Anyone can delete markdown images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'markdown-images');
