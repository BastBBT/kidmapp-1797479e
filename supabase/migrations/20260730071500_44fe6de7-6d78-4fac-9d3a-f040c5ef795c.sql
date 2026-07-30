ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_category_check;
ALTER TABLE public.locations
  ADD CONSTRAINT locations_category_check
  CHECK (category IN ('restaurant','cafe','shop','public','coiffeur','librairie',
                      'nature','sport','creatif','culture','jeux'));

ALTER TABLE public.location_proposals DROP CONSTRAINT IF EXISTS location_proposals_category_check;
ALTER TABLE public.location_proposals
  ADD CONSTRAINT location_proposals_category_check
  CHECK (category IN ('restaurant','cafe','shop','public','coiffeur','librairie',
                      'nature','sport','creatif','culture','jeux'));