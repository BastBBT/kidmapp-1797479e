-- locations
ALTER TABLE public.locations RENAME COLUMN age_min TO age_min_months;
ALTER TABLE public.locations RENAME COLUMN age_max TO age_max_months;
UPDATE public.locations SET age_min_months = age_min_months * 12 WHERE age_min_months IS NOT NULL;
UPDATE public.locations SET age_max_months = age_max_months * 12 WHERE age_max_months IS NOT NULL;

-- events
ALTER TABLE public.events RENAME COLUMN age_min TO age_min_months;
ALTER TABLE public.events RENAME COLUMN age_max TO age_max_months;
UPDATE public.events SET age_min_months = age_min_months * 12 WHERE age_min_months IS NOT NULL;
UPDATE public.events SET age_max_months = age_max_months * 12 WHERE age_max_months IS NOT NULL;

-- location_proposals
ALTER TABLE public.location_proposals RENAME COLUMN age_min TO age_min_months;
ALTER TABLE public.location_proposals RENAME COLUMN age_max TO age_max_months;
UPDATE public.location_proposals SET age_min_months = age_min_months * 12 WHERE age_min_months IS NOT NULL;
UPDATE public.location_proposals SET age_max_months = age_max_months * 12 WHERE age_max_months IS NOT NULL;