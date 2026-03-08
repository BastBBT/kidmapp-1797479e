CREATE POLICY "Admins can insert locations"
ON public.locations
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));