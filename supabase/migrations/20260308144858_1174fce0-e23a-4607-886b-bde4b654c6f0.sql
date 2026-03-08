
ALTER TABLE locations ADD COLUMN bookable TEXT DEFAULT 'unknown';

CREATE OR REPLACE FUNCTION validate_bookable_locations()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.bookable IS NOT NULL AND NEW.bookable NOT IN ('yes', 'no', 'unknown') THEN
    RAISE EXCEPTION 'bookable must be yes, no, or unknown';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_bookable_locations
  BEFORE INSERT OR UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION validate_bookable_locations();

ALTER TABLE contributions ADD COLUMN bookable TEXT;

CREATE OR REPLACE FUNCTION validate_bookable_contributions()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.bookable IS NOT NULL AND NEW.bookable NOT IN ('yes', 'no', 'unknown') THEN
    RAISE EXCEPTION 'bookable must be yes, no, or unknown';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_bookable_contributions
  BEFORE INSERT OR UPDATE ON contributions
  FOR EACH ROW EXECUTE FUNCTION validate_bookable_contributions();

ALTER TABLE location_proposals ADD COLUMN bookable TEXT DEFAULT 'unknown';

CREATE OR REPLACE FUNCTION validate_bookable_proposals()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.bookable IS NOT NULL AND NEW.bookable NOT IN ('yes', 'no', 'unknown') THEN
    RAISE EXCEPTION 'bookable must be yes, no, or unknown';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_bookable_proposals
  BEFORE INSERT OR UPDATE ON location_proposals
  FOR EACH ROW EXECUTE FUNCTION validate_bookable_proposals();
