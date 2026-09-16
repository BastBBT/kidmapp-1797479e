ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS booking_url text NULL;

ALTER TABLE public.link_clicks
  ADD COLUMN IF NOT EXISTS link_type text NOT NULL DEFAULT 'website'
    CHECK (link_type IN ('website', 'booking'));

DROP FUNCTION IF EXISTS public.admin_link_clicks_stats(integer);

CREATE FUNCTION public.admin_link_clicks_stats(p_days integer DEFAULT 30)
RETURNS TABLE (
  entity_type text,
  entity_id uuid,
  name text,
  category text,
  website text,
  booking_url text,
  link_type text,
  click_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    c.entity_type,
    c.entity_id,
    COALESCE(l.name, e.name) AS name,
    COALESCE(l.category, c.category) AS category,
    COALESCE(l.website, e.website) AS website,
    e.booking_url AS booking_url,
    c.link_type AS link_type,
    count(*) AS click_count
  FROM public.link_clicks c
  LEFT JOIN public.locations l ON c.entity_type = 'location' AND l.id = c.entity_id
  LEFT JOIN public.events e ON c.entity_type = 'event' AND e.id = c.entity_id
  WHERE c.created_at >= now() - make_interval(days => GREATEST(p_days, 1))
  GROUP BY c.entity_type, c.entity_id, COALESCE(l.name, e.name),
           COALESCE(l.category, c.category), COALESCE(l.website, e.website),
           e.booking_url, c.link_type
  ORDER BY count(*) DESC
  LIMIT 50;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_link_clicks_stats(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_link_clicks_stats(integer) TO authenticated;