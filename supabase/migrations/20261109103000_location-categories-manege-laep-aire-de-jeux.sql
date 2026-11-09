-- Refonte des catégories de lieux (2026-11-09) : ajout de 'manege', 'laep', 'aire_de_jeux'.
-- 'jeux' et 'public' restent acceptés : les anciens binaires des apps les postent encore.

ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_category_check;
ALTER TABLE public.locations ADD CONSTRAINT locations_category_check CHECK (
  category = ANY (ARRAY['restaurant','cafe','shop','public','coiffeur','librairie','nature','sport','creatif','culture','jeux','manege','laep','aire_de_jeux']::text[])
);

ALTER TABLE public.location_proposals DROP CONSTRAINT IF EXISTS location_proposals_category_check;
ALTER TABLE public.location_proposals ADD CONSTRAINT location_proposals_category_check CHECK (
  category = ANY (ARRAY['restaurant','cafe','shop','public','coiffeur','librairie','nature','sport','creatif','culture','jeux','manege','laep','aire_de_jeux']::text[])
);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_alert_location_categories_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_alert_location_categories_check CHECK (
  alert_location_categories IS NULL
  OR (
    cardinality(alert_location_categories) >= 1
    AND alert_location_categories <@ ARRAY['restaurant','cafe','shop','public','coiffeur','librairie','nature','sport','creatif','culture','jeux','manege','laep','aire_de_jeux']::text[]
  )
);