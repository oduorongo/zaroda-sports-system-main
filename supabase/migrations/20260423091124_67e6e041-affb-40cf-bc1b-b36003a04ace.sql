
-- Tenants table (organizations that pay to use the system)
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  organization_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  county TEXT,
  subcounty TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants view own record" ON public.tenants
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Tenants update own record" ON public.tenants
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Tenants insert own record" ON public.tenants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages tenants" ON public.tenants
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Subscription plans (pricing tiers)
CREATE TYPE public.competition_tier AS ENUM ('zone','subcounty','county','regional','national','open_tournament');

CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier public.competition_tier NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  price_kes INTEGER NOT NULL,
  trial_days INTEGER NOT NULL DEFAULT 7,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views plans" ON public.subscription_plans
  FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Service role manages plans" ON public.subscription_plans
  FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.subscription_plans (tier, display_name, description, price_kes) VALUES
  ('zone', 'Zone Level', 'Manage one zone-level championship (Tertiary, Senior School, Primary/JSS)', 580),
  ('subcounty', 'Sub-County Level', 'Manage one sub-county championship', 1160),
  ('county', 'County Level', 'Manage one county championship', 2320),
  ('regional', 'Regional Level', 'Manage one regional championship', 3480),
  ('national', 'National Level', 'Manage one national championship', 5800),
  ('open_tournament', 'Open Tournament', 'Manage one open tournament', 5800);

-- Championship subscriptions (trial + paid status per championship)
CREATE TYPE public.subscription_status AS ENUM ('trialing','active','expired','cancelled');

CREATE TABLE public.championship_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  championship_id UUID,
  plan_id UUID NOT NULL,
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  amount_paid_kes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.championship_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants view own subs" ON public.championship_subscriptions
  FOR SELECT TO authenticated USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );
CREATE POLICY "Tenants insert own subs" ON public.championship_subscriptions
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );
CREATE POLICY "Service role manages subs" ON public.championship_subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_subs_updated_at BEFORE UPDATE ON public.championship_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payment transactions (Paystack records)
CREATE TYPE public.payment_status AS ENUM ('pending','success','failed','abandoned');

CREATE TABLE public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  subscription_id UUID,
  plan_id UUID NOT NULL,
  paystack_reference TEXT NOT NULL UNIQUE,
  amount_kes INTEGER NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  paystack_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants view own tx" ON public.payment_transactions
  FOR SELECT TO authenticated USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );
CREATE POLICY "Service role manages tx" ON public.payment_transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_tx_updated_at BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link championships to tenants
ALTER TABLE public.championships ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Helper: check active access (trial or paid) for a tenant
CREATE OR REPLACE FUNCTION public.tenant_has_active_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.championship_subscriptions cs
    JOIN public.tenants t ON t.id = cs.tenant_id
    WHERE t.user_id = _user_id
      AND (
        (cs.status = 'trialing' AND cs.trial_ends_at > now())
        OR (cs.status = 'active' AND (cs.expires_at IS NULL OR cs.expires_at > now()))
      )
  );
$$;
