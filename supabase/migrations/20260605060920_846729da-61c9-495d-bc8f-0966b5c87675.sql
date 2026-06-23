-- Add 'base' to the school_level enum (used for free base-level championships)
ALTER TYPE public.school_level ADD VALUE IF NOT EXISTS 'base';

-- Public-safe participants view (used by unauthenticated visitors on results pages)
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
