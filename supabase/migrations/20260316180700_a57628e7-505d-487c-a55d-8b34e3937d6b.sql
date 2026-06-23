
-- Create circulars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('circulars', 'circulars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view files in circulars bucket  
CREATE POLICY "Anyone can view circular files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'circulars');

-- Allow authenticated/public uploads to circulars bucket (admin manages via app)
CREATE POLICY "Allow uploads to circulars bucket"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'circulars');

-- Add document_url column to circulars table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'circulars' AND column_name = 'document_url'
  ) THEN
    ALTER TABLE public.circulars ADD COLUMN document_url text;
  END IF;
END $$;

-- Make schools location fields optional (allow TBD defaults for team-based usage)
ALTER TABLE public.schools ALTER COLUMN zone SET DEFAULT '';
ALTER TABLE public.schools ALTER COLUMN subcounty SET DEFAULT '';
ALTER TABLE public.schools ALTER COLUMN county SET DEFAULT '';
ALTER TABLE public.schools ALTER COLUMN region SET DEFAULT '';
