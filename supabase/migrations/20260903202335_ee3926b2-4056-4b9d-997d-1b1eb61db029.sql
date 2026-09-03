CREATE TABLE IF NOT EXISTS public.digest_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  send_date date NOT NULL,
  occurrence_ids uuid[] NOT NULL DEFAULT '{}',
  token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  reaction text CHECK (reaction IN ('love', 'neutral', 'sad')),
  reacted_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT digest_sends_user_date_uniq UNIQUE (user_id, send_date),
  CONSTRAINT digest_sends_token_uniq UNIQUE (token)
);

GRANT ALL ON public.digest_sends TO service_role;

CREATE INDEX IF NOT EXISTS digest_sends_token_idx ON public.digest_sends (token);

ALTER TABLE public.digest_sends ENABLE ROW LEVEL SECURITY;

-- Pas de policy anon/authenticated : la page d'atterrissage passe par une
-- Edge Function service_role, jamais un accès table direct.

CREATE OR REPLACE FUNCTION public.apply_data_retention()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.page_views
  WHERE created_at < now() - interval '12 months';

  UPDATE public.account_deletions
  SET email = NULL
  WHERE email IS NOT NULL
    AND deleted_at < now() - interval '12 months';

  DELETE FROM public.digest_sends
  WHERE created_at < now() - interval '13 months';
END;
$$;