-- Fix 1: Replace unrestricted locations SELECT policy with status-scoped one
DROP POLICY IF EXISTS "Authenticated can view locations" ON public.locations;

CREATE POLICY "Users view published locations"
  ON public.locations FOR SELECT TO authenticated
  USING (status = 'published' OR public.is_admin(auth.uid()));

-- Fix 2: Replace unrestricted storage upload policy with path-scoped one
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

CREATE POLICY "Users upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'location-photos' AND
    (name LIKE ('proposals/' || auth.uid()::text || '/%') OR public.is_admin(auth.uid()))
  );

-- Add admin DELETE policy for storage cleanup
CREATE POLICY "Admins can delete storage objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'location-photos' AND public.is_admin(auth.uid()));