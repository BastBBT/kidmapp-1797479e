
-- 1. Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Profiles RLS: users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 4. Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Trigger function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- 6. Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Drop old RLS policies on locations
DROP POLICY IF EXISTS "Anyone can view published locations" ON public.locations;
DROP POLICY IF EXISTS "Authenticated can view all locations" ON public.locations;
DROP POLICY IF EXISTS "Authenticated can update locations" ON public.locations;

-- 8. New locations RLS: authenticated can SELECT
CREATE POLICY "Authenticated can view locations"
  ON public.locations FOR SELECT
  TO authenticated
  USING (true);

-- 9. Admins only can UPDATE locations
CREATE POLICY "Admins can update locations"
  ON public.locations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 10. Drop old RLS policies on contributions
DROP POLICY IF EXISTS "Anyone can view contributions" ON public.contributions;
DROP POLICY IF EXISTS "Authenticated can update contributions" ON public.contributions;
DROP POLICY IF EXISTS "Authenticated users can create contributions" ON public.contributions;

-- 11. Authenticated can view contributions
CREATE POLICY "Authenticated can view contributions"
  ON public.contributions FOR SELECT
  TO authenticated
  USING (true);

-- 12. Authenticated can insert contributions (user_id must match)
CREATE POLICY "Authenticated can insert contributions"
  ON public.contributions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 13. Admins only can UPDATE contributions
CREATE POLICY "Admins can update contributions"
  ON public.contributions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
