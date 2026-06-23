-- Extend audit triggers to a few more high-value tables and perform a safe backfill.
BEGIN;

-- Add triggers for additional tables if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_users') THEN
    CREATE TRIGGER audit_users
    AFTER INSERT OR UPDATE OR DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.log_audit();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_user_roles') THEN
    CREATE TRIGGER audit_user_roles
    AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.log_audit();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_championship_subscriptions') THEN
    CREATE TRIGGER audit_championship_subscriptions
    AFTER INSERT OR UPDATE OR DELETE ON public.championship_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.log_audit();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_games') THEN
    CREATE TRIGGER audit_games
    AFTER INSERT OR UPDATE OR DELETE ON public.games
    FOR EACH ROW EXECUTE FUNCTION public.log_audit();
  END IF;
END;
$$;

-- Conservative backfill: snapshot current rows into audit_logs with action 'BACKFILL'.
-- This is limited to a safe page size to avoid long transactions.

INSERT INTO public.audit_logs (event_time, actor, action, table_name, record_id, changes)
SELECT now(), NULL, 'BACKFILL', 'participants', id::text, to_jsonb(t) - 'password' - 'ssn'
FROM public.participants t
LIMIT 1000;

INSERT INTO public.audit_logs (event_time, actor, action, table_name, record_id, changes)
SELECT now(), NULL, 'BACKFILL', 'championships', id::text, to_jsonb(t)
FROM public.championships t
LIMIT 1000;

INSERT INTO public.audit_logs (event_time, actor, action, table_name, record_id, changes)
SELECT now(), NULL, 'BACKFILL', 'tenants', id::text, to_jsonb(t) - 'password'
FROM public.tenants t
LIMIT 1000;

-- Note: If there are more rows than 1000, re-run this migration in parts or use an offline backfill process.

COMMIT;
