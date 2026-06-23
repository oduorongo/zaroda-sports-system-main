-- 1. Add championship_id to user_roles (only used for level admins)
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS championship_id uuid;

CREATE INDEX IF NOT EXISTS idx_user_roles_championship_id
  ON public.user_roles(championship_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON public.user_roles(user_id);

-- 2. Add created_by to championships (tracks which super admin created it)
ALTER TABLE public.championships
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- 3. Helper function: returns the championship_id assigned to a level admin (NULL for super admins)
CREATE OR REPLACE FUNCTION public.get_user_championship_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT championship_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role = 'admin'::app_role
  LIMIT 1
$$;

-- 4. Drop the legacy admins table (auth now lives in auth.users)
DROP TABLE IF EXISTS public.admins CASCADE;

-- 5. Notifications table (in-app inbox per user)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users read own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users update own notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role manages everything (used by edge functions)
CREATE POLICY "Service role manages notifications"
  ON public.notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;