UPDATE public.events SET category = 'Autre'
WHERE category IS NOT NULL
  AND category NOT IN ('Spectacle','Atelier','Festival','Fête','Marché','Exposition','Autre');

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_category_check;
ALTER TABLE public.events ADD CONSTRAINT events_category_check
  CHECK (category IN ('Spectacle','Atelier','Festival','Fête','Marché','Exposition','Autre'));