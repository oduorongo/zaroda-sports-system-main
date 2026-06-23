-- Create table for function rate limits and an atomic increment function
BEGIN;

CREATE TABLE IF NOT EXISTS public.function_rate_limits (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ,
  PRIMARY KEY (key, window_start)
);

CREATE OR REPLACE FUNCTION public.increment_rate(p_key TEXT, p_window_seconds INTEGER, p_limit INTEGER)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, remaining INTEGER, reset_at TIMESTAMPTZ) AS $$
DECLARE
  v_window_start TIMESTAMPTZ := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds)::timestamptz;
  v_reset timestamptz := v_window_start + (p_window_seconds || ' seconds')::interval;
  v_count INTEGER;
BEGIN
  LOOP
    -- Try to insert new row for this window
    INSERT INTO public.function_rate_limits(key, window_start, count, reset_at)
    VALUES (p_key, v_window_start, 1, v_reset)
    ON CONFLICT (key, window_start) DO UPDATE SET count = public.function_rate_limits.count + 1
    RETURNING count, reset_at INTO v_count, v_reset;

    EXIT;
  END LOOP;

  allowed := v_count <= p_limit;
  current_count := v_count;
  remaining := greatest(p_limit - v_count, 0);
  reset_at := v_reset;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql VOLATILE;

COMMIT;
