-- Remove overly permissive public read on profiles
DROP POLICY IF EXISTS profiles_select_public_basic ON public.profiles;

-- Safe lookup for contributor display names (no role exposed)
CREATE OR REPLACE FUNCTION public.get_contributor_names(_ids uuid[])
RETURNS TABLE (id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
$$;

REVOKE ALL ON FUNCTION public.get_contributor_names(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_contributor_names(uuid[]) TO anon, authenticated;