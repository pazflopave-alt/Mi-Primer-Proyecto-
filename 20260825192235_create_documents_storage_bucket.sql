/*
# Storage bucket for client documents

1. Creates a public storage bucket `client-documents` for PDF/XML uploads.
2. Storage policies: authenticated users can upload/read/delete files in this bucket.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'client-documents');

DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
CREATE POLICY "Allow authenticated reads" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'client-documents');

DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'client-documents');