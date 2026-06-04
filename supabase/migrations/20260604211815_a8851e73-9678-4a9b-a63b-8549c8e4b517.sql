-- 1) location_meals UPDATE: restrict to creator or admin
DROP POLICY IF EXISTS location_meals_update_authenticated ON public.location_meals;
CREATE POLICY location_meals_update_owner_or_admin
ON public.location_meals
FOR UPDATE
TO authenticated
USING ((created_by = auth.uid()) OR is_admin(auth.uid()))
WITH CHECK ((created_by = auth.uid()) OR is_admin(auth.uid()));

-- 2) profiles: prevent self role escalation
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
);

-- 3) Storage: remove broad public SELECT (public URLs still work), add UPDATE policy
DROP POLICY IF EXISTS "Public read access" ON storage.objects;

CREATE POLICY "Users update own folder or admin"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'location-photos'
  AND (
    name LIKE ('proposals/' || auth.uid()::text || '/%')
    OR is_admin(auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'location-photos'
  AND (
    name LIKE ('proposals/' || auth.uid()::text || '/%')
    OR is_admin(auth.uid())
  )
);

-- 4) Lock down internal SECURITY DEFINER helpers (service role only)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_validation_async(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_meal_confirmed_count(uuid, text) FROM PUBLIC, anon;

-- 5) Pin search_path on the remaining helpers
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, extensions;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, extensions;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, extensions;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, extensions;