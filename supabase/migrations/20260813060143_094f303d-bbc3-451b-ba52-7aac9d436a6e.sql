ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS admin_fav_visual_at timestamptz;

CREATE OR REPLACE FUNCTION public.mark_event_visual_generated(_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_admin(auth.uid())
    OR auth.jwt() ->> 'email' = 'bastien.boubat+event@gmail.com'
  ) THEN
    RAISE EXCEPTION 'non autorisé';
  END IF;

  UPDATE public.events
     SET admin_fav_visual_at = now()
   WHERE id = _event_id AND admin_fav;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'aucun événement coup de cœur avec cet identifiant';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_event_visual_generated(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mark_event_visual_generated(uuid) TO authenticated;