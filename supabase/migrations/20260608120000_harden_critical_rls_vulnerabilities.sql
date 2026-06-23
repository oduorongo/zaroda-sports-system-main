-- Critical security hardening for role management, championship quotas,
-- contact message abuse, payment inserts, and circular uploads.

-- 1) Harden role lookup helpers so they cannot be abused through NULL UIDs or
--    by relying on invoker search paths.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN FALSE
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN FALSE
    ELSE EXISTS (
      SELECT 1
      FROM public.officials
      WHERE user_id = auth.uid()
        AND role = _role
    )
  END;
$$;

-- 2) Replace the broad user_roles policy with explicit INSERT / UPDATE / DELETE
--    policies and keep reads scoped to the current user's own role.
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admin manages all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Prevent self role escalation" ON public.user_roles;

CREATE POLICY "Users view own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only a super admin may create role assignments.
CREATE POLICY "Super admin inserts roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

-- Only a super admin may change role assignments, and never for their own row.
CREATE POLICY "Prevent self role escalation"
ON public.user_roles FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  AND user_id <> auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  AND user_id <> auth.uid()
);

-- Only a super admin may remove role assignments.
CREATE POLICY "Super admin deletes roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

-- 3) Lock the tenant row during championship inserts and enforce quota in a
--    trigger so concurrent inserts cannot race past the policy check.
CREATE OR REPLACE FUNCTION public.check_championship_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  tenant_lock_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    SELECT id
    INTO tenant_lock_id
    FROM public.tenants
    WHERE id = NEW.tenant_id
      AND user_id = auth.uid()
    FOR UPDATE;

    IF tenant_lock_id IS NULL THEN
      RAISE EXCEPTION 'You do not have permission to create championships for this tenant';
    END IF;

    IF NEW.level::text <> 'base'
       AND public.tenant_championship_quota_remaining(auth.uid()) <= 0 THEN
      RAISE EXCEPTION 'Championship quota exceeded for your plan';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_championship_quota ON public.championships;
CREATE TRIGGER enforce_championship_quota
BEFORE INSERT ON public.championships
FOR EACH ROW
EXECUTE FUNCTION public.check_championship_quota();

-- 4) Rate-limit public contact message inserts using a trigger so the limit is
--    enforced even when requests arrive concurrently.
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS contact_messages_email_created_at_idx
  ON public.contact_messages (lower(email), created_at DESC);

CREATE OR REPLACE FUNCTION public.check_contact_message_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  recent_message_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(lower(NEW.email)), 0);

  SELECT COUNT(*)
  INTO recent_message_count
  FROM public.contact_messages
  WHERE lower(email) = lower(NEW.email)
    AND created_at > now() - interval '1 hour';

  IF recent_message_count >= 5 THEN
    RAISE EXCEPTION 'Contact message rate limit exceeded for this email';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_contact_message_rate_limit ON public.contact_messages;
CREATE TRIGGER enforce_contact_message_rate_limit
BEFORE INSERT ON public.contact_messages
FOR EACH ROW
EXECUTE FUNCTION public.check_contact_message_rate_limit();

DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "contact_messages_insert_authenticated" ON public.contact_messages;
CREATE POLICY "Rate limited contact insert"
ON public.contact_messages FOR INSERT
TO public
WITH CHECK (true);

-- 5) Allow tenants to create their own payment transaction records so failed
--    payment flows can still leave an auditable trail.
DROP POLICY IF EXISTS "Tenants insert own transactions" ON public.payment_transactions;
CREATE POLICY "Tenants insert own transactions"
ON public.payment_transactions FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT id
    FROM public.tenants
    WHERE user_id = auth.uid()
  )
);

-- 6) Restrict circular file updates to the file owner and bucket admins.
DROP POLICY IF EXISTS "Admins can update circulars" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update own circulars" ON storage.objects;
CREATE POLICY "Admins can update own circulars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'circulars'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  AND owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'circulars'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  AND owner = auth.uid()
);