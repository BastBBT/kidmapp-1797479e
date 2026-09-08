CREATE TABLE public.link_clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('location', 'event')),
  entity_id uuid NOT NULL,
  category text,
  url text,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.link_clicks TO anon;
GRANT INSERT, SELECT ON public.link_clicks TO authenticated;
GRANT ALL ON public.link_clicks TO service_role;

ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a link click"
  ON public.link_clicks FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Admins can read link clicks"
  ON public.link_clicks FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_link_clicks_created_at ON public.link_clicks (created_at);
CREATE INDEX idx_link_clicks_entity ON public.link_clicks (entity_type, entity_id);

CREATE OR REPLACE FUNCTION public.admin_link_clicks_stats(p_days integer DEFAULT 30)
RETURNS TABLE (
  entity_type text,
  entity_id uuid,
  name text,
  category text,
  website text,
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
    count(*) AS click_count
  FROM public.link_clicks c
  LEFT JOIN public.locations l ON c.entity_type = 'location' AND l.id = c.entity_id
  LEFT JOIN public.events e ON c.entity_type = 'event' AND e.id = c.entity_id
  WHERE c.created_at >= now() - make_interval(days => GREATEST(p_days, 1))
  GROUP BY c.entity_type, c.entity_id, COALESCE(l.name, e.name), COALESCE(l.category, c.category), COALESCE(l.website, e.website)
  ORDER BY count(*) DESC
  LIMIT 50;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_link_clicks_stats(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_link_clicks_stats(integer) TO authenticated;