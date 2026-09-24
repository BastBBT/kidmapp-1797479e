CREATE OR REPLACE FUNCTION public.admin_engagement_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_excluded uuid[];
  v_since30 timestamptz := now() - interval '30 days';
  v_excluded_emails text[];
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

  SELECT COALESCE(array_agg(lower(u.email)) FILTER (WHERE u.email IS NOT NULL), ARRAY[]::text[])
    INTO v_excluded_emails
  FROM auth.users u WHERE u.id = ANY(v_excluded);

  WITH reg AS (
    SELECT p.* FROM public.profiles p WHERE NOT (p.id = ANY(v_excluded))
  ),
  kids AS (
    SELECT c.user_id,
           count(*) AS n,
           bool_or(c.first_name IS NOT NULL AND btrim(c.first_name) <> '') AS has_name
    FROM public.children c JOIN reg ON reg.id = c.user_id
    GROUP BY c.user_id
  ),
  active AS (
    SELECT pv.user_id FROM public.page_views pv JOIN reg ON reg.id = pv.user_id
    WHERE pv.created_at >= v_since30
    GROUP BY pv.user_id
    HAVING count(DISTINCT (pv.created_at AT TIME ZONE 'UTC')::date) >= 2
  ),
  u AS (
    SELECT reg.id,
           reg.assistant_opens_count AS opens,
           reg.assistant_completions_count AS comps,
           (k.user_id IS NOT NULL) AS has_kids,
           COALESCE(k.has_name, false) AS has_name,
           COALESCE(k.n, 0) AS kids_n,
           (reg.zone_city IS NOT NULL AND btrim(reg.zone_city) <> '') AS has_zone,
           reg.digest_email_enabled AS d_email,
           reg.digest_push_enabled AS d_push,
           (a.user_id IS NOT NULL) AS is_active
    FROM reg
    LEFT JOIN kids k ON k.user_id = reg.id
    LEFT JOIN active a ON a.user_id = reg.id
  ),
  logs AS (
    SELECT l.template_name, l.status,
           (l.metadata->>'channel') IS NOT DISTINCT FROM 'push' AS is_push
    FROM public.email_send_log l
    WHERE l.created_at >= v_since30
      AND l.template_name IN ('weekly-digest', 'new-location-alert')
      AND NOT (
        CASE
          WHEN (l.metadata->>'channel') IS NOT DISTINCT FROM 'push' THEN
            CASE
              WHEN (l.metadata->>'user_id') IS NOT NULL
               AND (l.metadata->>'user_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              THEN COALESCE((l.metadata->>'user_id')::uuid = ANY(v_excluded), false)
              ELSE false
            END
          ELSE
            COALESCE(btrim(l.recipient_email), '') <> ''
            AND COALESCE(lower(l.recipient_email) = ANY(v_excluded_emails), false)
        END
      )
  ),
  sends AS (
    SELECT t.tpl,
      jsonb_build_object(
        'emailSent',      count(*) FILTER (WHERE NOT l.is_push AND l.status = 'sent'),
        'emailFailed',    count(*) FILTER (WHERE NOT l.is_push AND l.status = 'failed'),
        'emailSuppressed',count(*) FILTER (WHERE NOT l.is_push AND l.status = 'suppressed'),
        'skippedNoMatch', count(*) FILTER (WHERE NOT l.is_push AND l.status = 'skipped_no_match'),
        'pushSent',       count(*) FILTER (WHERE l.is_push AND l.status = 'sent'),
        'pushFailed',     count(*) FILTER (WHERE l.is_push AND l.status = 'failed'),
        'runAborted',     count(*) FILTER (WHERE l.status = 'run_aborted')
      ) AS obj
    FROM (VALUES ('weekly-digest'), ('new-location-alert')) t(tpl)
    LEFT JOIN logs l ON l.template_name = t.tpl
    GROUP BY t.tpl
  )
  SELECT jsonb_build_object(
    'registered', (SELECT count(*) FROM u),
    'assistant', (SELECT jsonb_build_object(
        'opens', COALESCE(sum(opens), 0),
        'completions', COALESCE(sum(comps), 0),
        'users', count(*) FILTER (WHERE opens > 0),
        'completers', count(*) FILTER (WHERE comps > 0)) FROM u),
    'profile', (SELECT jsonb_build_object(
        'withChildren', count(*) FILTER (WHERE has_kids),
        'withChildFirstName', count(*) FILTER (WHERE has_name),
        'childrenTotal', COALESCE(sum(kids_n), 0),
        'withZone', count(*) FILTER (WHERE has_zone),
        'digestEmail', count(*) FILTER (WHERE d_email),
        'digestPush', count(*) FILTER (WHERE d_push),
        'complete', count(*) FILTER (WHERE has_kids AND has_zone AND (d_email OR d_push))) FROM u),
    'pushDevices', (SELECT jsonb_build_object(
        'ios', count(DISTINCT d.user_id) FILTER (WHERE d.platform = 'ios'),
        'android', count(DISTINCT d.user_id) FILTER (WHERE d.platform = 'android'))
      FROM public.user_devices d JOIN u ON u.id = d.user_id),
    'sends30d', (SELECT jsonb_object_agg(tpl, obj) FROM sends),
    'digestFeedback30d', (SELECT jsonb_build_object(
        'sends', count(*),
        'reactions', jsonb_build_object(
          'love', count(*) FILTER (WHERE ds.reaction = 'love'),
          'neutral', count(*) FILTER (WHERE ds.reaction = 'neutral'),
          'sad', count(*) FILTER (WHERE ds.reaction = 'sad')),
        'unsubscribes', count(*) FILTER (WHERE ds.unsubscribed_at IS NOT NULL))
      FROM public.digest_sends ds JOIN u ON u.id = ds.user_id
      WHERE ds.created_at >= v_since30),
    'alertUnsubscribes30d', (SELECT count(*) FROM public.location_alert_sends las
      WHERE las.created_at >= v_since30 AND las.unsubscribed_at IS NOT NULL
        AND NOT (las.user_id = ANY(v_excluded))),
    'landingVisits30d', (SELECT jsonb_build_object(
        'semaine', count(*) FILTER (WHERE pv.path = '/semaine'),
        'nouveauxLieux', count(*) FILTER (WHERE pv.path = '/nouveaux-lieux'))
      FROM public.page_views pv
      WHERE pv.created_at >= v_since30
        AND (pv.user_id IS NULL OR NOT (pv.user_id = ANY(v_excluded)))),
    'retentionBySegment', (SELECT jsonb_build_object(
        'assistantCompleted', jsonb_build_object(
          'with', jsonb_build_object('users', count(*) FILTER (WHERE comps > 0), 'active', count(*) FILTER (WHERE comps > 0 AND is_active)),
          'without', jsonb_build_object('users', count(*) FILTER (WHERE NOT comps > 0), 'active', count(*) FILTER (WHERE NOT comps > 0 AND is_active))),
        'hasChildren', jsonb_build_object(
          'with', jsonb_build_object('users', count(*) FILTER (WHERE has_kids), 'active', count(*) FILTER (WHERE has_kids AND is_active)),
          'without', jsonb_build_object('users', count(*) FILTER (WHERE NOT has_kids), 'active', count(*) FILTER (WHERE NOT has_kids AND is_active))),
        'digestEnabled', jsonb_build_object(
          'with', jsonb_build_object('users', count(*) FILTER (WHERE d_email OR d_push), 'active', count(*) FILTER (WHERE (d_email OR d_push) AND is_active)),
          'without', jsonb_build_object('users', count(*) FILTER (WHERE NOT (d_email OR d_push)), 'active', count(*) FILTER (WHERE NOT (d_email OR d_push) AND is_active))))
      FROM u)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_engagement_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_engagement_stats() TO authenticated;
