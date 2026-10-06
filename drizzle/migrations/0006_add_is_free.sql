ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS is_free boolean;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_free boolean;

CREATE OR REPLACE FUNCTION public.price_is_free(p text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN p IS NULL OR btrim(p) = '' THEN NULL
    WHEN (lower(btrim(p)) LIKE 'gratuit%' OR lower(btrim(p)) LIKE 'entrée libre%' OR lower(btrim(p)) LIKE 'entree libre%' OR lower(btrim(p)) LIKE 'accès libre%' OR lower(btrim(p)) LIKE 'acces libre%')
     AND (lower(btrim(p)) !~ '[0-9€]' OR lower(btrim(p)) LIKE '%visiteur%') THEN true
    ELSE false END
$$;

CREATE OR REPLACE FUNCTION public.sync_is_free_from_price()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.is_free := public.price_is_free(NEW.price);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_locations_sync_is_free ON public.locations;
CREATE TRIGGER trg_locations_sync_is_free BEFORE INSERT OR UPDATE OF price ON public.locations
FOR EACH ROW EXECUTE FUNCTION public.sync_is_free_from_price();
DROP TRIGGER IF EXISTS trg_events_sync_is_free ON public.events;
CREATE TRIGGER trg_events_sync_is_free BEFORE INSERT OR UPDATE OF price ON public.events
FOR EACH ROW EXECUTE FUNCTION public.sync_is_free_from_price();

UPDATE public.locations SET is_free = public.price_is_free(price);
UPDATE public.events SET is_free = public.price_is_free(price);

COMMENT ON COLUMN public.locations.is_free IS 'Derived from price by trigger: true=free unconditionally, false=paid/conditional, NULL=unknown';
COMMENT ON COLUMN public.events.is_free IS 'Derived from price by trigger: true=free unconditionally, false=paid/conditional, NULL=unknown';