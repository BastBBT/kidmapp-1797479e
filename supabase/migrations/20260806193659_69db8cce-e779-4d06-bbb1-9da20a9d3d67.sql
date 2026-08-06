-- 1. Nettoyage des orphelins
DELETE FROM public.page_views pv
WHERE pv.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = pv.user_id);

DELETE FROM public.location_proposals lp
WHERE lp.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = lp.user_id);

-- 2. Clés étrangères ON DELETE CASCADE
ALTER TABLE public.page_views DROP CONSTRAINT IF EXISTS page_views_user_id_fkey;
ALTER TABLE public.page_views
  ADD CONSTRAINT page_views_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.location_proposals DROP CONSTRAINT IF EXISTS location_proposals_user_id_fkey;
ALTER TABLE public.location_proposals
  ADD CONSTRAINT location_proposals_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Fonction de rétention
CREATE OR REPLACE FUNCTION public.apply_data_retention()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  DELETE FROM public.page_views
  WHERE created_at < now() - interval '12 months';

  UPDATE public.account_deletions
  SET email = NULL
  WHERE email IS NOT NULL
    AND deleted_at < now() - interval '12 months';
END;
$fn$;

REVOKE ALL ON FUNCTION public.apply_data_retention() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_data_retention() FROM anon;
REVOKE ALL ON FUNCTION public.apply_data_retention() FROM authenticated;

-- 4. Planification pg_cron (unschedule gardé)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'apply-data-retention') THEN
    PERFORM cron.unschedule('apply-data-retention');
  END IF;
END $$;

SELECT cron.schedule(
  'apply-data-retention',
  '15 3 * * *',
  $$ SELECT public.apply_data_retention(); $$
);