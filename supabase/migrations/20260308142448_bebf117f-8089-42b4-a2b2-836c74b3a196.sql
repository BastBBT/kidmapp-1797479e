
INSERT INTO storage.buckets (id, name, public) VALUES ('location-photos', 'location-photos', true);

CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'location-photos');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'location-photos');
