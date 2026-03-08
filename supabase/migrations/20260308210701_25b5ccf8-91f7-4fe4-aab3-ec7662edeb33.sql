ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS note TEXT;

CREATE POLICY "Admins can delete locations"
ON public.locations
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));