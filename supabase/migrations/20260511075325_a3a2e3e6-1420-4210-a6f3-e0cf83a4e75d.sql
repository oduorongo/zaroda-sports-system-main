-- 1. Extend gender enum
ALTER TYPE public.gender ADD VALUE IF NOT EXISTS 'male';
ALTER TYPE public.gender ADD VALUE IF NOT EXISTS 'female';

-- 2. Participant status enum (call room workflow)
DO $$ BEGIN
  CREATE TYPE public.participant_status AS ENUM ('registered','called','present','absent','advanced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Participants: DOB + status
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS status public.participant_status NOT NULL DEFAULT 'registered';

-- 4. Games: scheduled date for multi-day championships
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS scheduled_date date;

-- 5. School bib ranges
CREATE TABLE IF NOT EXISTS public.school_bib_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id uuid NOT NULL,
  school_id uuid NOT NULL,
  range_start integer NOT NULL,
  range_end integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (championship_id, school_id),
  CHECK (range_end >= range_start)
);

ALTER TABLE public.school_bib_ranges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views bib ranges"
  ON public.school_bib_ranges FOR SELECT
  USING (true);

CREATE POLICY "Service role manages bib ranges"
  ON public.school_bib_ranges FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Super admin manages bib ranges"
  ON public.school_bib_ranges FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_school_bib_ranges_updated_at
  BEFORE UPDATE ON public.school_bib_ranges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_school_bib_ranges_championship ON public.school_bib_ranges(championship_id);
CREATE INDEX IF NOT EXISTS idx_participants_status ON public.participants(status);
CREATE INDEX IF NOT EXISTS idx_games_scheduled_date ON public.games(scheduled_date);