ALTER TYPE public.competition_level ADD VALUE IF NOT EXISTS 'base' BEFORE 'zone';
ALTER TYPE public.game_category ADD VALUE IF NOT EXISTS 'indoor';