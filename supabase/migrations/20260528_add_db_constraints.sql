-- Security hardening migration: add conservative constraints to the actual
-- Zaroda Sports schema used by this workspace.
--
-- Why this is additive:
-- - The current schema uses UUID keys in the generated types, so no primary-key
--   rewrite is needed here.
-- - Existing production data may already be dirty, so CHECK constraints are added
--   as NOT VALID where possible and only promoted when safe.
-- - Unique indexes are only created after duplicate prechecks to avoid downtime.

-- -----------------------------------------------------------------------------
-- Helper: add NOT NULL only when the current table data already satisfies it.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  null_count bigint;
BEGIN
  SELECT count(*) INTO null_count FROM public.tenants WHERE organization_name IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.tenants ALTER COLUMN organization_name SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.tenants WHERE contact_name IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.tenants ALTER COLUMN contact_name SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.tenants WHERE email IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.tenants ALTER COLUMN email SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.tenants WHERE user_id IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.tenants ALTER COLUMN user_id SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.championships WHERE name IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.championships ALTER COLUMN name SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.championships WHERE level IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.championships ALTER COLUMN level SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.championships WHERE school_level IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.championships ALTER COLUMN school_level SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.games WHERE name IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.games ALTER COLUMN name SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.games WHERE category IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.games ALTER COLUMN category SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.games WHERE level IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.games ALTER COLUMN level SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.participants WHERE first_name IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.participants ALTER COLUMN first_name SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.participants WHERE last_name IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.participants ALTER COLUMN last_name SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.participants WHERE game_id IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.participants ALTER COLUMN game_id SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.participants WHERE gender IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.participants ALTER COLUMN gender SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.school_bib_ranges WHERE championship_id IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.school_bib_ranges ALTER COLUMN championship_id SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.school_bib_ranges WHERE school_id IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.school_bib_ranges ALTER COLUMN school_id SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.school_bib_ranges WHERE range_start IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.school_bib_ranges ALTER COLUMN range_start SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.school_bib_ranges WHERE range_end IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.school_bib_ranges ALTER COLUMN range_end SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.subscription_plans WHERE display_name IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.subscription_plans ALTER COLUMN display_name SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.subscription_plans WHERE price_kes IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.subscription_plans ALTER COLUMN price_kes SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.subscription_plans WHERE tier IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.subscription_plans ALTER COLUMN tier SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.subscription_plans WHERE is_active IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.subscription_plans ALTER COLUMN is_active SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.notifications WHERE user_id IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.notifications ALTER COLUMN user_id SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.notifications WHERE title IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.notifications ALTER COLUMN title SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.notifications WHERE type IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.notifications ALTER COLUMN type SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.tournament_teams WHERE championship_id IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.tournament_teams ALTER COLUMN championship_id SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.tournament_teams WHERE name IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.tournament_teams ALTER COLUMN name SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.team_fee_payments WHERE amount_kes IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.team_fee_payments ALTER COLUMN amount_kes SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.team_fee_payments WHERE championship_id IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.team_fee_payments ALTER COLUMN championship_id SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.team_fee_payments WHERE fee_id IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.team_fee_payments ALTER COLUMN fee_id SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.team_fee_payments WHERE team_id IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.team_fee_payments ALTER COLUMN team_id SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.contact_messages WHERE email IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.contact_messages ALTER COLUMN email SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.contact_messages WHERE message IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.contact_messages ALTER COLUMN message SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.contact_messages WHERE name IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.contact_messages ALTER COLUMN name SET NOT NULL;
  END IF;

  SELECT count(*) INTO null_count FROM public.contact_messages WHERE subject IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.contact_messages ALTER COLUMN subject SET NOT NULL;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Optional officials.email column: backfill from auth.users when available.
-- WHY: the security audit requested email on officials so audit/ops flows can
-- resolve human-readable identities without exposing auth internals.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'officials'
      AND column_name = 'email'
  ) THEN
    ALTER TABLE public.officials ADD COLUMN email text;
    UPDATE public.officials o
    SET email = u.email
    FROM auth.users u
    WHERE u.id = o.user_id;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- CHECK constraints, added as NOT VALID so new writes are protected immediately
-- while historical rows can be reviewed and cleaned up separately.
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE public.participants
    ADD CONSTRAINT valid_participant_dob
    CHECK (
      date_of_birth IS NULL
      OR (date_of_birth > DATE '1985-01-01' AND date_of_birth < CURRENT_DATE - INTERVAL '8 years')
    ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.participants
    ADD CONSTRAINT valid_participant_gender
    CHECK (gender IN ('male', 'female', 'boys', 'girls', 'mixed')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.participants
    ADD CONSTRAINT valid_participant_position
    CHECK (position IS NULL OR (position >= 1 AND position <= 999)) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.participants
    ADD CONSTRAINT valid_participant_score
    CHECK (score IS NULL OR (score >= 0 AND score <= 999)) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.games
    ADD CONSTRAINT valid_game_max_qualifiers
    CHECK (max_qualifiers IS NULL OR (max_qualifiers >= 0 AND max_qualifiers <= 999)) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.match_pools
    ADD CONSTRAINT valid_match_pool_scores
    CHECK (
      (team_a_score IS NULL OR (team_a_score >= 0 AND team_a_score <= 999))
      AND (team_b_score IS NULL OR (team_b_score >= 0 AND team_b_score <= 999))
    ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.school_bib_ranges
    ADD CONSTRAINT valid_school_bib_range
    CHECK (range_start >= 1 AND range_end >= range_start) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.subscription_plans
    ADD CONSTRAINT valid_subscription_plan_price
    CHECK (price_kes >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.subscription_plans
    ADD CONSTRAINT valid_subscription_plan_quota
    CHECK (championship_quota >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.notifications
    ADD CONSTRAINT valid_notification_title
    CHECK (btrim(title) <> '') NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.tournament_teams
    ADD CONSTRAINT valid_team_name
    CHECK (btrim(name) <> '') NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.tenants
    ADD CONSTRAINT valid_tenant_email
    CHECK (position('@' in email) > 1) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.contact_messages
    ADD CONSTRAINT valid_contact_email
    CHECK (position('@' in email) > 1) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.team_fee_payments
    ADD CONSTRAINT valid_team_payment_amount
    CHECK (amount_kes >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- Unique indexes: use prechecks and EXECUTE so the migration remains safe even
-- if older data already contains duplicates.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.ux_tenants_user_id') IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.tenants GROUP BY user_id HAVING count(*) > 1) THEN
      EXECUTE 'CREATE UNIQUE INDEX ux_tenants_user_id ON public.tenants (user_id)';
    END IF;
  END IF;

  IF to_regclass('public.ux_officials_user_id') IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.officials GROUP BY user_id HAVING count(*) > 1) THEN
      EXECUTE 'CREATE UNIQUE INDEX ux_officials_user_id ON public.officials (user_id)';
    END IF;
  END IF;

  IF to_regclass('public.ux_school_bib_ranges_championship_school') IS NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.school_bib_ranges
      GROUP BY championship_id, school_id
      HAVING count(*) > 1
    ) THEN
      EXECUTE 'CREATE UNIQUE INDEX ux_school_bib_ranges_championship_school ON public.school_bib_ranges (championship_id, school_id)';
    END IF;
  END IF;

  IF to_regclass('public.ux_tournament_teams_name_per_championship') IS NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.tournament_teams
      GROUP BY championship_id, name
      HAVING count(*) > 1
    ) THEN
      EXECUTE 'CREATE UNIQUE INDEX ux_tournament_teams_name_per_championship ON public.tournament_teams (championship_id, name)';
    END IF;
  END IF;

  IF to_regclass('public.ux_games_name_per_championship') IS NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.games
      GROUP BY championship_id, name
      HAVING count(*) > 1
    ) THEN
      EXECUTE 'CREATE UNIQUE INDEX ux_games_name_per_championship ON public.games (championship_id, name)';
    END IF;
  END IF;

  IF to_regclass('public.ux_heats_game_heat_number') IS NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.heats
      GROUP BY game_id, heat_number
      HAVING count(*) > 1
    ) THEN
      EXECUTE 'CREATE UNIQUE INDEX ux_heats_game_heat_number ON public.heats (game_id, heat_number)';
    END IF;
  END IF;

  IF to_regclass('public.ux_heat_participants_heat_participant') IS NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.heat_participants
      GROUP BY heat_id, participant_id
      HAVING count(*) > 1
    ) THEN
      EXECUTE 'CREATE UNIQUE INDEX ux_heat_participants_heat_participant ON public.heat_participants (heat_id, participant_id)';
    END IF;
  END IF;

  IF to_regclass('public.ux_match_pools_game_round') IS NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.match_pools
      GROUP BY game_id, round_name
      HAVING count(*) > 1
    ) THEN
      EXECUTE 'CREATE UNIQUE INDEX ux_match_pools_game_round ON public.match_pools (game_id, round_name)';
    END IF;
  END IF;

  IF to_regclass('public.ux_team_fee_payments_fee_team') IS NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.team_fee_payments
      GROUP BY fee_id, team_id
      HAVING count(*) > 1
    ) THEN
      EXECUTE 'CREATE UNIQUE INDEX ux_team_fee_payments_fee_team ON public.team_fee_payments (fee_id, team_id)';
    END IF;
  END IF;

  IF to_regclass('public.ux_user_roles_unique_role_assignment') IS NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.user_roles
      GROUP BY user_id, role, championship_id
      HAVING count(*) > 1
    ) THEN
      EXECUTE 'CREATE UNIQUE INDEX ux_user_roles_unique_role_assignment ON public.user_roles (user_id, role, championship_id)';
    END IF;
  END IF;

  IF to_regclass('public.ux_championship_fees_name_per_championship') IS NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.championship_fees
      GROUP BY championship_id, name
      HAVING count(*) > 1
    ) THEN
      EXECUTE 'CREATE UNIQUE INDEX ux_championship_fees_name_per_championship ON public.championship_fees (championship_id, name)';
    END IF;
  END IF;

  IF to_regclass('public.ux_payment_transactions_reference') IS NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.payment_transactions
      GROUP BY paystack_reference
      HAVING count(*) > 1
    ) THEN
      EXECUTE 'CREATE UNIQUE INDEX ux_payment_transactions_reference ON public.payment_transactions (paystack_reference)';
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Supporting indexes for the RLS policies and auth.uid lookups.
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_games_championship_id ON public.games (championship_id);
CREATE INDEX IF NOT EXISTS idx_participants_game_id ON public.participants (game_id);
CREATE INDEX IF NOT EXISTS idx_participants_school_id ON public.participants (school_id);
CREATE INDEX IF NOT EXISTS idx_officials_user_id ON public.officials (user_id);
CREATE INDEX IF NOT EXISTS idx_match_assignments_user_id ON public.match_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_match_assignments_match_id ON public.match_assignments (match_id);
CREATE INDEX IF NOT EXISTS idx_championship_subscriptions_tenant_id ON public.championship_subscriptions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_school_bib_ranges_championship_id ON public.school_bib_ranges (championship_id);
CREATE INDEX IF NOT EXISTS idx_school_bib_ranges_school_id ON public.school_bib_ranges (school_id);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_championship_id ON public.tournament_teams (championship_id);
CREATE INDEX IF NOT EXISTS idx_heats_game_id ON public.heats (game_id);
CREATE INDEX IF NOT EXISTS idx_heat_participants_heat_id ON public.heat_participants (heat_id);
CREATE INDEX IF NOT EXISTS idx_heat_participants_participant_id ON public.heat_participants (participant_id);
CREATE INDEX IF NOT EXISTS idx_match_pools_game_id ON public.match_pools (game_id);
CREATE INDEX IF NOT EXISTS idx_championship_fees_championship_id ON public.championship_fees (championship_id);
CREATE INDEX IF NOT EXISTS idx_team_fee_payments_team_id ON public.team_fee_payments (team_id);
CREATE INDEX IF NOT EXISTS idx_team_fee_payments_championship_id ON public.team_fee_payments (championship_id);

-- End of migration