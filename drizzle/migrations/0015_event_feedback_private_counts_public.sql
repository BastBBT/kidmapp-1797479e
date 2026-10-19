CREATE OR REPLACE FUNCTION public.get_event_feedback_counts(_event_id uuid)
RETURNS TABLE(up bigint, down bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT count(*) FILTER (WHERE verdict = 'up'), count(*) FILTER (WHERE verdict = 'down')
  FROM public.event_feedback WHERE event_id = _event_id
$$;
GRANT EXECUTE ON FUNCTION public.get_event_feedback_counts(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS event_feedback_select_public ON public.event_feedback;
CREATE POLICY event_feedback_select_own_or_admin ON public.event_feedback
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));