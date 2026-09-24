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
  v_split_since timestamptz;
  v_by_platform jsonb;
  v_daily_platform jsonb;
  v_versions jsonb;
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
    SELECT user_id FROM public.page_views
    WHERE created_at >= v_since30 AND user_id IS NOT NULL AND NOT (user_id = ANY(v_excluded))
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
  FROM public.profiles p WHERE NOT (p.id = ANY(v_excluded));

  v_active_pct := CASE WHEN v_total_registered > 0
    THEN round((v_unique_logged::numeric / v_total_registered) * 100)::int
    ELSE 0 END;

  SELECT min(created_at) INTO v_split_since
  FROM public.page_views
  WHERE session_id IS NOT NULL
    AND (user_id IS NULL OR NOT (user_id = ANY(v_excluded)));

  SELECT jsonb_object_agg(pl.platform, jsonb_build_object(
    'sessions', COALESCE(a.sessions, 0),
    'uniques', COALESCE(a.uniques, 0),
    'loggedUniques', COALESCE(a.logged, 0),
    'recurring', COALESCE(rc.recurring, 0),
    'pageViews', COALESCE(a.page_views, 0)
  )) INTO v_by_platform
  FROM (VALUES ('web'), ('ios'), ('android')) AS pl(platform)
  LEFT JOIN (
    SELECT platform,
           count(*) AS page_views,
           count(DISTINCT session_id) AS sessions,
           count(DISTINCT device_id) AS uniques,
           count(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS logged
    FROM public.page_views
    WHERE created_at >= v_since30
      AND (user_id IS NULL OR NOT (user_id = ANY(v_excluded)))
    GROUP BY platform
  ) a ON a.platform = pl.platform
  LEFT JOIN (
    SELECT platform, count(*) AS recurring FROM (
      SELECT platform, user_id FROM public.page_views
      WHERE created_at >= v_since30 AND user_id IS NOT NULL AND NOT (user_id = ANY(v_excluded))
      GROUP BY platform, user_id
      HAVING count(DISTINCT (created_at AT TIME ZONE 'UTC')::date) >= 2
    ) x GROUP BY platform
  ) rc ON rc.platform = pl.platform;

  SELECT COALESCE(jsonb_object_agg(day_key, plats), '{}'::jsonb) INTO v_daily_platform
  FROM (
    SELECT g.day::text AS day_key,
           jsonb_object_agg(pl.platform, jsonb_build_object(
             'sessions', COALESCE(s.sessions, 0),
             'uniques', COALESCE(s.uniques, 0),
             'pageViews', COALESCE(s.page_views, 0))) AS plats
    FROM generate_series(
           ((now() - interval '6 days') AT TIME ZONE 'UTC')::date,
           (now() AT TIME ZONE 'UTC')::date,
           interval '1 day') AS g(day)
    CROSS JOIN (VALUES ('web'), ('ios'), ('android')) AS pl(platform)
    LEFT JOIN (
      SELECT (created_at AT TIME ZONE 'UTC')::date AS day, platform,
             count(*) AS page_views,
             count(DISTINCT session_id) AS sessions,
             count(DISTINCT device_id) AS uniques
      FROM public.page_views
      WHERE created_at >= v_since7
        AND (user_id IS NULL OR NOT (user_id = ANY(v_excluded)))
      GROUP BY 1, 2
    ) s ON s.day = g.day::date AND s.platform = pl.platform
    GROUP BY g.day
  ) t;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'platform', platform, 'version', app_version, 'uniques', uniques)
         ORDER BY platform, uniques DESC), '[]'::jsonb) INTO v_versions
  FROM (
    SELECT platform, app_version, count(DISTINCT device_id) AS uniques
    FROM public.page_views
    WHERE created_at >= v_since30
      AND platform IN ('ios', 'android')
      AND app_version IS NOT NULL
      AND (user_id IS NULL OR NOT (user_id = ANY(v_excluded)))
    GROUP BY platform, app_version
  ) v;

  RETURN jsonb_build_object(
    'totalVisits30d', v_total_visits,
    'uniqueLoggedVisitors30d', v_unique_logged,
    'recurringVisitors30d', v_recurring,
    'daily7d', v_daily,
    'totalRegistered', v_total_registered,
    'activePct30d', v_active_pct,
    'splitTrackingSince', v_split_since,
    'byPlatform30d', v_by_platform,
    'daily7dByPlatform', v_daily_platform,
    'appVersions30d', v_versions
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_audience_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_audience_stats() TO authenticated;