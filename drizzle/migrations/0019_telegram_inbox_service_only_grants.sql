REVOKE ALL ON TABLE public.telegram_inbox FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.telegram_inbox TO service_role;