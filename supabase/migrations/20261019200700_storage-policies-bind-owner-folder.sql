-- Copie de drizzle/migrations/0014_storage_policies_bind_owner_folder.sql (appliquée par Lovable le 2026-10-19).
-- Storage location-photos : un utilisateur connecté n'écrit que sous proposals/{auth.uid()}/, l'admin partout.

-- guard:allow-destructive recréation idempotente de la policy (DROP IF EXISTS + CREATE), aucune donnée touchée
DROP POLICY IF EXISTS "Users upload to own folder" ON storage.objects;
CREATE POLICY "Users upload to own folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'location-photos' AND (
    ((storage.foldername(name))[1] = 'proposals' AND (storage.foldername(name))[2] = (select auth.uid()::text))
    OR public.is_admin((select auth.uid()))
  )
);

-- guard:allow-destructive recréation idempotente de la policy (DROP IF EXISTS + CREATE), aucune donnée touchée
DROP POLICY IF EXISTS "Users update own folder or admin" ON storage.objects;
CREATE POLICY "Users update own folder or admin" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'location-photos' AND (
    ((storage.foldername(name))[1] = 'proposals' AND (storage.foldername(name))[2] = (select auth.uid()::text))
    OR public.is_admin((select auth.uid()))
  )
)
WITH CHECK (
  bucket_id = 'location-photos' AND (
    ((storage.foldername(name))[1] = 'proposals' AND (storage.foldername(name))[2] = (select auth.uid()::text))
    OR public.is_admin((select auth.uid()))
  )
);