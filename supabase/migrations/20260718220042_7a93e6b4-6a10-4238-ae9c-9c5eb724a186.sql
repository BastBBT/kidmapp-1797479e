CREATE OR REPLACE FUNCTION public.on_event_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'published'
     AND COALESCE(OLD.status, '') <> 'published'
     AND NEW.user_id IS NOT NULL THEN
    PERFORM public.notify_validation_async('event', NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS events_notify_published ON public.events;
CREATE TRIGGER events_notify_published
  AFTER UPDATE OF status ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.on_event_published();