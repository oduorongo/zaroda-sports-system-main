-- 1. Add championship_quota to plans
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS championship_quota integer NOT NULL DEFAULT 1;

UPDATE public.subscription_plans SET championship_quota = 1   WHERE package_tier = 'essential';
UPDATE public.subscription_plans SET championship_quota = 3   WHERE package_tier = 'professional';
UPDATE public.subscription_plans SET championship_quota = 5   WHERE package_tier = 'elite';
UPDATE public.subscription_plans SET championship_quota = 999 WHERE package_tier = 'season_bundle';

-- 2. Helper: remaining quota across a tenant's active/trialing subs
CREATE OR REPLACE FUNCTION public.tenant_championship_quota_remaining(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH t AS (
    SELECT id FROM public.tenants WHERE user_id = _user_id LIMIT 1
  ),
  total AS (
    SELECT COALESCE(SUM(sp.championship_quota), 0)::int AS q
    FROM public.championship_subscriptions cs
    JOIN public.subscription_plans sp ON sp.id = cs.plan_id
    WHERE cs.tenant_id = (SELECT id FROM t)
      AND (
        (cs.status = 'trialing' AND cs.trial_ends_at > now())
        OR (cs.status = 'active' AND (cs.expires_at IS NULL OR cs.expires_at > now()))
      )
  ),
  used AS (
    SELECT COUNT(*)::int AS c
    FROM public.championships
    WHERE tenant_id = (SELECT id FROM t)
  )
  SELECT GREATEST(0, (SELECT q FROM total) - (SELECT c FROM used));
$$;

-- 3. Allow tenants to create their own championships within quota
DROP POLICY IF EXISTS "Tenants insert own championship within quota" ON public.championships;
CREATE POLICY "Tenants insert own championship within quota"
ON public.championships
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  AND public.tenant_championship_quota_remaining(auth.uid()) > 0
);

-- 4. Allow tenants to view their own championships in a managed way (read is already public, but keep for clarity if RLS tightened later)
-- (no-op if "Anyone can view championships" is still in place)

-- 5. Allow tenants to update/delete their own championships
DROP POLICY IF EXISTS "Tenants update own championships" ON public.championships;
CREATE POLICY "Tenants update own championships"
ON public.championships
FOR UPDATE
TO authenticated
USING (tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid()))
WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenants delete own championships" ON public.championships;
CREATE POLICY "Tenants delete own championships"
ON public.championships
FOR DELETE
TO authenticated
USING (tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid()));