ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS admin_fav boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_fav_at timestamptz;

CREATE INDEX IF NOT EXISTS events_admin_fav_idx
  ON public.events (admin_fav, admin_fav_at DESC)
  WHERE admin_fav;