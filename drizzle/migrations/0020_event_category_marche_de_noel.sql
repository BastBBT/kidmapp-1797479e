-- 1. events.category : ajouter 'Marché de Noël' au vocabulaire autorisé
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_category_check;
ALTER TABLE public.events ADD CONSTRAINT events_category_check
  CHECK (category IN ('Spectacle','Atelier','Festival','Fête','Marché','Marché de Noël','Exposition','Autre'));

-- 2. Préférences du digest : même vocabulaire, sinon un utilisateur ne pourrait
--    pas cocher la catégorie (le CHECK rejetterait le tableau).
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_digest_event_categories_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_digest_event_categories_check
  CHECK (digest_event_categories IS NULL OR (cardinality(digest_event_categories) >= 1
    AND digest_event_categories <@ ARRAY['Spectacle','Atelier','Festival','Fête','Marché','Marché de Noël','Exposition','Autre']::text[]));

-- 3. Reclasser les marchés de Noël déjà publiés en « Marché »
UPDATE public.events
SET category = 'Marché de Noël'
WHERE category = 'Marché'
  AND (name ILIKE '%noël%' OR name ILIKE '%noel%');
