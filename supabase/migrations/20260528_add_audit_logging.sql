-- Add audit logging table and conservative trigger function
-- This migration is additive and safe to run on production.
BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor UUID,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  changes JSONB,
  ip INET,
  user_agent TEXT
);

-- Trigger function that inserts a compact JSONB of the changed row
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_actor UUID;
  v_changes JSONB;
BEGIN
  -- Try to pick up actor from JWT claims if available; fall back to NULL
  BEGIN
    v_actor := current_setting('jwt.claims.sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_actor := NULL;
  END;

  IF (TG_OP = 'DELETE') THEN
    v_changes := to_jsonb(OLD) - 'password' - 'ssn';
    INSERT INTO public.audit_logs(actor, action, table_name, record_id, changes, ip, user_agent)
    VALUES (v_actor, TG_OP, TG_TABLE_NAME, COALESCE(OLD.id::text, OLD.user_id::text, NULL), v_changes, inet_client_addr(), current_setting('request.headers.user_agent', true));
    RETURN OLD;
  ELSE
    v_changes := to_jsonb(NEW) - 'password' - 'ssn';
    INSERT INTO public.audit_logs(actor, action, table_name, record_id, changes, ip, user_agent)
    VALUES (v_actor, TG_OP, TG_TABLE_NAME, COALESCE(NEW.id::text, NEW.user_id::text, NULL), v_changes, inet_client_addr(), current_setting('request.headers.user_agent', true));
    RETURN NEW;
  END IF;
END;
$$;

-- Create triggers for a conservative set of tables that represent high-value actions.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_participants') THEN
    CREATE TRIGGER audit_participants
    AFTER INSERT OR UPDATE OR DELETE ON public.participants
    FOR EACH ROW EXECUTE FUNCTION public.log_audit();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_championships') THEN
    CREATE TRIGGER audit_championships
    AFTER INSERT OR UPDATE OR DELETE ON public.championships
    FOR EACH ROW EXECUTE FUNCTION public.log_audit();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_tenants') THEN
    CREATE TRIGGER audit_tenants
    AFTER INSERT OR UPDATE OR DELETE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.log_audit();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_payments') THEN
    CREATE TRIGGER audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON public.team_fee_payments
    FOR EACH ROW EXECUTE FUNCTION public.log_audit();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_notifications') THEN
    CREATE TRIGGER audit_notifications
    AFTER INSERT OR UPDATE OR DELETE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.log_audit();
  END IF;
END;
$$;

COMMIT;
