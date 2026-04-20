ALTER TABLE public.location_proposals
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;