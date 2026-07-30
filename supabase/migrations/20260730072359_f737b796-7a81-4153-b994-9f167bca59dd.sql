ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS favorites_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS favorites_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.sync_location_favorites_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.locations
    SET favorites_count = favorites_count + 1
    WHERE id = NEW.location_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.locations
    SET favorites_count = GREATEST(favorites_count - 1, 0)
    WHERE id = OLD.location_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_event_favorites_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.events
    SET favorites_count = favorites_count + 1
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.events
    SET favorites_count = GREATEST(favorites_count - 1, 0)
    WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS favorites_sync_count ON public.favorites;
CREATE TRIGGER favorites_sync_count
AFTER INSERT OR DELETE ON public.favorites
FOR EACH ROW EXECUTE FUNCTION public.sync_location_favorites_count();

DROP TRIGGER IF EXISTS event_favorites_sync_count ON public.event_favorites;
CREATE TRIGGER event_favorites_sync_count
AFTER INSERT OR DELETE ON public.event_favorites
FOR EACH ROW EXECUTE FUNCTION public.sync_event_favorites_count();

-- Backfill BEFORE creating the guard trigger
UPDATE public.locations l
SET favorites_count = COALESCE(f.cnt, 0)
FROM (
  SELECT location_id, COUNT(*)::int AS cnt FROM public.favorites GROUP BY location_id
) f
WHERE f.location_id = l.id AND l.favorites_count IS DISTINCT FROM f.cnt;

UPDATE public.locations
SET favorites_count = 0
WHERE favorites_count <> 0
  AND id NOT IN (SELECT location_id FROM public.favorites);

UPDATE public.events e
SET favorites_count = COALESCE(f.cnt, 0)
FROM (
  SELECT event_id, COUNT(*)::int AS cnt FROM public.event_favorites GROUP BY event_id
) f
WHERE f.event_id = e.id AND e.favorites_count IS DISTINCT FROM f.cnt;

UPDATE public.events
SET favorites_count = 0
WHERE favorites_count <> 0
  AND id NOT IN (SELECT event_id FROM public.event_favorites);

-- Guard: prevent non-admin clients from writing favorites_count on events
CREATE OR REPLACE FUNCTION public.protect_event_favorites_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() = 1
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin(auth.uid()) THEN
    NEW.favorites_count := OLD.favorites_count;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_protect_favorites_count ON public.events;
CREATE TRIGGER events_protect_favorites_count
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.protect_event_favorites_count();

CREATE INDEX IF NOT EXISTS idx_locations_favorites_count ON public.locations (favorites_count DESC);
CREATE INDEX IF NOT EXISTS idx_events_favorites_count ON public.events (favorites_count DESC);