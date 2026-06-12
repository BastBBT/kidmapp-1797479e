-- 1) Contributions: stop exposing user_id to anonymous visitors via column-level grants
REVOKE SELECT ON public.contributions FROM anon;
GRANT SELECT (id, location_id, status, type, content, kids_menu, kids_area, changing_table, high_chair, bookable, created_at) ON public.contributions TO anon;

-- 2) Location meals: require created_by = auth.uid() on INSERT for non-admins
DROP POLICY IF EXISTS location_meals_insert_authenticated ON public.location_meals;
CREATE POLICY location_meals_insert_authenticated
  ON public.location_meals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (created_by = auth.uid() OR public.is_admin(auth.uid()))
  );

-- 3) Profiles: add explicit INSERT policy so users can only create their own row
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
