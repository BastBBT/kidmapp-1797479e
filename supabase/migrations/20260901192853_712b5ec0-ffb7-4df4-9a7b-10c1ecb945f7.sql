ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_step_max      smallint,
  ADD COLUMN IF NOT EXISTS onboarding_outcome       text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS coachmarks_outcome       text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_onboarding_outcome_check') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_onboarding_outcome_check
      CHECK (onboarding_outcome IS NULL OR onboarding_outcome IN ('completed', 'skipped'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_coachmarks_outcome_check') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_coachmarks_outcome_check
      CHECK (coachmarks_outcome IS NULL OR coachmarks_outcome IN ('completed', 'skipped'));
  END IF;
END $$;