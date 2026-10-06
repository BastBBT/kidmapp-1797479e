ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS opening_hours jsonb,
  ADD COLUMN IF NOT EXISTS opening_hours_source text,
  ADD COLUMN IF NOT EXISTS opening_hours_updated_at timestamptz;

ALTER TABLE public.locations
  ADD CONSTRAINT locations_opening_hours_source_check
  CHECK (opening_hours_source IS NULL OR opening_hours_source IN ('google_auto','manuel'));

CREATE UNIQUE INDEX IF NOT EXISTS locations_google_place_id_key
  ON public.locations (google_place_id) WHERE google_place_id IS NOT NULL;