
CREATE TABLE public.location_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  address TEXT NOT NULL,
  high_chair BOOLEAN DEFAULT false,
  changing_table BOOLEAN DEFAULT false,
  kids_area BOOLEAN DEFAULT false,
  note TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.location_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_insert_proposals" ON public.location_proposals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_select_own_proposals" ON public.location_proposals
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admin_all_proposals" ON public.location_proposals
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));
