-- Create the payment-proofs storage bucket (public, so the business dashboard can view proof URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Public upload — clients submit proof without being logged in (no auth required)
CREATE POLICY "Public upload for payment proofs"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'payment-proofs');

-- Public read access so business dashboard can display proof images
CREATE POLICY "Public read access for payment proofs"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'payment-proofs');

-- Authenticated users (business owners) can delete proofs
CREATE POLICY "Authenticated users can delete payment proofs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'payment-proofs');
