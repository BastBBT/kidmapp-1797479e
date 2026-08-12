CREATE OR REPLACE FUNCTION public.events_guard_admin_fav()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() = 1
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin(auth.uid()) THEN
    NEW.admin_fav := OLD.admin_fav;
    NEW.admin_fav_at := OLD.admin_fav_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_guard_admin_fav ON public.events;
CREATE TRIGGER events_guard_admin_fav
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.events_guard_admin_fav();