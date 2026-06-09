
-- 1. Colonne points sur profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS points INT NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_points_range_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_points_range_check CHECK (points >= 0 AND points <= 500);

-- 2. Table point_events
CREATE TABLE IF NOT EXISTS public.point_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount       INT NOT NULL CHECK (amount > 0),
  reason       TEXT NOT NULL,
  reference_id TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.point_events TO authenticated;
GRANT ALL ON public.point_events TO service_role;

ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own point events" ON public.point_events;
CREATE POLICY "Users see own point events"
  ON public.point_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS point_events_user_created_idx
  ON public.point_events (user_id, created_at DESC);

-- 3. Fonction award_points (plafond 500)
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id      UUID,
  p_amount       INT,
  p_reason       TEXT,
  p_reference_id TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.point_events (user_id, amount, reason, reference_id)
  VALUES (p_user_id, p_amount, p_reason, p_reference_id);

  UPDATE public.profiles
  SET points = LEAST(points + p_amount, 500)
  WHERE id = p_user_id;
END;
$$;

-- 4. Trigger contributions → +10 (+5 si premier)
CREATE OR REPLACE FUNCTION public.handle_contribution_validated_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'validated'
     AND (OLD.status IS NULL OR OLD.status <> 'validated') THEN

    PERFORM public.award_points(NEW.user_id, 10, 'contribution_validated', NEW.id::TEXT);

    SELECT NOT EXISTS (
      SELECT 1 FROM public.contributions
      WHERE location_id = NEW.location_id
        AND status = 'validated'
        AND id <> NEW.id
    ) INTO is_first;

    IF is_first THEN
      PERFORM public.award_points(NEW.user_id, 5, 'first_contribution', NEW.id::TEXT);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_contribution_validated_points ON public.contributions;
CREATE TRIGGER on_contribution_validated_points
  AFTER UPDATE OF status ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.handle_contribution_validated_points();

-- 5. Trigger location_proposals → +25
CREATE OR REPLACE FUNCTION public.handle_proposal_approved_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved'
     AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    PERFORM public.award_points(NEW.user_id, 25, 'proposal_approved', NEW.id::TEXT);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_proposal_approved_points ON public.location_proposals;
CREATE TRIGGER on_proposal_approved_points
  AFTER UPDATE OF status ON public.location_proposals
  FOR EACH ROW EXECUTE FUNCTION public.handle_proposal_approved_points();
