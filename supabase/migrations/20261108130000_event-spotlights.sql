-- 1. Les mises en avant (une ligne = une sortie mise en avant sur une période)
CREATE TABLE public.event_spotlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  headline text NOT NULL CHECK (char_length(btrim(headline)) BETWEEN 1 AND 50),
  message text CHECK (message IS NULL OR char_length(message) <= 140),
  -- Jours calendaires à Nantes, bornes incluses (pas de timestamp : évite les pièges de fuseau)
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  frequency text NOT NULL DEFAULT 'weekend' CHECK (frequency IN ('weekend', 'daily', 'once')),
  show_calendar_cta boolean NOT NULL DEFAULT true,
  show_photo boolean NOT NULL DEFAULT true,
  last_reminder boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_spotlights_period_check CHECK (ends_on >= starts_on)
);

CREATE INDEX event_spotlights_period_idx ON public.event_spotlights (starts_on DESC, ends_on);
CREATE INDEX event_spotlights_event_id_idx ON public.event_spotlights (event_id);

-- Accès Data API explicite (la RLS ci-dessous filtre les lignes)
GRANT SELECT ON public.event_spotlights TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_spotlights TO authenticated;
GRANT ALL ON public.event_spotlights TO service_role;

ALTER TABLE public.event_spotlights ENABLE ROW LEVEL SECURITY;

-- Lecture publique : seulement une mise en avant EN COURS, dont la sortie est publiée et pas passée.
CREATE POLICY event_spotlights_select_active
  ON public.event_spotlights FOR SELECT
  TO anon, authenticated
  USING (
    starts_on <= (now() AT TIME ZONE 'Europe/Paris')::date
    AND ends_on >= (now() AT TIME ZONE 'Europe/Paris')::date
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_spotlights.event_id
        AND e.status = 'published'
        AND COALESCE(e.date_end, e.date_start) >= (now() AT TIME ZONE 'Europe/Paris')::date
    )
  );

-- Admin : tout (planifiées, en cours, terminées) et seul à écrire.
CREATE POLICY event_spotlights_admin_all
  ON public.event_spotlights FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 2. La mesure : une ligne par événement vécu par un parent (insertion seule, comme page_views)
CREATE TABLE public.event_spotlight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spotlight_id uuid NOT NULL REFERENCES public.event_spotlights(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('shown', 'open', 'calendar', 'dismiss')),
  is_last boolean NOT NULL DEFAULT false,
  platform text NOT NULL DEFAULT 'web' CHECK (platform IN ('web', 'ios', 'android')),
  app_version text CHECK (app_version IS NULL OR char_length(app_version) <= 32),
  device_id uuid,
  session_id uuid,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX event_spotlight_logs_spotlight_idx
  ON public.event_spotlight_logs (spotlight_id, kind, created_at DESC);

-- Accès Data API explicite (la RLS ci-dessous filtre les lignes)
GRANT INSERT ON public.event_spotlight_logs TO anon;
GRANT SELECT, INSERT ON public.event_spotlight_logs TO authenticated;
GRANT ALL ON public.event_spotlight_logs TO service_role;

ALTER TABLE public.event_spotlight_logs ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut journaliser, mais seulement pour une mise en avant qu'il peut voir (donc en cours),
-- et user_id doit être nul ou égal à auth.uid().
CREATE POLICY event_spotlight_logs_insert_any
  ON public.event_spotlight_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.event_spotlights s WHERE s.id = spotlight_id)
  );

CREATE POLICY event_spotlight_logs_select_admin
  ON public.event_spotlight_logs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3. Statistiques pour l'onglet admin « À la une » (même logique d'exclusion des appareils admin que admin_top_pages)
CREATE OR REPLACE FUNCTION public.admin_event_spotlight_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_excluded uuid[];
  v_excluded_devices uuid[];
  v_result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'non autorisé';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_excluded
  FROM (
    SELECT p.id FROM public.profiles p WHERE p.role = 'admin'
    UNION
    SELECT u.id FROM auth.users u WHERE lower(u.email) = 'bastien.boubat+event@gmail.com'
  ) x;

  SELECT COALESCE(array_agg(DISTINCT device_id), ARRAY[]::uuid[]) INTO v_excluded_devices
  FROM public.page_views
  WHERE device_id IS NOT NULL AND user_id = ANY(v_excluded);

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t."startsOn" DESC, t."createdAt" DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT s.id, s.headline, e.name AS "eventName",
           s.starts_on AS "startsOn", s.ends_on AS "endsOn", s.created_at AS "createdAt",
           count(l.id) FILTER (WHERE l.kind = 'shown' AND NOT l.is_last) AS "shown",
           count(l.id) FILTER (WHERE l.kind = 'shown' AND l.is_last) AS "shownLast",
           count(l.id) FILTER (WHERE l.kind = 'open') AS "opens",
           count(l.id) FILTER (WHERE l.kind = 'calendar') AS "calendarAdds",
           count(l.id) FILTER (WHERE l.kind = 'dismiss') AS "dismisses",
           count(DISTINCT COALESCE(l.device_id::text, l.user_id::text, l.session_id::text))
             FILTER (WHERE l.kind = 'shown') AS "uniqueViewers"
    FROM public.event_spotlights s
    JOIN public.events e ON e.id = s.event_id
    LEFT JOIN public.event_spotlight_logs l
      ON l.spotlight_id = s.id
     AND (l.user_id IS NULL OR NOT (l.user_id = ANY(v_excluded)))
     AND (l.device_id IS NULL OR NOT (l.device_id = ANY(v_excluded_devices)))
    GROUP BY s.id, s.headline, e.name, s.starts_on, s.ends_on, s.created_at
  ) t;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_event_spotlight_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_event_spotlight_stats() TO authenticated;