-- Migration: Audit logging table, trigger function, and attach triggers to app tables
-- Date: 2026-05-20

-- 1) Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation text NOT NULL,
  record_id UUID NULL,
  changed_by UUID NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  old_data jsonb NULL,
  new_data jsonb NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON public.audit_logs(changed_by);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- 2) Restrict access to audit logs to super_admins only
DROP POLICY IF EXISTS "audit_super_admin_only" ON public.audit_logs;
CREATE POLICY "audit_super_admin_only" ON public.audit_logs FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

-- 3) Create generic audit trigger function (security definer)
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec_id UUID := NULL;
BEGIN
  -- try to extract `id` from NEW/OLD if present
  BEGIN
    IF TG_OP = 'DELETE' THEN
      rec_id := OLD.id;
    ELSE
      rec_id := NEW.id;
    END IF;
  EXCEPTION WHEN others THEN
    rec_id := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs(table_name, operation, record_id, changed_by, new_data)
    VALUES (TG_TABLE_NAME, TG_OP, rec_id, auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs(table_name, operation, record_id, changed_by, old_data, new_data)
    VALUES (TG_TABLE_NAME, TG_OP, rec_id, auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs(table_name, operation, record_id, changed_by, old_data)
    VALUES (TG_TABLE_NAME, TG_OP, rec_id, auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 4) Attach triggers to a list of app tables only if they exist
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'participants','games','heats','heat_participants','match_pools','tournament_teams',
    'payment_transactions','team_fee_payments','championship_fees','admin_messages','notifications',
    'contact_messages','schools','championships','circulars','tenants','subscription_plans','championship_subscriptions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS audit_%s_trigger ON public.%s;', tbl, tbl);
      EXECUTE format('CREATE TRIGGER audit_%s_trigger AFTER INSERT OR UPDATE OR DELETE ON public.%s FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();', tbl, tbl);
    END IF;
  END LOOP;
END$$;

-- 5) Notes: Ensure the audit_logs table is only queried by super_admins or via a secure server-side role.
-- The trigger function uses `auth.uid()`; when invoked by Edge Functions/service_role, consider inserting an explicit `changed_by` value in server-side code for accurate attribution.

-- End of migration
