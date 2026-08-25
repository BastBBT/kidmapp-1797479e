CREATE OR REPLACE FUNCTION public.admin_audience_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since30 timestamptz := now() - interval '30 days';
  v_since7 timestamptz := now() - interval '7 days';
  v_excluded uuid[];
  v_total_visits bigint;
  v_unique_logged bigint;
  v_recurring bigint;
  v_daily jsonb;
  v_total_registered bigint;
  v_active_pct integer;
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

  SELECT count(*), count(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)
  INTO v_total_visits, v_unique_logged
  FROM public.page_views
  WHERE created_at >= v_since30
    AND (user_id IS NULL OR NOT (user_id = ANY(v_excluded)));

  SELECT count(*) INTO v_recurring
  FROM (
    SELECT user_id
    FROM public.page_views
    WHERE created_at >= v_since30
      AND user_id IS NOT NULL
      AND NOT (user_id = ANY(v_excluded))
    GROUP BY user_id
    HAVING count(DISTINCT (created_at AT TIME ZONE 'UTC')::date) >= 2
  ) r;

  SELECT COALESCE(
    jsonb_object_agg(d.day::text, jsonb_build_object('visits', d.visits, 'uniques', d.uniques)),
    '{}'::jsonb
  ) INTO v_daily
  FROM (
    SELECT (created_at AT TIME ZONE 'UTC')::date AS day,
           count(*) AS visits,
           count(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS uniques
    FROM public.page_views
    WHERE created_at >= v_since7
      AND (user_id IS NULL OR NOT (user_id = ANY(v_excluded)))
    GROUP BY 1
  ) d;

  SELECT count(*) INTO v_total_registered
  FROM public.profiles p
  WHERE NOT (p.id = ANY(v_excluded));

  v_active_pct := CASE WHEN v_total_registered > 0
    THEN round((v_unique_logged::numeric / v_total_registered) * 100)::int
    ELSE 0 END;

  RETURN jsonb_build_object(
    'totalVisits30d', v_total_visits,
    'uniqueLoggedVisitors30d', v_unique_logged,
    'recurringVisitors30d', v_recurring,
    'daily7d', v_daily,
    'totalRegistered', v_total_registered,
    'activePct30d', v_active_pct
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_audience_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_audience_stats() TO authenticated;