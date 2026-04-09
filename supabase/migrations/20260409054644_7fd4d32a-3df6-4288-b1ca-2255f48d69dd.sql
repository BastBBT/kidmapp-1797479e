ALTER TABLE public.locations DROP CONSTRAINT locations_category_check;
ALTER TABLE public.locations ADD CONSTRAINT locations_category_check
  CHECK (category = ANY (ARRAY['restaurant','cafe','shop','public','coiffeur']));