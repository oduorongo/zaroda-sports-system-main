-- Migration: Enable RLS and add policies for the `admins` table
-- NOTE: These policies are intentionally permissive to fix 406 errors for the
-- current client-side login flow (which fetches an admin row by username and
-- compares password client-side). For production, prefer using a server-side
-- RPC (Edge Function) to perform authentication, or tighten policies to only
-- allow specific claims / authenticated roles to access rows.

-- Enable Row Level Security
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Allow SELECT for login verification
-- This policy permits read access; it should be tightened in production.
CREATE POLICY allow_select_for_login ON public.admins
  FOR SELECT
  USING (true);

-- Allow UPDATE only for password changes
-- This policy permits updates to rows in `admins`. In production you should
-- restrict this to the authenticated admin updating their own row, for example
-- by comparing claims in the JWT to the `id` or `username` field.
CREATE POLICY allow_update_password ON public.admins
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Grant minimal privileges to the anon role if necessary (optional)
-- GRANT SELECT, UPDATE ON public.admins TO anon;

-- IMPORTANT:
-- - The above policies fix the immediate 406 errors by enabling access for
--   the client to fetch admin rows. They intentionally allow access and MUST
--   be reviewed before deploying to production.
-- - Recommended hardening steps:
--   1) Create an RPC (stored procedure) or Supabase Edge Function to perform
--      login server-side so cleartext/hash values never leave the DB.
--   2) Use JWT claims to restrict SELECT/UPDATE to only the relevant admin
--      row (e.g., USING (username = current_setting('jwt.claims.username', true))).
--   3) Only allow the `service_role` or authenticated server to perform
--      administrative updates when necessary.
