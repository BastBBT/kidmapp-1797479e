ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS acquisition_source text,
  ADD COLUMN IF NOT EXISTS acquisition_detail text,
  ADD COLUMN IF NOT EXISTS acquisition_source_at timestamptz;