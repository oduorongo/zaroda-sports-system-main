-- Team fee payments: replace SECURITY DEFINER view with invoker + base policy + column grants.
ALTER VIEW public.public_team_fee_payments SET (security_invoker = on);

CREATE POLICY "Anyone can view team payment status"
  ON public.team_fee_payments FOR SELECT TO anon, authenticated
  USING (true);

REVOKE SELECT ON public.team_fee_payments FROM anon, authenticated;
GRANT SELECT (
  id, team_id, fee_id, championship_id, amount_kes, status, paid_at, notes, created_at, updated_at
) ON public.team_fee_payments TO anon, authenticated;

-- Trigger helper function should never be directly callable.
REVOKE EXECUTE ON FUNCTION public.grant_tenant_admin_role() FROM anon, authenticated, public;

-- Remaining SECURITY DEFINER helpers: remove anonymous executability (authenticated retained where used).
REVOKE EXECUTE ON FUNCTION public.get_user_championship_id(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.tenant_has_active_access(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_user_championship_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_has_active_access(uuid) TO authenticated;