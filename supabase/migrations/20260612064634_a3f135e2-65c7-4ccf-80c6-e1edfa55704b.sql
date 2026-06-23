-- Allow the public (anon) to read ONLY non-sensitive tenant location info so the
-- public championship filters (county / level) can resolve a championship's county
-- from its owning tenant. Sensitive columns (email, phone, contact_name, user_id)
-- remain hidden from anon via column-level grants.

-- Remove any broad table-level SELECT grant for anon, then grant only safe columns.
REVOKE SELECT ON public.tenants FROM anon;
GRANT SELECT (id, county, subcounty, organization_name) ON public.tenants TO anon;

-- Add a public read policy. Column-level grants above ensure anon can only ever
-- read the four safe columns even though the row filter is permissive.
DROP POLICY IF EXISTS "Public can view tenant location info" ON public.tenants;
CREATE POLICY "Public can view tenant location info"
  ON public.tenants
  FOR SELECT
  TO anon
  USING (true);