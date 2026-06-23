-- 1. Add 'ward' to the competition_level enum (before subcounty conceptually; enum order is cosmetic)
ALTER TYPE competition_level ADD VALUE IF NOT EXISTS 'ward';

-- 2. Trigger: always re-derive the championship name suffix from its level
CREATE OR REPLACE FUNCTION public.enforce_championship_name_level()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_name text;
  level_label text;
BEGIN
  -- Strip any existing " - <Level>" suffix (case-insensitive) for all known labels
  base_name := regexp_replace(
    NEW.name,
    '\s*[-–—]\s*(Base|Ward|Zone|Sub-County|County|Region|National)\s*$',
    '',
    'i'
  );
  base_name := trim(base_name);

  level_label := CASE NEW.level::text
    WHEN 'base' THEN 'Base'
    WHEN 'ward' THEN 'Ward'
    WHEN 'zone' THEN 'Zone'
    WHEN 'subcounty' THEN 'Sub-County'
    WHEN 'county' THEN 'County'
    WHEN 'region' THEN 'Region'
    WHEN 'national' THEN 'National'
    ELSE NEW.level::text
  END;

  IF base_name = '' THEN
    NEW.name := level_label;
  ELSE
    NEW.name := base_name || ' - ' || level_label;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_championship_name_level ON public.championships;
CREATE TRIGGER trg_enforce_championship_name_level
  BEFORE INSERT OR UPDATE OF name, level ON public.championships
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_championship_name_level();