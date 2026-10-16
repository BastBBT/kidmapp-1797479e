CREATE TABLE public.sourcing_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine      text NOT NULL CHECK (routine IN ('weekly', 'weekend')),
  status       text NOT NULL CHECK (status IN ('ok', 'partial', 'error')),
  mode         text,
  window_start date,
  window_end   date,
  started_at   timestamptz NOT NULL,
  finished_at  timestamptz NOT NULL DEFAULT now(),
  inserted     integer NOT NULL DEFAULT 0 CHECK (inserted >= 0),
  flagged      integer NOT NULL DEFAULT 0 CHECK (flagged >= 0),
  report       jsonb,
  error        text,
  user_id      uuid NOT NULL DEFAULT auth.uid()
);

CREATE INDEX sourcing_runs_started_at_idx ON public.sourcing_runs (started_at DESC);

ALTER TABLE public.sourcing_runs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.sourcing_runs TO authenticated;
GRANT ALL ON public.sourcing_runs TO service_role;

CREATE POLICY "Sourcing bot inserts its runs"
  ON public.sourcing_runs FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = '06f50405-0211-4634-8bff-05741e08e107'::uuid
    AND user_id = auth.uid()
  );

CREATE POLICY "Sourcing runs readable by bot and admins"
  ON public.sourcing_runs FOR SELECT TO authenticated
  USING (
    auth.uid() = '06f50405-0211-4634-8bff-05741e08e107'::uuid
    OR public.is_admin(auth.uid())
  );