CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_excluded uuid[];
  v_bot_id uuid;
  v_since30 timestamptz := now() - interval '30 days';
  v_since7 timestamptz := now() - interval '7 days';
  v_total_locations bigint;
  v_published_locations bigint;
  v_pending_locations bigint;
  v_total_contribs bigint;
  v_pending_contribs bigint;
  v_daily_contribs jsonb;
  v_pending_proposals bigint;
  v_pending_events bigint;
  v_pending_events_bot bigint;
  v_pending_events_list jsonb;
  v_new_users30d bigint;
  v_acquisition jsonb;
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

  SELECT u.id INTO v_bot_id
  FROM auth.users u
  WHERE lower(u.email) = 'bastien.boubat+event@gmail.com'
  LIMIT 1;

  SELECT count(*),
         count(*) FILTER (WHERE status = 'published'),
         count(*) FILTER (WHERE status = 'pending')
  INTO v_total_locations, v_published_locations, v_pending_locations
  FROM public.locations;

  SELECT count(*),
         count(*) FILTER (WHERE status = 'pending')
  INTO v_total_contribs, v_pending_contribs
  FROM public.contributions
  WHERE user_id IS NULL OR NOT (user_id = ANY(v_excluded));

  SELECT COALESCE(
    jsonb_object_agg(d.day::text, d.count),
    '{}'::jsonb
  ) INTO v_daily_contribs
  FROM (
    SELECT (created_at AT TIME ZONE 'UTC')::date AS day,
           count(*) AS count
    FROM public.contributions
    WHERE created_at >= v_since7
      AND (user_id IS NULL OR NOT (user_id = ANY(v_excluded)))
    GROUP BY 1
  ) d;

  SELECT count(*) INTO v_pending_proposals
  FROM public.location_proposals
  WHERE status = 'pending'
    AND (user_id IS NULL OR NOT (user_id = ANY(v_excluded)));

  SELECT count(*),
         count(*) FILTER (WHERE user_id = v_bot_id)
  INTO v_pending_events, v_pending_events_bot
  FROM public.events
  WHERE status = 'pending';

  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'date_start', e.date_start) ORDER BY e.created_at DESC),
    '[]'::jsonb
  ) INTO v_pending_events_list
  FROM public.events e
  WHERE e.status = 'pending'
    AND (e.user_id IS NULL OR NOT (e.user_id = ANY(v_excluded)));

  SELECT count(*) INTO v_new_users30d
  FROM public.profiles p
  WHERE p.created_at >= v_since30
    AND NOT (p.id = ANY(v_excluded));

  SELECT COALESCE(
    jsonb_object_agg(a.source, a.count),
    '{}'::jsonb
  ) INTO v_acquisition
  FROM (
    SELECT acquisition_source AS source, count(*) AS count
    FROM public.profiles
    WHERE acquisition_source IS NOT NULL
      AND NOT (id = ANY(v_excluded))
    GROUP BY 1
  ) a;

  RETURN jsonb_build_object(
    'totalLocations', v_total_locations,
    'publishedLocations', v_published_locations,
    'pendingLocations', v_pending_locations,
    'totalContributions', v_total_contribs,
    'pendingContributions', v_pending_contribs,
    'contributionsDaily7d', v_daily_contribs,
    'pendingProposals', v_pending_proposals,
    'pendingEvents', v_pending_events,
    'pendingEventsBotCount', v_pending_events_bot,
    'pendingEventsList', v_pending_events_list,
    'newUsers30d', v_new_users30d,
    'acquisitionDistribution', v_acquisition,
    'acquisitionTotal', (SELECT count(*) FROM public.profiles WHERE acquisition_source IS NOT NULL AND NOT (id = ANY(v_excluded)))
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;