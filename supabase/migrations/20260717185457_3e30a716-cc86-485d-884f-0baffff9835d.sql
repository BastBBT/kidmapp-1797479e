ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS age_min int,
  ADD COLUMN IF NOT EXISTS age_max int;

ALTER TABLE public.location_proposals
  ADD COLUMN IF NOT EXISTS age_min int,
  ADD COLUMN IF NOT EXISTS age_max int;