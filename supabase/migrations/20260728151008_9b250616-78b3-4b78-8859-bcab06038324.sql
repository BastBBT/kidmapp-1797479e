CREATE POLICY "events_insert_admin" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));