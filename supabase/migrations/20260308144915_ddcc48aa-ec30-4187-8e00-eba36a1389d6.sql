
CREATE OR REPLACE FUNCTION validate_bookable_locations()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.bookable IS NOT NULL AND NEW.bookable NOT IN ('yes', 'no', 'unknown') THEN
    RAISE EXCEPTION 'bookable must be yes, no, or unknown';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_bookable_contributions()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.bookable IS NOT NULL AND NEW.bookable NOT IN ('yes', 'no', 'unknown') THEN
    RAISE EXCEPTION 'bookable must be yes, no, or unknown';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_bookable_proposals()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.bookable IS NOT NULL AND NEW.bookable NOT IN ('yes', 'no', 'unknown') THEN
    RAISE EXCEPTION 'bookable must be yes, no, or unknown';
  END IF;
  RETURN NEW;
END;
$$;
