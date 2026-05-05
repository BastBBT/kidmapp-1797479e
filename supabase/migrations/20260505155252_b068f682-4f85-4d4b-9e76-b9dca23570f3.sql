
CREATE TABLE IF NOT EXISTS public.account_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  reason text
);

ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_deletions_select_admin" ON public.account_deletions
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_notifications_select_admin" ON public.admin_notifications
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "admin_notifications_update_admin" ON public.admin_notifications
  FOR UPDATE USING (public.is_admin(auth.uid()));
