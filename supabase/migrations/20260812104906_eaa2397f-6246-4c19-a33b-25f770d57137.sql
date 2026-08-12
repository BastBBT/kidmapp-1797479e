CREATE TABLE public.event_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  date_start date NOT NULL,
  date_end date,
  time text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.event_occurrences TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_occurrences TO authenticated;
GRANT ALL ON public.event_occurrences TO service_role;

ALTER TABLE public.event_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_occurrences_select_published" ON public.event_occurrences
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_occurrences.event_id AND e.status = 'published')
  );

CREATE POLICY "event_occurrences_select_own" ON public.event_occurrences
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_occurrences.event_id AND e.user_id = auth.uid())
  );

CREATE POLICY "event_occurrences_select_admin" ON public.event_occurrences
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "event_occurrences_insert_admin" ON public.event_occurrences
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "event_occurrences_insert_own_pending" ON public.event_occurrences
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_occurrences.event_id AND e.user_id = auth.uid() AND e.status = 'pending')
  );

CREATE POLICY "event_occurrences_update_admin" ON public.event_occurrences
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "event_occurrences_update_own_pending" ON public.event_occurrences
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_occurrences.event_id AND e.user_id = auth.uid() AND e.status = 'pending'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_occurrences.event_id AND e.user_id = auth.uid() AND e.status = 'pending'));

CREATE POLICY "event_occurrences_delete_admin" ON public.event_occurrences
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "event_occurrences_delete_own_pending" ON public.event_occurrences
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_occurrences.event_id AND e.user_id = auth.uid() AND e.status = 'pending')
  );

CREATE INDEX event_occurrences_event_id_idx ON public.event_occurrences (event_id);
CREATE INDEX event_occurrences_date_start_idx ON public.event_occurrences (date_start);

CREATE TRIGGER event_occurrences_updated_at
  BEFORE UPDATE ON public.event_occurrences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.event_occurrences (event_id, date_start, date_end, time)
SELECT id, date_start, date_end, time FROM public.events;

CREATE OR REPLACE FUNCTION public.sync_event_dates_from_occurrences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_event uuid;
  earliest RECORD;
BEGIN
  target_event := COALESCE(NEW.event_id, OLD.event_id);

  SELECT date_start, date_end, time INTO earliest
  FROM public.event_occurrences
  WHERE event_id = target_event
  ORDER BY date_start ASC, time ASC NULLS LAST
  LIMIT 1;

  IF earliest IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.events
  SET date_start = earliest.date_start, date_end = earliest.date_end, time = earliest.time
  WHERE id = target_event;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER event_occurrences_sync_legacy
  AFTER INSERT OR UPDATE OR DELETE ON public.event_occurrences
  FOR EACH ROW EXECUTE FUNCTION public.sync_event_dates_from_occurrences();

CREATE OR REPLACE FUNCTION public.create_default_occurrence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.event_occurrences (event_id, date_start, date_end, time)
  VALUES (NEW.id, NEW.date_start, NEW.date_end, NEW.time);
  RETURN NEW;
END;
$$;

CREATE TRIGGER events_create_default_occurrence
  AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.create_default_occurrence();