
-- Fix: restrict location inserts to set status as 'pending' only
DROP POLICY "Authenticated users can suggest locations" ON public.locations;

CREATE POLICY "Authenticated users can suggest locations"
  ON public.locations FOR INSERT
  TO authenticated
  WITH CHECK (status = 'pending');
