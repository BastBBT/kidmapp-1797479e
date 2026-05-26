
CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  path text NOT NULL,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX page_views_created_at_idx ON public.page_views (created_at DESC);
CREATE INDEX page_views_user_id_created_at_idx ON public.page_views (user_id, created_at DESC) WHERE user_id IS NOT NULL;

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authenticated) may insert a pageview. user_id must be null or match auth.uid().
CREATE POLICY page_views_insert_any
  ON public.page_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Only admins can read.
CREATE POLICY page_views_select_admin
  ON public.page_views FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
