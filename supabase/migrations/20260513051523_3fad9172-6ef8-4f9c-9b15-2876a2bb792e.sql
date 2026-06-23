CREATE OR REPLACE FUNCTION public.tenant_championship_quota_remaining(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      AND level::text <> 'base'
  )
  SELECT GREATEST(0, (SELECT q FROM total) - (SELECT c FROM used));
$function$;

DROP POLICY IF EXISTS "Tenants insert own championship within quota" ON public.championships;

CREATE POLICY "Tenants insert own championship within quota"
ON public.championships
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  AND (
    level::text = 'base'
    OR public.tenant_championship_quota_remaining(auth.uid()) > 0
  )
);