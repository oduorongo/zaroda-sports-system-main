-- Migration: Harden RLS for `admins` and add a server-side RPC for login
-- This migration does the following:
-- 1) Ensures pgcrypto is available (for crypt() bcrypt support)
-- 2) Drops permissive policies (if present)
-- 3) Creates a SECURITY DEFINER SQL function `admin_login` that checks a
--    plaintext password against the stored bcrypt hash using crypt()
-- 4) Grants EXECUTE on the function to anon (so the client may call it)
-- 5) Adds restrictive RLS policies using JWT claims for SELECT/UPDATE

-- 1) Ensure pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Drop permissive policies if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'admins' AND p.polname = 'allow_select_for_login'
  ) THEN
    EXECUTE 'DROP POLICY allow_select_for_login ON public.admins';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'admins' AND p.polname = 'allow_update_password'
  ) THEN
    EXECUTE 'DROP POLICY allow_update_password ON public.admins';
  END IF;
END$$;

-- 3) Create SECURITY DEFINER function for login using crypt()
-- The function runs as the owner and can be called by anon to verify credentials
CREATE OR REPLACE FUNCTION public.admin_login(p_username text, p_password text)
RETURNS TABLE(id uuid, username text, email text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, username, email
  FROM public.admins
  WHERE username = p_username
    AND password_hash = crypt(p_password, password_hash)
  LIMIT 1;
$$;

-- Set the owner to the same role that owns the table (usually postgres)
ALTER FUNCTION public.admin_login(text, text) OWNER TO postgres;

-- 4) Grant execute on function to anon and authenticated
GRANT EXECUTE ON FUNCTION public.admin_login(text, text) TO anon, authenticated;

-- 5) Harden RLS policies: allow only the admin themselves to SELECT/UPDATE their row
--    using JWT claim `username`. This assumes your auth JWT sets `username` claim.
--    If your JWT uses `sub` or another claim, adapt accordingly.

-- Ensure RLS is enabled
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Restrictive SELECT: only allow selecting your own admin row
CREATE POLICY select_own_admin ON public.admins
  FOR SELECT
  USING (username = current_setting('jwt.claims.username', true));

-- Restrictive UPDATE: allow updates only to your own row
CREATE POLICY update_own_admin ON public.admins
  FOR UPDATE
  USING (username = current_setting('jwt.claims.username', true))
  WITH CHECK (username = current_setting('jwt.claims.username', true));

-- Note: Because the `admin_login` function is SECURITY DEFINER, callers (e.g., anon)
-- can call the function to authenticate without needing SELECT privileges. The
-- function itself performs the comparison inside the database using `crypt()`.

-- Production notes:
-- - Ensure your Supabase JWT includes a `username` claim when issuing tokens.
-- - Consider revoking direct anon SELECT/UPDATE privileges and only use RPCs/Edge
--   functions for auth-sensitive operations.
-- - If you cannot use `crypt()` (pgcrypto) with bcrypt on your DB, implement an
--   Edge Function as an alternative (example provided in repository).
