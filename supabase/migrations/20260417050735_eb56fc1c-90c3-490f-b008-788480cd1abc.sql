-- 1) Remove the duplicate "Senior School" enum value (senior). 
-- Recreate enum without 'senior' since no rows currently use it.
ALTER TYPE public.school_level RENAME TO school_level_old;

CREATE TYPE public.school_level AS ENUM (
  'primary',
  'junior_secondary',
  'primary_junior',
  'senior_secondary',
  'tertiary',
  'open'
);

ALTER TABLE public.championships 
  ALTER COLUMN school_level DROP DEFAULT,
  ALTER COLUMN school_level TYPE public.school_level USING school_level::text::public.school_level,
  ALTER COLUMN school_level SET DEFAULT 'primary'::public.school_level;

ALTER TABLE public.games 
  ALTER COLUMN school_level DROP DEFAULT,
  ALTER COLUMN school_level TYPE public.school_level USING school_level::text::public.school_level,
  ALTER COLUMN school_level SET DEFAULT 'primary'::public.school_level;

DROP TYPE public.school_level_old;

-- 2) Tighten security: restrict write operations on data tables to service_role only.
--    Public can still SELECT, but writes from the anon client are blocked.
--    All admin writes must go through Edge Functions using SUPABASE_SERVICE_ROLE_KEY.
DROP POLICY IF EXISTS "Admins can manage championships" ON public.championships;
CREATE POLICY "Service role manages championships" ON public.championships
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage circulars" ON public.circulars;
CREATE POLICY "Service role manages circulars" ON public.circulars
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage games" ON public.games;
CREATE POLICY "Service role manages games" ON public.games
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage heat_participants" ON public.heat_participants;
CREATE POLICY "Service role manages heat_participants" ON public.heat_participants
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage heats" ON public.heats;
CREATE POLICY "Service role manages heats" ON public.heats
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage match_pools" ON public.match_pools;
CREATE POLICY "Service role manages match_pools" ON public.match_pools
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage participants" ON public.participants;
CREATE POLICY "Service role manages participants" ON public.participants
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage schools" ON public.schools;
CREATE POLICY "Service role manages schools" ON public.schools
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Restrict admins table reads: prevent leaking password_hash to anon.
DROP POLICY IF EXISTS "Anyone can check admin credentials" ON public.admins;
CREATE POLICY "Service role reads admins" ON public.admins
  FOR SELECT TO service_role USING (true);

-- Restrict contact_messages reads to service_role only (was 'public can SELECT')
DROP POLICY IF EXISTS "Admins can view contact messages" ON public.contact_messages;
CREATE POLICY "Service role reads contact_messages" ON public.contact_messages
  FOR SELECT TO service_role USING (true);
