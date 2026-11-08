-- 1. Effacement de compte : les lignes de journal partent avec le compte.
ALTER TABLE public.event_spotlight_logs
  DROP CONSTRAINT IF EXISTS event_spotlight_logs_user_id_fkey;
ALTER TABLE public.event_spotlight_logs
  ADD CONSTRAINT event_spotlight_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Conservation de 12 mois : instructions existantes inchangées, purge ajoutée.
CREATE OR REPLACE FUNCTION public.apply_data_retention()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.page_views
  WHERE created_at < now() - interval '12 months';

  UPDATE public.account_deletions
  SET email = NULL
  WHERE email IS NOT NULL
    AND deleted_at < now() - interval '12 months';

  DELETE FROM public.digest_sends
  WHERE created_at < now() - interval '13 months';

  DELETE FROM public.location_alert_sends
  WHERE created_at < now() - interval '13 months';

  DELETE FROM public.event_spotlight_logs
  WHERE created_at < now() - interval '12 months';
END;
$function$;
