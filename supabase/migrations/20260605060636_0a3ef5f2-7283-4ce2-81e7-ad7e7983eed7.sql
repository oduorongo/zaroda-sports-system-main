-- 1. Public-safe view of team fee payments (excludes paystack_reference)
DROP VIEW IF EXISTS public.public_team_fee_payments;
CREATE VIEW public.public_team_fee_payments AS
  SELECT
    id,
    team_id,
    fee_id,
    championship_id,
    amount_kes,
    status,
    paid_at,
    notes,
    created_at,
    updated_at
  FROM public.team_fee_payments;

GRANT SELECT ON public.public_team_fee_payments TO anon, authenticated;

-- 2. Lock down direct access to the base payments table (remove public SELECT)
DROP POLICY IF EXISTS "Anyone views team payments" ON public.team_fee_payments;
-- super_admin and service_role policies remain in place for full access.

-- 3. Harden realtime: only authenticated users, scoped to their own notification topic
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users receive own notification topic" ON realtime.messages;
CREATE POLICY "Users receive own notification topic"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING ( realtime.topic() = 'notifications-' || (auth.uid())::text );
