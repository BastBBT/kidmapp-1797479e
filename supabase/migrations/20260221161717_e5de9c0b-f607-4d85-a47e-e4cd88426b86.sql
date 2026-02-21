
-- Create locations table
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('restaurant', 'cafe', 'shop', 'public')),
  city TEXT NOT NULL DEFAULT 'Nantes',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT,
  photo TEXT,
  high_chair BOOLEAN NOT NULL DEFAULT false,
  changing_table BOOLEAN NOT NULL DEFAULT false,
  kids_area BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('published', 'unpublished', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contributions table
CREATE TABLE public.contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  high_chair BOOLEAN,
  changing_table BOOLEAN,
  kids_area BOOLEAN,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

-- Locations: everyone can read published locations
CREATE POLICY "Anyone can view published locations"
  ON public.locations FOR SELECT
  USING (status = 'published');

-- Locations: authenticated users can insert (for suggesting new places)
CREATE POLICY "Authenticated users can suggest locations"
  ON public.locations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Contributions: anyone can read
CREATE POLICY "Anyone can view contributions"
  ON public.contributions FOR SELECT
  USING (true);

-- Contributions: authenticated users can insert their own
CREATE POLICY "Authenticated users can create contributions"
  ON public.contributions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed mock data
INSERT INTO public.locations (name, category, city, lat, lng, photo, high_chair, changing_table, kids_area, status, address) VALUES
  ('Le Petit Beurre', 'restaurant', 'Nantes', 47.2184, -1.5536, 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop', true, true, false, 'published', '12 Rue Crébillon, 44000 Nantes'),
  ('Café des Enfants', 'cafe', 'Nantes', 47.2135, -1.5578, 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop', true, true, true, 'published', '5 Place du Commerce, 44000 Nantes'),
  ('Jardin des Plantes', 'public', 'Nantes', 47.2186, -1.5425, 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400&h=300&fit=crop', false, false, true, 'published', 'Rue Stanislas Baudry, 44000 Nantes'),
  ('Oxybul Éveil et Jeux', 'shop', 'Nantes', 47.2141, -1.5607, 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=300&fit=crop', false, true, true, 'published', '8 Rue du Calvaire, 44000 Nantes'),
  ('La Cigale', 'restaurant', 'Nantes', 47.2130, -1.5567, 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop', true, false, false, 'published', '4 Place Graslin, 44000 Nantes'),
  ('Parc de la Beaujoire', 'public', 'Nantes', 47.2560, -1.5232, 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400&h=300&fit=crop', false, true, true, 'published', 'Route de Saint-Joseph, 44300 Nantes'),
  ('Bistrot de la Cathédrale', 'restaurant', 'Nantes', 47.2180, -1.5510, 'https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=400&h=300&fit=crop', true, true, true, 'published', '2 Place Saint-Pierre, 44000 Nantes'),
  ('Salon de Thé Maman', 'cafe', 'Nantes', 47.2155, -1.5490, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop', true, true, true, 'pending', '15 Rue des Arts, 44000 Nantes');
