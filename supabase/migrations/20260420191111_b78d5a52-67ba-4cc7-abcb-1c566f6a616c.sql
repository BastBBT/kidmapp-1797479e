-- Table de référence des types de repas
CREATE TABLE public.meal_types (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  short_label TEXT NOT NULL,
  emoji TEXT NOT NULL,
  default_time_start TEXT,
  default_time_end TEXT,
  default_days TEXT,
  color_hex TEXT,
  fill_hex TEXT,
  bg_hex TEXT,
  sort_order INTEGER
);

ALTER TABLE public.meal_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meal_types_select_public"
  ON public.meal_types FOR SELECT
  USING (true);

CREATE POLICY "meal_types_modify_admin"
  ON public.meal_types FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Seed data
INSERT INTO public.meal_types (id, label, short_label, emoji, default_time_start, default_time_end, default_days, color_hex, fill_hex, bg_hex, sort_order) VALUES
  ('petitdej', 'Petit déjeuner', 'Petit déj', '🌅', '07:00', '11:00', 'lun – dim', '#B07D1A', '#F2C94C', '#FEF9E7', 1),
  ('brunch', 'Brunch', 'Brunch', '🥂', '10:00', '14:00', 'sam – dim', '#7B4F9E', '#C9A0E0', '#F5EEF8', 2),
  ('dejeuner', 'Déjeuner', 'Déjeuner', '☀️', '12:00', '15:00', 'lun – dim', '#D95F3B', '#D95F3B', '#FAF0EC', 3),
  ('gouter', 'Goûter', 'Goûter', '🍰', '15:00', '18:00', 'mer, sam, dim', '#3B7D6E', '#3B7D6E', '#EBF4F2', 4),
  ('diner', 'Dîner', 'Dîner', '🌙', '19:00', '22:00', 'mar – sam', '#3D3530', '#6B5E57', '#F0EDEA', 5);

-- Table d'association lieu ↔ type de repas
-- Note : la table des lieux s'appelle "locations" dans ce projet (pas "venues")
CREATE TABLE public.location_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  meal_type_id TEXT NOT NULL REFERENCES public.meal_types(id),
  time_open TEXT,
  time_close TEXT,
  days_custom TEXT,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmed_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id, meal_type_id)
);

CREATE INDEX idx_location_meals_location_id ON public.location_meals(location_id);
CREATE INDEX idx_location_meals_meal_type_id ON public.location_meals(meal_type_id);

ALTER TABLE public.location_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "location_meals_select_public"
  ON public.location_meals FOR SELECT
  USING (true);

CREATE POLICY "location_meals_insert_authenticated"
  ON public.location_meals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "location_meals_update_authenticated"
  ON public.location_meals FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "location_meals_delete_owner_or_admin"
  ON public.location_meals FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- Fonction d'incrémentation atomique du compteur de confirmations
CREATE OR REPLACE FUNCTION public.increment_meal_confirmed_count(
  p_location_id UUID,
  p_meal_type_id TEXT
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.location_meals
  SET confirmed_count = confirmed_count + 1
  WHERE location_id = p_location_id
    AND meal_type_id = p_meal_type_id;
$$;