-- 1. Table children
CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  birth_month INTEGER NOT NULL CHECK (birth_month BETWEEN 1 AND 12),
  birth_year INTEGER NOT NULL CHECK (birth_year BETWEEN 2005 AND EXTRACT(YEAR FROM now())::int),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.children TO authenticated;
GRANT ALL ON public.children TO service_role;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "children_select_own" ON public.children FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "children_insert_own" ON public.children FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "children_update_own" ON public.children FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "children_delete_own" ON public.children FOR DELETE USING (auth.uid() = user_id);

-- 2. Colonnes sur profiles
ALTER TABLE public.profiles
  ADD COLUMN digest_channel TEXT NOT NULL DEFAULT 'none'
    CHECK (digest_channel IN ('email', 'push', 'none')),
  ADD COLUMN digest_day INTEGER NOT NULL DEFAULT 4
    CHECK (digest_day BETWEEN 0 AND 6),
  ADD COLUMN zone_city TEXT,
  ADD COLUMN zone_district TEXT,
  ADD COLUMN zone_lat DOUBLE PRECISION,
  ADD COLUMN zone_lng DOUBLE PRECISION,
  ADD COLUMN zone_radius_km INTEGER NOT NULL DEFAULT 12;

-- 3. Table zones_reference
CREATE TABLE public.zones_reference (
  label TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('commune', 'quartier')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL
);
GRANT SELECT ON public.zones_reference TO anon;
GRANT SELECT ON public.zones_reference TO authenticated;
GRANT ALL ON public.zones_reference TO service_role;
ALTER TABLE public.zones_reference ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zones_reference_public_read" ON public.zones_reference FOR SELECT USING (true);

INSERT INTO public.zones_reference (label, kind, lat, lng) VALUES
  ('Avrillé', 'commune', 47.504566, -0.595654),
  ('Basse-Goulaine', 'commune', 47.215506, -1.465204),
  ('Bouguenais', 'commune', 47.179301, -1.623369),
  ('Carquefou', 'commune', 47.297198, -1.492123),
  ('Cordemais', 'commune', 47.290931, -1.876276),
  ('Couëron', 'commune', 47.211505, -1.727147),
  ('Divatte-sur-Loire', 'commune', 47.272139, -1.338216),
  ('Frossay', 'commune', 47.244002, -1.934115),
  ('Grandchamp-des-Fontaines', 'commune', 47.365111, -1.605810),
  ('Haute-Goulaine', 'commune', 47.199025, -1.429798),
  ('La Baule-Escoublac', 'commune', 47.284373, -2.395160),
  ('La Boissière-du-Doré', 'commune', 47.232314, -1.220173),
  ('La Chapelle-sur-Erdre', 'commune', 47.299685, -1.551863),
  ('La Possonnière', 'commune', 47.374718, -0.685365),
  ('La Regrippière', 'commune', 47.181149, -1.176330),
  ('Le Bernard', 'commune', 46.438889, -1.467778),
  ('Le Gâvre', 'commune', 47.520588, -1.747988),
  ('Le Landreau', 'commune', 47.204930, -1.306226),
  ('Le Loroux-Bottereau', 'commune', 47.238541, -1.347270),
  ('Montaigu-Vendée', 'commune', 46.974115, -1.292746),
  ('Nantes', 'commune', 47.218637, -1.554136),
  ('Orvault', 'commune', 47.271122, -1.623206),
  ('Orée d''Anjou', 'commune', 47.334453, -1.207295),
  ('Plessé', 'commune', 47.541739, -1.886466),
  ('Pornic', 'commune', 47.115269, -2.104010),
  ('Pornichet', 'commune', 47.261329, -2.336424),
  ('Port-Saint-Père', 'commune', 47.138167, -1.773688),
  ('Rezé', 'commune', 47.190546, -1.569529),
  ('Saint-Herblain', 'commune', 47.223301, -1.634696),
  ('Saint-Hilaire-de-Riez', 'commune', 46.719949, -1.946144),
  ('Saint-Julien-de-Concelles', 'commune', 47.252041, -1.386227),
  ('Saint-Julien-des-Landes', 'commune', 46.640593, -1.713289),
  ('Saint-Molf', 'commune', 47.392718, -2.425536),
  ('Saint-Sébastien-sur-Loire', 'commune', 47.203503, -1.499208),
  ('Sainte-Luce-sur-Loire', 'commune', 47.249386, -1.486534),
  ('Sautron', 'commune', 47.263261, -1.668354),
  ('Savenay', 'commune', 47.359230, -1.942124),
  ('Sucé-sur-Erdre', 'commune', 47.341551, -1.528569),
  ('Val en Vignes', 'commune', 47.035135, -0.335439),
  ('Vallet', 'commune', 47.161004, -1.265743),
  ('Vertou', 'commune', 47.168521, -1.472224),
  ('Bellevue - Chantenay - Sainte-Anne', 'quartier', 47.197783, -1.597948),
  ('Breil - Barberie', 'quartier', 47.235155, -1.573885),
  ('Centre Ville', 'quartier', 47.214840, -1.557937),
  ('Dervallières - Zola', 'quartier', 47.217789, -1.588958),
  ('Doulon - Bottière', 'quartier', 47.239388, -1.509426),
  ('Hauts-Pavés - Saint-Félix', 'quartier', 47.228733, -1.564403),
  ('Île de Nantes', 'quartier', 47.207128, -1.546040),
  ('Malakoff - Pré-Gauchet', 'quartier', 47.217379, -1.533516),
  ('Nantes Erdre', 'quartier', 47.264979, -1.521608),
  ('Nantes Nord', 'quartier', 47.258410, -1.566323),
  ('Nantes Sud', 'quartier', 47.192114, -1.532469)
ON CONFLICT (label) DO NOTHING;

-- 4. Table recommendation_feedback
CREATE TABLE public.recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  verdict TEXT NOT NULL CHECK (verdict IN ('up', 'down')),
  reason TEXT CHECK (reason IN ('trop_loin', 'trop_cher', 'pas_notre_truc', 'deja_fait')),
  source TEXT NOT NULL CHECK (source IN ('app', 'web', 'email')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_feedback_one_target CHECK (num_nonnulls(location_id, event_id) = 1)
);
GRANT SELECT, INSERT ON public.recommendation_feedback TO authenticated;
GRANT ALL ON public.recommendation_feedback TO service_role;
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recommendation_feedback_select_own" ON public.recommendation_feedback
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "recommendation_feedback_insert_own" ON public.recommendation_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);