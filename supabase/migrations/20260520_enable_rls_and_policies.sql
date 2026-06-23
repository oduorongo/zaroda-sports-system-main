-- Migration: Enable RLS and add secure policies + officials mapping
-- Date: 2026-05-20
-- Purpose: Harden database by enabling RLS on all app tables and adding
-- role-based policies using a richer role hierarchy. Also create an
-- `officials` mapping table to relate auth users to institutions and roles.

-- 1) Extend app_role enum to include required roles (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('super_admin','tournament_admin','school_admin','referee','scorekeeper','viewer');
  ELSE
    -- Add missing values safely
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tournament_admin';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'school_admin';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'referee';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'scorekeeper';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END$$;

-- 2) Create officials table to map auth users to institutions (schools) and roles.
--    This is used by RLS policies to scope access by institution / tournament.
CREATE TABLE IF NOT EXISTS public.officials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  institution_id UUID NULL REFERENCES public.schools(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.officials ENABLE ROW LEVEL SECURITY;

-- 3) Helper functions for role checks (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM public.officials WHERE user_id = auth.uid() AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.get_official_institution()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT institution_id FROM public.officials WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_tournament_admin_for_championship(_championship_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  assignment_exists BOOLEAN := false;
BEGIN
  IF to_regclass('public.tournament_admin_assignments') IS NULL THEN
    RETURN false;
  END IF;

  EXECUTE
    'SELECT EXISTS (
       SELECT 1
       FROM public.tournament_admin_assignments ta
       WHERE ta.user_id = auth.uid()
         AND ta.championship_id = $1
     )'
    INTO assignment_exists
    USING _championship_id;

  RETURN COALESCE(assignment_exists, false);
END;
$$;

-- 4) Enable and force RLS on all known tables in this project
--    (If new tables exist in future, apply same pattern)

ALTER TABLE IF EXISTS public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schools FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.games FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.participants FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.championships ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.championships FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.circulars ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.circulars FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.heats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.heats FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.heat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.heat_participants FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.match_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.match_pools FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tournament_teams FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.school_bib_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.school_bib_ranges FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.championship_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.championship_subscriptions FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.championship_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.championship_fees FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.team_fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_fee_payments FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_messages FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_transactions FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenants FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscription_plans FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contact_messages FORCE ROW LEVEL SECURITY;

-- 5) Policies: implement role-based access for key tables
--    Pattern: super_admin -> full access; school_admin -> institution-scoped; viewer/anon -> limited SELECT; referee/scorekeeper -> limited operations where applicable.

-- SCHOOLS: public SELECT allowed (basic info), write by super_admin only; school_admin cannot create schools globally
DROP POLICY IF EXISTS "super_admin_all_schools" ON public.schools;
CREATE POLICY "super_admin_all_schools"
  ON public.schools FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

DROP POLICY IF EXISTS "public_select_schools_basic" ON public.schools;
CREATE POLICY "public_select_schools_basic"
  ON public.schools FOR SELECT TO anon, authenticated
  USING (true);

-- GAMES: public SELECT allowed; management by tournament_admin or super_admin
DROP POLICY IF EXISTS "super_admin_all_games" ON public.games;
CREATE POLICY "super_admin_all_games"
  ON public.games FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

DROP POLICY IF EXISTS "tournament_admin_manage_games" ON public.games;
CREATE POLICY "tournament_admin_manage_games"
  ON public.games FOR ALL TO authenticated
  USING (
    public.has_role('tournament_admin')
    AND public.is_tournament_admin_for_championship(championship_id)
  )
  WITH CHECK (
    public.has_role('tournament_admin')
    AND public.is_tournament_admin_for_championship(championship_id)
  );

DROP POLICY IF EXISTS "public_select_games_basic" ON public.games;
CREATE POLICY "public_select_games_basic"
  ON public.games FOR SELECT TO anon, authenticated
  USING (true);

-- PARTICIPANTS: sensitive personal data. Public reads must go through the safe view below; raw table access is authenticated-only.
DROP POLICY IF EXISTS "super_admin_all_participants" ON public.participants;
CREATE POLICY "super_admin_all_participants"
  ON public.participants FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

DROP POLICY IF EXISTS "authenticated_select_participants" ON public.participants;
CREATE POLICY "authenticated_select_participants"
  ON public.participants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.officials o
      WHERE o.user_id = auth.uid()
        AND o.role = 'school_admin'
        AND o.institution_id = participants.school_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.games g
      WHERE g.id = participants.game_id
        AND public.is_tournament_admin_for_championship(g.championship_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.match_assignments ma
      WHERE ma.user_id = auth.uid()
        AND ma.match_id = participants.game_id
        AND ma.role IN ('referee', 'scorekeeper')
    )
  );

DROP POLICY IF EXISTS "authenticated_insert_participants" ON public.participants;
CREATE POLICY "authenticated_insert_participants"
  ON public.participants FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('super_admin')
    OR EXISTS (
      SELECT 1 FROM public.officials o
      WHERE o.user_id = auth.uid()
        AND o.role = 'school_admin'
        AND o.institution_id = school_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.games g
      WHERE g.id = game_id
        AND public.is_tournament_admin_for_championship(g.championship_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.match_assignments ma
      WHERE ma.user_id = auth.uid()
        AND ma.match_id = game_id
        AND ma.role IN ('referee', 'scorekeeper')
    )
  );

DROP POLICY IF EXISTS "authenticated_update_participants" ON public.participants;
CREATE POLICY "authenticated_update_participants"
  ON public.participants FOR UPDATE TO authenticated
  USING (
    public.has_role('super_admin')
    OR EXISTS (
      SELECT 1 FROM public.officials o
      WHERE o.user_id = auth.uid()
        AND o.role = 'school_admin'
        AND o.institution_id = participants.school_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.games g
      WHERE g.id = participants.game_id
        AND public.is_tournament_admin_for_championship(g.championship_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.match_assignments ma
      WHERE ma.user_id = auth.uid()
        AND ma.match_id = participants.game_id
        AND ma.role IN ('referee', 'scorekeeper')
    )
  )
  WITH CHECK (
    public.has_role('super_admin')
    OR EXISTS (
      SELECT 1 FROM public.officials o
      WHERE o.user_id = auth.uid()
        AND o.role = 'school_admin'
        AND o.institution_id = school_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.games g
      WHERE g.id = game_id
        AND public.is_tournament_admin_for_championship(g.championship_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.match_assignments ma
      WHERE ma.user_id = auth.uid()
        AND ma.match_id = game_id
        AND ma.role IN ('referee', 'scorekeeper')
    )
  );

DROP POLICY IF EXISTS "authenticated_delete_participants" ON public.participants;
CREATE POLICY "authenticated_delete_participants"
  ON public.participants FOR DELETE TO authenticated
  USING (
    public.has_role('super_admin')
    OR EXISTS (
      SELECT 1 FROM public.officials o
      WHERE o.user_id = auth.uid()
        AND o.role = 'school_admin'
        AND o.institution_id = participants.school_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.games g
      WHERE g.id = participants.game_id
        AND public.is_tournament_admin_for_championship(g.championship_id)
    )
  );

DROP POLICY IF EXISTS "referee_insert_results_for_assigned_games" ON public.participants;
CREATE POLICY "referee_insert_results_for_assigned_games"
  ON public.participants FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.match_assignments ma
      WHERE ma.user_id = auth.uid()
        AND ma.match_id = game_id
        AND ma.role IN ('referee', 'scorekeeper')
    )
  );

DROP POLICY IF EXISTS "referee_update_results_for_assigned_games" ON public.participants;
CREATE POLICY "referee_update_results_for_assigned_games"
  ON public.participants FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.match_assignments ma
      WHERE ma.user_id = auth.uid()
        AND ma.match_id = participants.game_id
        AND ma.role IN ('referee', 'scorekeeper')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.match_assignments ma
      WHERE ma.user_id = auth.uid()
        AND ma.match_id = game_id
        AND ma.role IN ('referee', 'scorekeeper')
    )
  );

DROP POLICY IF EXISTS "referee_delete_results_for_assigned_games" ON public.participants;
CREATE POLICY "referee_delete_results_for_assigned_games"
  ON public.participants FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.match_assignments ma
      WHERE ma.user_id = auth.uid()
        AND ma.match_id = participants.game_id
        AND ma.role IN ('referee', 'scorekeeper')
    )
  );

-- PUBLIC SAFE VIEW for participants (hide sensitive fields, keep enough data for public UI)
CREATE OR REPLACE VIEW public.public_participants AS
  SELECT
    p.id,
    p.first_name,
    p.last_name,
    p.gender,
    p.position,
    p.score,
    p.time_taken,
    p.is_qualified,
    p.school_id,
    p.game_id,
    p.bib_number,
    p.personal_best,
    p.lane_number,
    p.status,
    p.school_name,
    g.championship_id,
    p.created_at,
    p.updated_at,
    jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'zone', s.zone,
      'subcounty', s.subcounty,
      'county', s.county,
      'region', s.region,
      'country', s.country
    ) AS school,
    jsonb_build_object(
      'id', g.id,
      'name', g.name,
      'championship_id', g.championship_id,
      'school_level', g.school_level,
      'gender', g.gender,
      'category', g.category,
      'level', g.level
    ) AS game
  FROM public.participants p
  LEFT JOIN public.schools s ON s.id = p.school_id
  LEFT JOIN public.games g ON g.id = p.game_id;

GRANT SELECT ON public.public_participants TO anon, authenticated;

-- HEATS and HEAT_PARTICIPANTS
DROP POLICY IF EXISTS "super_admin_all_heats" ON public.heats;
CREATE POLICY "super_admin_all_heats" ON public.heats FOR ALL TO authenticated
  USING (public.has_role('super_admin')) WITH CHECK (public.has_role('super_admin'));

DROP POLICY IF EXISTS "public_select_heats" ON public.heats;
CREATE POLICY "public_select_heats" ON public.heats FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "super_admin_all_heat_participants" ON public.heat_participants;
CREATE POLICY "super_admin_all_heat_participants" ON public.heat_participants FOR ALL TO authenticated
  USING (public.has_role('super_admin')) WITH CHECK (public.has_role('super_admin'));

DROP POLICY IF EXISTS "school_admin_manage_heat_participants" ON public.heat_participants;
CREATE POLICY "school_admin_manage_heat_participants" ON public.heat_participants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.officials o WHERE o.user_id = auth.uid() AND o.role = 'school_admin' AND o.institution_id = (SELECT school_id FROM public.participants p WHERE p.id = heat_participants.participant_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.officials o WHERE o.user_id = auth.uid() AND o.role = 'school_admin' AND o.institution_id = (SELECT school_id FROM public.participants p WHERE p.id = participant_id)));

-- MATCH POOLS (fixtures)
DROP POLICY IF EXISTS "super_admin_all_match_pools" ON public.match_pools;
CREATE POLICY "super_admin_all_match_pools" ON public.match_pools FOR ALL TO authenticated
  USING (public.has_role('super_admin')) WITH CHECK (public.has_role('super_admin'));

DROP POLICY IF EXISTS "public_select_match_pools" ON public.match_pools;
CREATE POLICY "public_select_match_pools" ON public.match_pools FOR SELECT TO anon, authenticated USING (true);

-- TOURNAMENT_TEAMS
DROP POLICY IF EXISTS "super_admin_all_tournament_teams" ON public.tournament_teams;
CREATE POLICY "super_admin_all_tournament_teams" ON public.tournament_teams FOR ALL TO authenticated
  USING (public.has_role('super_admin')) WITH CHECK (public.has_role('super_admin'));

DROP POLICY IF EXISTS "school_admin_own_tournament_teams" ON public.tournament_teams;
CREATE POLICY "school_admin_own_tournament_teams" ON public.tournament_teams FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.officials o WHERE o.user_id = auth.uid() AND o.role = 'school_admin' AND o.institution_id = tournament_teams.school_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.officials o WHERE o.user_id = auth.uid() AND o.role = 'school_admin' AND o.institution_id = school_id));

-- CIRCULARS: public SELECT, create/update by admins
DROP POLICY IF EXISTS "public_select_circulars" ON public.circulars;
CREATE POLICY "public_select_circulars" ON public.circulars FOR SELECT TO anon, authenticated USING (is_published = true OR public.has_role('super_admin') OR (public.has_role('tournament_admin') AND public.is_tournament_admin_for_championship(championship_id)));

DROP POLICY IF EXISTS "admin_manage_circulars" ON public.circulars;
CREATE POLICY "admin_manage_circulars" ON public.circulars FOR ALL TO authenticated
  USING (public.has_role('super_admin') OR (public.has_role('tournament_admin') AND public.is_tournament_admin_for_championship(championship_id)))
  WITH CHECK (public.has_role('super_admin') OR (public.has_role('tournament_admin') AND public.is_tournament_admin_for_championship(championship_id)));

-- ADMIN MESSAGES, NOTIFICATIONS and CONTACT_MESSAGES: restrict visibility
DROP POLICY IF EXISTS "super_admin_admin_messages" ON public.admin_messages;
CREATE POLICY "super_admin_admin_messages" ON public.admin_messages FOR ALL TO authenticated
  USING (public.has_role('super_admin')) WITH CHECK (public.has_role('super_admin'));

DROP POLICY IF EXISTS "super_admin_notifications" ON public.notifications;
CREATE POLICY "super_admin_notifications" ON public.notifications FOR ALL TO authenticated
  USING (public.has_role('super_admin')) WITH CHECK (public.has_role('super_admin'));

DROP POLICY IF EXISTS "contact_messages_insert_authenticated" ON public.contact_messages;
CREATE POLICY "contact_messages_insert_authenticated" ON public.contact_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "contact_messages_select_admins" ON public.contact_messages;
CREATE POLICY "contact_messages_select_admins" ON public.contact_messages FOR SELECT TO authenticated
  USING (public.has_role('super_admin'));

-- FINANCIAL TABLES: only super_admin or tenant owners (tenants table exists)
DROP POLICY IF EXISTS "super_admin_payments" ON public.payment_transactions;
CREATE POLICY "super_admin_payments" ON public.payment_transactions FOR ALL TO authenticated
  USING (public.has_role('super_admin')) WITH CHECK (public.has_role('super_admin'));

DROP POLICY IF EXISTS "super_admin_fees" ON public.championship_fees;
CREATE POLICY "super_admin_fees" ON public.championship_fees FOR ALL TO authenticated
  USING (public.has_role('super_admin')) WITH CHECK (public.has_role('super_admin'));

DROP POLICY IF EXISTS "super_admin_team_fee_payments" ON public.team_fee_payments;
CREATE POLICY "super_admin_team_fee_payments" ON public.team_fee_payments FOR ALL TO authenticated
  USING (public.has_role('super_admin')) WITH CHECK (public.has_role('super_admin'));

-- TENANTS / SUBSCRIPTIONS: tenant admins or super_admin
DROP POLICY IF EXISTS "super_admin_tenants" ON public.tenants;
CREATE POLICY "super_admin_tenants" ON public.tenants FOR ALL TO authenticated
  USING (public.has_role('super_admin')) WITH CHECK (public.has_role('super_admin'));

DROP POLICY IF EXISTS "tenant_owner_select_tenants" ON public.tenants;
CREATE POLICY "tenant_owner_select_tenants" ON public.tenants FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "tenant_owner_insert_tenants" ON public.tenants;
CREATE POLICY "tenant_owner_insert_tenants" ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "tenant_owner_update_tenants" ON public.tenants;
CREATE POLICY "tenant_owner_update_tenants" ON public.tenants FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "public_select_subscription_plans" ON public.subscription_plans;
CREATE POLICY "public_select_subscription_plans" ON public.subscription_plans FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "tenant_owner_select_championship_subscriptions" ON public.championship_subscriptions;
CREATE POLICY "tenant_owner_select_championship_subscriptions" ON public.championship_subscriptions FOR SELECT TO authenticated
  USING (
    public.has_role('super_admin')
    OR EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = championship_subscriptions.tenant_id
        AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tenant_admin_manage_subscriptions" ON public.championship_subscriptions;
CREATE POLICY "tenant_admin_manage_subscriptions" ON public.championship_subscriptions FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

DROP POLICY IF EXISTS "user_select_own_notifications" ON public.notifications;
CREATE POLICY "user_select_own_notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role('super_admin'));

DROP POLICY IF EXISTS "user_update_own_notifications" ON public.notifications;
CREATE POLICY "user_update_own_notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role('super_admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role('super_admin'));

DROP POLICY IF EXISTS "school_admin_manage_bib_ranges" ON public.school_bib_ranges;
CREATE POLICY "school_admin_manage_bib_ranges" ON public.school_bib_ranges FOR ALL TO authenticated
  USING (
    public.has_role('super_admin')
    OR EXISTS (
      SELECT 1 FROM public.officials o
      WHERE o.user_id = auth.uid()
        AND o.role = 'school_admin'
        AND o.institution_id = school_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.championships c
      WHERE c.id = championship_id
        AND public.is_tournament_admin_for_championship(c.id)
    )
  )
  WITH CHECK (
    public.has_role('super_admin')
    OR EXISTS (
      SELECT 1 FROM public.officials o
      WHERE o.user_id = auth.uid()
        AND o.role = 'school_admin'
        AND o.institution_id = school_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.championships c
      WHERE c.id = championship_id
        AND public.is_tournament_admin_for_championship(c.id)
    )
  );

-- 6) Notes / guidance: IMPORTANT
-- - These policies provide a starting point. After applying, review and tighten WHERE clauses
--   so that tournament_admin policies check tournament ownership (requires tournament ownership table)
-- - For referee/scorekeeper constraints, replace the broad role checks with match-assignment checks
--   (e.g., EXISTS in match_assignments table) when that assignment table exists.
-- - Do NOT remove service_role restrictions from migrations here; service_role should only be used
--   in Edge Functions or server-side processes. Ensure secrets are not present in client code.

-- End of migration
