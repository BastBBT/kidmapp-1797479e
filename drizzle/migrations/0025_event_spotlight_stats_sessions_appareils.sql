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
           -- champs existants, inchangés
           count(l.id) FILTER (WHERE l.kind = 'shown' AND NOT l.is_last) AS "shown",
           count(l.id) FILTER (WHERE l.kind = 'shown' AND l.is_last) AS "shownLast",
           count(l.id) FILTER (WHERE l.kind = 'open') AS "opens",
           count(l.id) FILTER (WHERE l.kind = 'calendar') AS "calendarAdds",
           count(l.id) FILTER (WHERE l.kind = 'dismiss') AS "dismisses",
           count(DISTINCT l.visitor) FILTER (WHERE l.kind = 'shown') AS "uniqueViewers",
           -- nouveaux : sessions (un `session_id` = une ouverture d'app de plus de 30 min d'écart)
           count(DISTINCT l.session_id) FILTER (WHERE l.kind = 'shown') AS "sessionsShown",
           count(DISTINCT l.session_id) FILTER (WHERE l.kind IN ('open', 'calendar')) AS "sessionsClicked",
           -- nouveaux : appareils uniques qui ont agi (un appareil = un `device_id`, à défaut le compte, à défaut la session)
           count(DISTINCT l.visitor) FILTER (WHERE l.kind IN ('open', 'calendar')) AS "uniqueClickers",
           count(DISTINCT l.visitor) FILTER (WHERE l.kind = 'open') AS "uniqueOpeners",
           count(DISTINCT l.visitor) FILTER (WHERE l.kind = 'calendar') AS "uniqueCalendarAdders",
           count(DISTINCT l.visitor) FILTER (WHERE l.kind = 'dismiss') AS "uniqueDismissers",
           min(l.created_at) FILTER (WHERE l.kind = 'shown') AS "firstShownAt",
           max(l.created_at) FILTER (WHERE l.kind = 'shown') AS "lastShownAt",
           -- nouveau : les trois plateformes, séparément
           jsonb_build_object(
             'web', jsonb_build_object(
               'viewers', count(DISTINCT l.visitor) FILTER (WHERE l.kind = 'shown' AND l.platform = 'web'),
               'clickers', count(DISTINCT l.visitor) FILTER (WHERE l.kind IN ('open', 'calendar') AND l.platform = 'web')),
             'ios', jsonb_build_object(
               'viewers', count(DISTINCT l.visitor) FILTER (WHERE l.kind = 'shown' AND l.platform = 'ios'),
               'clickers', count(DISTINCT l.visitor) FILTER (WHERE l.kind IN ('open', 'calendar') AND l.platform = 'ios')),
             'android', jsonb_build_object(
               'viewers', count(DISTINCT l.visitor) FILTER (WHERE l.kind = 'shown' AND l.platform = 'android'),
               'clickers', count(DISTINCT l.visitor) FILTER (WHERE l.kind IN ('open', 'calendar') AND l.platform = 'android'))
           ) AS "byPlatform"
    FROM public.event_spotlights s
    JOIN public.events e ON e.id = s.event_id
    LEFT JOIN (
      SELECT g.*, COALESCE(g.device_id::text, g.user_id::text, g.session_id::text) AS visitor
      FROM public.event_spotlight_logs g
      WHERE (g.user_id IS NULL OR NOT (g.user_id = ANY(v_excluded)))
        AND (g.device_id IS NULL OR NOT (g.device_id = ANY(v_excluded_devices)))
    ) l ON l.spotlight_id = s.id
    GROUP BY s.id, s.headline, e.name, s.starts_on, s.ends_on, s.created_at
  ) t;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_event_spotlight_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_event_spotlight_stats() TO authenticated;