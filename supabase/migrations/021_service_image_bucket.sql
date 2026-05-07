-- Create the service-image storage bucket (public, so image URLs are directly accessible)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-image',
  'service-image',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images (upload route verifies auth before calling storage)
CREATE POLICY "Authenticated users can upload service images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'service-image');

-- Allow authenticated users to update/replace images
CREATE POLICY "Authenticated users can update service images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'service-image');

-- Allow authenticated users to delete their images
CREATE POLICY "Authenticated users can delete service images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'service-image');

-- Allow public read access (bucket is public, but policy is required for object-level reads)
CREATE POLICY "Public read access for service images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'service-image');
