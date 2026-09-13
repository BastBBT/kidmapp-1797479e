ALTER TABLE public.recommendation_feedback
  DROP CONSTRAINT IF EXISTS recommendation_feedback_source_check;

ALTER TABLE public.recommendation_feedback
  ADD CONSTRAINT recommendation_feedback_source_check
  CHECK (source IN ('app', 'ios', 'android', 'web', 'email'));