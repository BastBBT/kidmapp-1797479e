-- Copie de drizzle/migrations/0012_admin_top_pages.sql (appliquée par Lovable le 2026-10-17).

-- Classement des fiches les plus visitées (lieux / activités et sorties), pour l'onglet admin
-- « Top pages ». Lit `page_views` (chemins `/location/<uuid>` et `/event/<uuid>`), écrits par le web
-- et, depuis la version qui suit cette PR, par les apps iOS et Android (même chemins, `platform`
-- distingue l'origine). Les versions d'apps plus anciennes n'écrivent qu'une ligne `/app/session`.
-- Les visites des admins (et du compte de test events) sont exclues, comme dans admin_audience_stats.
CREATE OR REPLACE FUNCTION public.admin_top_pages()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_since30 timestamptz := now() - interval '30 days';
  v_excluded uuid[];
  v_tracking_since timestamptz;
  v_locations jsonb;
  v_events jsonb;
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

  -- Premier chemin de fiche journalisé = début de la colonne « depuis le début ».
  SELECT min(created_at) INTO v_tracking_since
  FROM public.page_views
  WHERE path ~* '^/(location|event)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  -- L'identifiant reste en texte des deux côtés : aucun cast uuid sur une valeur venue du client.
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t."views30d" DESC, t."viewsTotal" DESC, t.name), '[]'::jsonb)
  INTO v_locations
  FROM (
    SELECT l.id, l.name, l.category, l.city,
           jsonb_build_object(
             'web', jsonb_build_object('views30d', count(pv.path) FILTER (WHERE pv.platform = 'web' AND pv.created_at >= v_since30),
                                       'viewsTotal', count(pv.path) FILTER (WHERE pv.platform = 'web')),
             'ios', jsonb_build_object('views30d', count(pv.path) FILTER (WHERE pv.platform = 'ios' AND pv.created_at >= v_since30),
                                       'viewsTotal', count(pv.path) FILTER (WHERE pv.platform = 'ios')),
             'android', jsonb_build_object('views30d', count(pv.path) FILTER (WHERE pv.platform = 'android' AND pv.created_at >= v_since30),
                                           'viewsTotal', count(pv.path) FILTER (WHERE pv.platform = 'android'))
           ) AS "byPlatform",
           count(pv.path) AS "viewsTotal",
           count(pv.path) FILTER (WHERE pv.created_at >= v_since30) AS "views30d",
           count(DISTINCT COALESCE(pv.device_id::text, pv.user_id::text))
             FILTER (WHERE pv.created_at >= v_since30) AS "visitors30d"
    FROM public.locations l
    LEFT JOIN (
      SELECT lower(substr(path, length('/location/') + 1)) AS ref, path, platform, created_at, device_id, user_id
      FROM public.page_views
      WHERE path ~* '^/location/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND (user_id IS NULL OR NOT (user_id = ANY(v_excluded)))
    ) pv ON pv.ref = l.id::text
    WHERE l.status = 'published'
    GROUP BY l.id, l.name, l.category, l.city
  ) t;

  -- Sorties : seulement celles qui ont été visitées (leur nombre est bien plus grand que celui des lieux).
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t."views30d" DESC, t."viewsTotal" DESC, t.name), '[]'::jsonb)
  INTO v_events
  FROM (
    SELECT e.id, e.name, e.status, e.date_start AS "dateStart", e.recurrence_label AS "recurrenceLabel",
           jsonb_build_object(
             'web', jsonb_build_object('views30d', count(pv.path) FILTER (WHERE pv.platform = 'web' AND pv.created_at >= v_since30),
                                       'viewsTotal', count(pv.path) FILTER (WHERE pv.platform = 'web')),
             'ios', jsonb_build_object('views30d', count(pv.path) FILTER (WHERE pv.platform = 'ios' AND pv.created_at >= v_since30),
                                       'viewsTotal', count(pv.path) FILTER (WHERE pv.platform = 'ios')),
             'android', jsonb_build_object('views30d', count(pv.path) FILTER (WHERE pv.platform = 'android' AND pv.created_at >= v_since30),
                                           'viewsTotal', count(pv.path) FILTER (WHERE pv.platform = 'android'))
           ) AS "byPlatform",
           count(pv.path) AS "viewsTotal",
           count(pv.path) FILTER (WHERE pv.created_at >= v_since30) AS "views30d",
           count(DISTINCT COALESCE(pv.device_id::text, pv.user_id::text))
             FILTER (WHERE pv.created_at >= v_since30) AS "visitors30d"
    FROM public.events e
    JOIN (
      SELECT lower(substr(path, length('/event/') + 1)) AS ref, path, platform, created_at, device_id, user_id
      FROM public.page_views
      WHERE path ~* '^/event/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND (user_id IS NULL OR NOT (user_id = ANY(v_excluded)))
    ) pv ON pv.ref = e.id::text
    GROUP BY e.id, e.name, e.status, e.date_start, e.recurrence_label
    ORDER BY count(pv.path) FILTER (WHERE pv.created_at >= v_since30) DESC, count(pv.path) DESC
    LIMIT 100
  ) t;

  RETURN jsonb_build_object(
    'trackingSince', v_tracking_since,
    'locations', v_locations,
    'events', v_events
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_top_pages() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_top_pages() TO authenticated;
