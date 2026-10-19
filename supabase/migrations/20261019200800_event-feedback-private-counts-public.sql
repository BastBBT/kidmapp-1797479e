-- Copie de drizzle/migrations/0015_event_feedback_private_counts_public.sql (appliquée par Lovable le 2026-10-19).
-- event_feedback : chacun ne lit que son vote + commentaire (admin : tout) ; les totaux 👍/👎 restent publics via la RPC get_event_feedback_counts.

CREATE OR REPLACE FUNCTION public.get_event_feedback_counts(_event_id uuid)
RETURNS TABLE(up bigint, down bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT count(*) FILTER (WHERE verdict = 'up'), count(*) FILTER (WHERE verdict = 'down')
  FROM public.event_feedback WHERE event_id = _event_id
$$;
GRANT EXECUTE ON FUNCTION public.get_event_feedback_counts(uuid) TO anon, authenticated, service_role;

-- guard:allow-destructive remplacement de la policy de lecture publique par own-or-admin (voulu : les totaux passent par la RPC), aucune donnée touchée
DROP POLICY IF EXISTS event_feedback_select_public ON public.event_feedback;
CREATE POLICY event_feedback_select_own_or_admin ON public.event_feedback
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));