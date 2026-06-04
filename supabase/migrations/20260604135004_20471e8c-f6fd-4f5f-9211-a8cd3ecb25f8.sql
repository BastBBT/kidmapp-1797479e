CREATE POLICY "contributions_select_validated_public" ON public.contributions FOR SELECT USING (status = 'validated');
CREATE POLICY "profiles_select_public_basic" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.contributions TO anon;
GRANT SELECT ON public.profiles TO anon;