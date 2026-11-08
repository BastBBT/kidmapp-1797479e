ALTER TABLE public.app_config
  ADD COLUMN IF NOT EXISTS seasonal_icon        text,
  ADD COLUMN IF NOT EXISTS seasonal_icon_from   timestamptz,
  ADD COLUMN IF NOT EXISTS seasonal_icon_until  timestamptz;

COMMENT ON COLUMN public.app_config.seasonal_icon IS
  'Nom de l''icône saisonnière à afficher (ex. ''noel''). NULL = icône normale.';

COMMENT ON COLUMN public.app_config.seasonal_icon_from IS
  'Début d''activation (inclus). NULL = actif dès que seasonal_icon est renseigné.';

COMMENT ON COLUMN public.app_config.seasonal_icon_until IS
  'Fin d''activation (exclue). NULL = pas de fin automatique.';
