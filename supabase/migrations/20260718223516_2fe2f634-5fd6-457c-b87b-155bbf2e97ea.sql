
CREATE TABLE public.event_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verdict text NOT NULL CHECK (verdict IN ('up','down')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX event_feedback_event_id_idx ON public.event_feedback(event_id);
CREATE INDEX event_feedback_user_id_idx ON public.event_feedback(user_id);

GRANT SELECT ON public.event_feedback TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_feedback TO authenticated;
GRANT ALL ON public.event_feedback TO service_role;

ALTER TABLE public.event_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_feedback_select_public"
  ON public.event_feedback FOR SELECT
  USING (true);

CREATE POLICY "event_feedback_insert_own"
  ON public.event_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "event_feedback_update_own"
  ON public.event_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "event_feedback_delete_own"
  ON public.event_feedback FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_event_feedback_updated_at
  BEFORE UPDATE ON public.event_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_event_feedback_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    PERFORM public.award_points(NEW.user_id, 5, 'event_feedback', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER event_feedback_award_points
  AFTER INSERT ON public.event_feedback
  FOR EACH ROW EXECUTE FUNCTION public.handle_event_feedback_points();
