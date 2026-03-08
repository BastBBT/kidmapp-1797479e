CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, location_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_favorites" ON public.favorites
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_favorites" ON public.favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_delete_own_favorites" ON public.favorites
  FOR DELETE USING (auth.uid() = user_id);