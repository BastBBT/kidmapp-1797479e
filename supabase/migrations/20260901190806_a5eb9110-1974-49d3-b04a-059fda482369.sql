-- ============================================================
-- Compatibilité age_min / age_max pour les binaires mobiles déjà distribués
-- ============================================================
ALTER TABLE public.locations          ADD COLUMN IF NOT EXISTS age_min integer;
ALTER TABLE public.locations          ADD COLUMN IF NOT EXISTS age_max integer;
ALTER TABLE public.events             ADD COLUMN IF NOT EXISTS age_min integer;
ALTER TABLE public.events             ADD COLUMN IF NOT EXISTS age_max integer;
ALTER TABLE public.location_proposals ADD COLUMN IF NOT EXISTS age_min integer;
ALTER TABLE public.location_proposals ADD COLUMN IF NOT EXISTS age_max integer;

COMMENT ON COLUMN public.locations.age_min IS
  'Compat clients mobiles < 2026-09 : âge en ANNÉES. Source de vérité = age_min_months. À supprimer quand app_config.min_supported_build exclut ces builds.';
COMMENT ON COLUMN public.locations.age_max IS 'idem locations.age_min';
COMMENT ON COLUMN public.events.age_min IS 'idem locations.age_min';
COMMENT ON COLUMN public.events.age_max IS 'idem locations.age_min';
COMMENT ON COLUMN public.location_proposals.age_min IS 'idem locations.age_min';
COMMENT ON COLUMN public.location_proposals.age_max IS 'idem locations.age_min';

CREATE OR REPLACE FUNCTION public.sync_legacy_age_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  months_written boolean;
  years_written  boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    months_written := NEW.age_min_months IS NOT NULL OR NEW.age_max_months IS NOT NULL;
    years_written  := NEW.age_min IS NOT NULL OR NEW.age_max IS NOT NULL;
  ELSE
    months_written := NEW.age_min_months IS DISTINCT FROM OLD.age_min_months
                   OR NEW.age_max_months IS DISTINCT FROM OLD.age_max_months;
    years_written  := NEW.age_min IS DISTINCT FROM OLD.age_min
                   OR NEW.age_max IS DISTINCT FROM OLD.age_max;
  END IF;

  IF years_written AND NOT months_written THEN
    NEW.age_min_months := CASE WHEN NEW.age_min IS NULL THEN NULL ELSE NEW.age_min * 12 END;
    NEW.age_max_months := CASE WHEN NEW.age_max IS NULL THEN NULL ELSE NEW.age_max * 12 END;
  END IF;

  NEW.age_min := CASE WHEN NEW.age_min_months IS NULL THEN NULL ELSE NEW.age_min_months / 12 END;
  NEW.age_max := CASE WHEN NEW.age_max_months IS NULL THEN NULL ELSE NEW.age_max_months / 12 END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS locations_sync_legacy_age ON public.locations;
CREATE TRIGGER locations_sync_legacy_age
  BEFORE INSERT OR UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.sync_legacy_age_columns();

DROP TRIGGER IF EXISTS events_sync_legacy_age ON public.events;
CREATE TRIGGER events_sync_legacy_age
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.sync_legacy_age_columns();

DROP TRIGGER IF EXISTS location_proposals_sync_legacy_age ON public.location_proposals;
CREATE TRIGGER location_proposals_sync_legacy_age
  BEFORE INSERT OR UPDATE ON public.location_proposals
  FOR EACH ROW EXECUTE FUNCTION public.sync_legacy_age_columns();

UPDATE public.locations
   SET age_min = age_min_months / 12,
       age_max = age_max_months / 12
 WHERE age_min_months IS NOT NULL OR age_max_months IS NOT NULL;

UPDATE public.events
   SET age_min = age_min_months / 12,
       age_max = age_max_months / 12
 WHERE age_min_months IS NOT NULL OR age_max_months IS NOT NULL;

UPDATE public.location_proposals
   SET age_min = age_min_months / 12,
       age_max = age_max_months / 12
 WHERE age_min_months IS NOT NULL OR age_max_months IS NOT NULL;

-- ============================================================
-- app_config : version minimale supportée par plateforme
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_config (
  platform             text PRIMARY KEY CHECK (platform IN ('ios', 'android', 'web')),
  min_supported_build  integer NOT NULL DEFAULT 0,
  min_supported_label  text,
  store_url            text,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_config TO anon, authenticated;
GRANT ALL    ON public.app_config TO service_role;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_config_select_public" ON public.app_config;
CREATE POLICY "app_config_select_public" ON public.app_config
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "app_config_write_admin" ON public.app_config;
CREATE POLICY "app_config_write_admin" ON public.app_config
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.app_config (platform, min_supported_build, min_supported_label, store_url)
VALUES
  ('ios',     0, NULL, 'https://apps.apple.com/fr/app/kidmapp/id6763571262'),
  ('android', 0, NULL, 'https://play.google.com/store/apps/details?id=bastienboubat.kidmapp_flutter'),
  ('web',     0, NULL, 'https://kidmapp.app')
ON CONFLICT (platform) DO NOTHING;

UPDATE public.app_config
   SET store_url = 'https://apps.apple.com/fr/app/kidmapp/id6763571262',
       updated_at = now()
 WHERE platform = 'ios'
   AND store_url IS DISTINCT FROM 'https://apps.apple.com/fr/app/kidmapp/id6763571262';

NOTIFY pgrst, 'reload schema';