ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assistant_opens_count       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assistant_completions_count integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_assistant_counts_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_assistant_counts_check
      CHECK (assistant_completions_count <= assistant_opens_count);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.record_assistant_opened()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
     SET assistant_opens_count = assistant_opens_count + 1
   WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.record_assistant_completed()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
     SET assistant_completions_count = assistant_completions_count + 1
   WHERE id = auth.uid()
     AND assistant_completions_count < assistant_opens_count;
$$;

GRANT EXECUTE ON FUNCTION public.record_assistant_opened()    TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_assistant_completed() TO authenticated;