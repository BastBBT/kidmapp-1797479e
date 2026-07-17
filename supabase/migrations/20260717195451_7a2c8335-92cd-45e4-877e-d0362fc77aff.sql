
-- Table events
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  address text,
  lat double precision,
  lng double precision,
  date_start date NOT NULL,
  date_end date,
  time text,
  age_min integer,
  age_max integer,
  duration text,
  weather text,
  price text,
  website text,
  instagram text,
  photo text,
  note text,
  status text NOT NULL DEFAULT 'pending',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select_published" ON public.events
  FOR SELECT USING (status = 'published');

CREATE POLICY "events_select_own" ON public.events
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "events_select_admin" ON public.events
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "events_insert_own_pending" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "events_update_admin" ON public.events
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "events_update_own_pending" ON public.events
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "events_delete_admin" ON public.events
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "events_delete_own_pending" ON public.events
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

CREATE INDEX events_date_start_idx ON public.events (date_start);
CREATE INDEX events_status_idx ON public.events (status);
CREATE INDEX events_user_id_idx ON public.events (user_id);

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Points trigger when event is published
CREATE OR REPLACE FUNCTION public.handle_event_published_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.status = 'published'
     AND (OLD.status IS NULL OR OLD.status <> 'published') THEN
    PERFORM public.award_points(NEW.user_id, 25, 'event_published', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER events_award_points
  AFTER UPDATE OF status ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_event_published_points();

-- Table event_favorites
CREATE TABLE public.event_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_favorites TO authenticated;
GRANT ALL ON public.event_favorites TO service_role;

ALTER TABLE public.event_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_favorites_select_own" ON public.event_favorites
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "event_favorites_insert_own" ON public.event_favorites
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "event_favorites_delete_own" ON public.event_favorites
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX event_favorites_user_id_idx ON public.event_favorites (user_id);
CREATE INDEX event_favorites_event_id_idx ON public.event_favorites (event_id);
