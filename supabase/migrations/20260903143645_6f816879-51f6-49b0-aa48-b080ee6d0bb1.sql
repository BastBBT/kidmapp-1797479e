ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS digest_email_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS digest_push_enabled boolean NOT NULL DEFAULT false;

UPDATE public.profiles
  SET digest_email_enabled = TRUE
  WHERE digest_channel = 'email';

UPDATE public.profiles
  SET digest_push_enabled = TRUE
  WHERE digest_channel = 'push';

UPDATE public.profiles
  SET digest_email_enabled = FALSE,
      digest_push_enabled = FALSE
  WHERE digest_channel = 'none';