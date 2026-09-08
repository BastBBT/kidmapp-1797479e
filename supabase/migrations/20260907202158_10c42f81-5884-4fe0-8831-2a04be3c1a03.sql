CREATE INDEX IF NOT EXISTS idx_locations_status_category ON public.locations (status, category);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_contributions_created_at ON public.contributions (created_at);
CREATE INDEX IF NOT EXISTS idx_location_proposals_status ON public.location_proposals (status);