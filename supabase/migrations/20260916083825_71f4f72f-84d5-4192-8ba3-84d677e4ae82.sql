ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurrence_label text;

CREATE INDEX IF NOT EXISTS idx_events_location_id ON public.events(location_id);