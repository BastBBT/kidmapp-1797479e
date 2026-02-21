
-- Allow anyone to read all locations (admin needs to see unpublished too)
-- We'll add proper admin auth later
DROP POLICY "Anyone can view published locations" ON public.locations;

CREATE POLICY "Anyone can view published locations"
  ON public.locations FOR SELECT
  USING (status = 'published');

-- Authenticated users can see all locations (for admin)
CREATE POLICY "Authenticated can view all locations"
  ON public.locations FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can update locations (admin)
CREATE POLICY "Authenticated can update locations"
  ON public.locations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated users can update contributions (admin validation)
CREATE POLICY "Authenticated can update contributions"
  ON public.contributions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
