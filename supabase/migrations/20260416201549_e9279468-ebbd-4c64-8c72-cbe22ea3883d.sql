-- Add new school level enum values
ALTER TYPE public.school_level ADD VALUE IF NOT EXISTS 'senior_secondary';
ALTER TYPE public.school_level ADD VALUE IF NOT EXISTS 'tertiary';

-- Participants: bib number, personal best, lane
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS bib_number TEXT,
  ADD COLUMN IF NOT EXISTS personal_best NUMERIC,
  ADD COLUMN IF NOT EXISTS lane_number INTEGER;

-- Heat participants: lane assignment
ALTER TABLE public.heat_participants
  ADD COLUMN IF NOT EXISTS lane_number INTEGER;

-- Index for bib lookup
CREATE INDEX IF NOT EXISTS idx_participants_bib ON public.participants(bib_number);
CREATE INDEX IF NOT EXISTS idx_participants_game ON public.participants(game_id);