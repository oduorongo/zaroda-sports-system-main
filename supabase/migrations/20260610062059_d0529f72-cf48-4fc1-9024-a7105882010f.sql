-- 1. Privilege escalation fix: remove over-permissive admin role-management policy.
-- Role assignments are handled exclusively by the manage-admins edge function (service_role).
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- 2. Protect sensitive participant columns (contact, date_of_birth) via column-level grants.
-- Row access stays public for results pages, but sensitive columns become unreadable.
REVOKE SELECT ON public.participants FROM anon, authenticated;
GRANT SELECT (
  id, first_name, last_name, gender, position, score, time_taken, is_qualified,
  school_id, game_id, notes, tournament_team_id, lane_number, bib_number,
  personal_best, status, school_name, created_at, updated_at
) ON public.participants TO anon, authenticated;

-- 3. Make the public participants view run with the querying user's privileges.
ALTER VIEW public.public_participants SET (security_invoker = on);

-- 4. Storage: stop public listing of the circulars bucket while keeping public
-- direct-download links working (public bucket objects are served without this policy).
DROP POLICY IF EXISTS "Anyone can view circular files" ON storage.objects;
CREATE POLICY "Admins can view circulars"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'circulars'
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  );

-- 5. Remove direct executability of SECURITY DEFINER helper functions for anonymous users.
-- authenticated retains EXECUTE because these are required during RLS policy evaluation.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.tenant_championship_quota_remaining(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_championship_quota_remaining(uuid) TO authenticated;