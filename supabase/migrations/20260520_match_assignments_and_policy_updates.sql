-- Migration: Create assignment tables and tighten referee/scorekeeper policies
-- Date: 2026-05-20

-- 1) Create match_assignments table to map referees/scorekeepers to matches
CREATE TABLE IF NOT EXISTS public.match_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_assignments_match_id ON public.match_assignments(match_id);
CREATE INDEX IF NOT EXISTS idx_match_assignments_user_id ON public.match_assignments(user_id);

ALTER TABLE public.match_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_assignments FORCE ROW LEVEL SECURITY;

-- Only super_admin or tournament_admin may manage assignments
DROP POLICY IF EXISTS "manage_match_assignments" ON public.match_assignments;
CREATE POLICY "manage_match_assignments" ON public.match_assignments FOR ALL TO authenticated
  USING (
    public.has_role('super_admin')
    OR (
      public.has_role('tournament_admin')
      AND EXISTS (
        SELECT 1
        FROM public.games g
        WHERE g.id = match_assignments.match_id
          AND public.is_tournament_admin_for_championship(g.championship_id)
      )
    )
  )
  WITH CHECK (
    public.has_role('super_admin')
    OR (
      public.has_role('tournament_admin')
      AND EXISTS (
        SELECT 1
        FROM public.games g
        WHERE g.id = match_id
          AND public.is_tournament_admin_for_championship(g.championship_id)
      )
    )
  );

-- 2) Create tournament_admin_assignments to explicitly map users to championships/tournaments
CREATE TABLE IF NOT EXISTS public.tournament_admin_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id UUID NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (championship_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ta_assignments_championship ON public.tournament_admin_assignments(championship_id);
CREATE INDEX IF NOT EXISTS idx_ta_assignments_user ON public.tournament_admin_assignments(user_id);

ALTER TABLE public.tournament_admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_admin_assignments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manage_tournament_admin_assignments" ON public.tournament_admin_assignments;
CREATE POLICY "manage_tournament_admin_assignments" ON public.tournament_admin_assignments FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

-- 3) Tighten participants policies: allow referees/scorekeepers to modify results only for matches they are assigned to
-- Replace broad role-based policies with assignment checks.

-- INSERT: allow super_admin, school_admin for own school, and assigned referees/scorekeepers for specific match
DROP POLICY IF EXISTS "referee_insert_results_for_assigned_games" ON public.participants;
CREATE POLICY "referee_insert_results_for_assigned_games" ON public.participants FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('super_admin')
    OR (
      EXISTS (
        SELECT 1 FROM public.officials o WHERE o.user_id = auth.uid() AND o.role = 'school_admin' AND o.institution_id = school_id
      )
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.match_assignments ma WHERE ma.user_id = auth.uid() AND ma.role IN ('referee','scorekeeper') AND ma.match_id = game_id
      )
    )
  );

-- UPDATE: allow super_admin, school_admin for own school, and assigned referees/scorekeepers to update results for assigned matches
DROP POLICY IF EXISTS "referee_update_results_for_assigned_games" ON public.participants;
CREATE POLICY "referee_update_results_for_assigned_games" ON public.participants FOR UPDATE TO authenticated
  USING (
    public.has_role('super_admin')
    OR (
      EXISTS (
        SELECT 1 FROM public.officials o WHERE o.user_id = auth.uid() AND o.role = 'school_admin' AND o.institution_id = participants.school_id
      )
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.match_assignments ma WHERE ma.user_id = auth.uid() AND ma.role IN ('referee','scorekeeper') AND ma.match_id = participants.game_id
      )
    )
  )
  WITH CHECK (
    public.has_role('super_admin')
    OR (
      EXISTS (
        SELECT 1 FROM public.officials o WHERE o.user_id = auth.uid() AND o.role = 'school_admin' AND o.institution_id = school_id
      )
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.match_assignments ma WHERE ma.user_id = auth.uid() AND ma.role IN ('referee','scorekeeper') AND ma.match_id = game_id
      )
    )
  );

-- SELECT: retain previous select policies (school_admin scoped and public safe view)

-- 4) Add defensive indexes to speed assignment checks
CREATE INDEX IF NOT EXISTS idx_match_assignments_user_role_match ON public.match_assignments(user_id, role, match_id);

-- 5) Guidance: If your schema uses a dedicated `matches` table instead of `games`/`match_pools`, update the match_id references accordingly.

-- End of migration
