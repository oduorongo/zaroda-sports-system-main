
-- Add gender enum
CREATE TYPE public.gender AS ENUM ('boys', 'girls');

-- Add school_level enum
CREATE TYPE public.school_level AS ENUM ('primary', 'junior_secondary');

-- Add gender and school_level columns to games table
ALTER TABLE public.games ADD COLUMN gender public.gender NOT NULL DEFAULT 'boys';
ALTER TABLE public.games ADD COLUMN school_level public.school_level NOT NULL DEFAULT 'primary';

-- Add gender to participants table
ALTER TABLE public.participants ADD COLUMN gender public.gender NOT NULL DEFAULT 'boys';

-- Rename 'athletes' to 'athletics' in game_category enum
ALTER TYPE public.game_category RENAME VALUE 'athletes' TO 'athletics';

-- Add email column to admins table
ALTER TABLE public.admins ADD COLUMN email text;

-- Update the admin record with a placeholder email (admin can change later)
UPDATE public.admins SET email = '' WHERE username = 'oduorongo';
