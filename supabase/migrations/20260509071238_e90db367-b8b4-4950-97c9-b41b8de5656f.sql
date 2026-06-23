
-- ============ Phase 1: Super Admin tools ============

-- Add last_active tracking on tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();

-- In-app messages (super-admin <-> tenant)
CREATE TABLE IF NOT EXISTS public.admin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  recipient_id UUID,            -- null = broadcast to all tenants
  parent_id UUID REFERENCES public.admin_messages(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_broadcast BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_messages_recipient ON public.admin_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_sender ON public.admin_messages(sender_id);

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- Super admin sees everything
CREATE POLICY "Super admin all messages"
  ON public.admin_messages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Tenants see their own messages (sent or received, plus broadcasts)
CREATE POLICY "Users see own messages"
  ON public.admin_messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR is_broadcast = true);

-- Tenants can send messages (only to super-admin -- enforced in app layer; DB just allows insert as self)
CREATE POLICY "Users send own messages"
  ON public.admin_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid() AND is_broadcast = false);

-- Recipients can mark as read
CREATE POLICY "Recipients update read"
  ON public.admin_messages FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Super-admin policies on tenants/subscriptions/payments (override)
CREATE POLICY "Super admin manages tenants"
  ON public.tenants FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin manages subs"
  ON public.championship_subscriptions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin views payments"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- ============ Phase 2: Open Tournament teams + fees ============

CREATE TABLE IF NOT EXISTS public.tournament_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id UUID NOT NULL,
  name TEXT NOT NULL,
  team_code TEXT,
  team_color TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournament_teams_championship
  ON public.tournament_teams(championship_id);

ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views teams"
  ON public.tournament_teams FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role manages teams"
  ON public.tournament_teams FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Super admin manages teams"
  ON public.tournament_teams FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_tournament_teams_updated
  BEFORE UPDATE ON public.tournament_teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow participants to belong to tournament teams instead of schools
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS tournament_team_id UUID REFERENCES public.tournament_teams(id) ON DELETE SET NULL;

ALTER TABLE public.participants
  ALTER COLUMN school_id DROP NOT NULL;

-- Championship fee items (admin-defined)
CREATE TABLE IF NOT EXISTS public.championship_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id UUID NOT NULL,
  name TEXT NOT NULL,            -- e.g. "Registration"
  description TEXT,
  amount_kes INTEGER NOT NULL CHECK (amount_kes >= 0),
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_championship_fees_championship
  ON public.championship_fees(championship_id);

ALTER TABLE public.championship_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views fees"
  ON public.championship_fees FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role manages fees"
  ON public.championship_fees FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Super admin manages fees"
  ON public.championship_fees FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_championship_fees_updated
  BEFORE UPDATE ON public.championship_fees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-team fee payments
DO $$ BEGIN
  CREATE TYPE public.team_payment_status AS ENUM ('pending', 'paid', 'waived', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.team_fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  fee_id UUID NOT NULL REFERENCES public.championship_fees(id) ON DELETE CASCADE,
  championship_id UUID NOT NULL,
  amount_kes INTEGER NOT NULL,
  status public.team_payment_status NOT NULL DEFAULT 'pending',
  paystack_reference TEXT,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_fee_payments_team ON public.team_fee_payments(team_id);
CREATE INDEX IF NOT EXISTS idx_team_fee_payments_championship ON public.team_fee_payments(championship_id);

ALTER TABLE public.team_fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views team payments"
  ON public.team_fee_payments FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role manages team payments"
  ON public.team_fee_payments FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Super admin manages team payments"
  ON public.team_fee_payments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_team_fee_payments_updated
  BEFORE UPDATE ON public.team_fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
