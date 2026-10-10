ALTER TABLE public.profiles
  ADD COLUMN digest_days text NOT NULL DEFAULT 'all',
  ADD COLUMN digest_holidays_all_week boolean NOT NULL DEFAULT true,
  ADD COLUMN digest_event_categories text[],
  ADD COLUMN alert_location_categories text[];

ALTER TABLE public.profiles ADD CONSTRAINT profiles_digest_days_check
  CHECK (digest_days IN ('weekend','wed_weekend','all'));

ALTER TABLE public.profiles ADD CONSTRAINT profiles_digest_event_categories_check
  CHECK (digest_event_categories IS NULL OR (cardinality(digest_event_categories) >= 1
    AND digest_event_categories <@ ARRAY['Spectacle','Atelier','Festival','Fête','Marché','Exposition','Autre']::text[]));

ALTER TABLE public.profiles ADD CONSTRAINT profiles_alert_location_categories_check
  CHECK (alert_location_categories IS NULL OR (cardinality(alert_location_categories) >= 1
    AND alert_location_categories <@ ARRAY['restaurant','cafe','shop','public','coiffeur','librairie','nature','sport','creatif','culture','jeux']::text[]));

CREATE TABLE public.school_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone text NOT NULL CHECK (zone IN ('A','B','C')),
  label text NOT NULL,
  first_day date NOT NULL,
  last_day date NOT NULL,
  CHECK (last_day >= first_day),
  UNIQUE (zone, first_day)
);

GRANT SELECT ON public.school_holidays TO anon, authenticated;
GRANT ALL ON public.school_holidays TO service_role;

ALTER TABLE public.school_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School holidays are readable by everyone"
  ON public.school_holidays FOR SELECT TO anon, authenticated USING (true);
-- Données appliquées par Lovable hors du fichier drizzle 0008 (même contenu que
-- la base, vérifié le 2026-10-10) : calendrier zone B, open data Éducation
-- nationale. first_day / last_day inclus.
INSERT INTO public.school_holidays (zone, label, first_day, last_day) VALUES
  ('B', 'Vacances de la Toussaint', '2026-10-17', '2026-11-01'),
  ('B', 'Vacances de Noël',         '2026-12-19', '2027-01-03'),
  ('B', 'Vacances d''hiver',        '2027-02-20', '2027-03-07'),
  ('B', 'Vacances de printemps',    '2027-04-17', '2027-05-02'),
  ('B', 'Vacances d''été',          '2027-07-03', '2027-09-01'),
  ('B', 'Vacances de la Toussaint', '2027-10-23', '2027-11-07'),
  ('B', 'Vacances de Noël',         '2027-12-18', '2028-01-02'),
  ('B', 'Vacances d''hiver',        '2028-02-05', '2028-02-20'),
  ('B', 'Vacances de printemps',    '2028-04-08', '2028-04-23')
ON CONFLICT (zone, first_day) DO NOTHING;
