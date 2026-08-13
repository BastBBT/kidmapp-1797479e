CREATE OR REPLACE FUNCTION public.sync_event_dates_from_occurrences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_event uuid;
  earliest RECORD;
BEGIN
  target_event := COALESCE(NEW.event_id, OLD.event_id);

  -- Prochain créneau à venir (ou en cours) le plus proche.
  SELECT date_start, date_end, time INTO earliest
  FROM public.event_occurrences
  WHERE event_id = target_event
    AND COALESCE(date_end, date_start) >= CURRENT_DATE
  ORDER BY date_start ASC
  LIMIT 1;

  -- Sinon, le créneau passé le plus récent.
  IF earliest IS NULL THEN
    SELECT date_start, date_end, time INTO earliest
    FROM public.event_occurrences
    WHERE event_id = target_event
    ORDER BY date_start DESC
    LIMIT 1;
  END IF;

  IF earliest IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.events
  SET date_start = earliest.date_start, date_end = earliest.date_end, time = earliest.time
  WHERE id = target_event;

  RETURN COALESCE(NEW, OLD);
END;
$$;