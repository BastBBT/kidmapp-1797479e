CREATE POLICY "contributions_delete_admin"
ON public.contributions
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

GRANT DELETE ON public.contributions TO authenticated;