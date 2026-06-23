
-- Trigger: when a championship_subscription is inserted, ensure the tenant's user has the 'admin' role
CREATE OR REPLACE FUNCTION public.grant_tenant_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM public.tenants WHERE id = NEW.tenant_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_tenant_admin_role ON public.championship_subscriptions;
CREATE TRIGGER trg_grant_tenant_admin_role
AFTER INSERT ON public.championship_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.grant_tenant_admin_role();

-- Backfill: grant admin role to existing tenants that already have a subscription
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT t.user_id, 'admin'::app_role
FROM public.tenants t
JOIN public.championship_subscriptions cs ON cs.tenant_id = t.id
WHERE t.user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;
