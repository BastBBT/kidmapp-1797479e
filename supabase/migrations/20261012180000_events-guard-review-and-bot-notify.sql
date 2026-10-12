CREATE OR REPLACE FUNCTION public.events_guard_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() = 1
     AND auth.uid() IS NOT NULL
     AND auth.uid() <> '06f50405-0211-4634-8bff-05741e08e107'::uuid
     AND NOT public.is_admin(auth.uid()) THEN
    IF TG_OP = 'UPDATE' THEN
      NEW.review_flags := OLD.review_flags;
      NEW.review_detail := OLD.review_detail;
      NEW.review_checked_at := OLD.review_checked_at;
    ELSE
      NEW.review_flags := '{}';
      NEW.review_detail := NULL;
      NEW.review_checked_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- guard:allow-destructive recréation idempotente du trigger (DROP IF EXISTS + CREATE), aucune donnée touchée
DROP TRIGGER IF EXISTS events_guard_review_fields ON public.events;
CREATE TRIGGER events_guard_review_fields
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.events_guard_review_fields();

CREATE OR REPLACE FUNCTION public.on_event_published()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'published'
     AND COALESCE(OLD.status, '') <> 'published'
     AND NEW.user_id IS NOT NULL
     AND NEW.user_id <> '06f50405-0211-4634-8bff-05741e08e107' THEN
    PERFORM public.notify_validation_async('event', NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;