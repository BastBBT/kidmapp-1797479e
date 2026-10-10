ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS photos text[];

ALTER TABLE public.events
  ADD CONSTRAINT events_photos_max_len
  CHECK (photos IS NULL OR cardinality(photos) <= 4);
