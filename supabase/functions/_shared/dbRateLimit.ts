import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export async function checkRateDB(supabaseUrl: string, serviceKey: string, key: string, limit = 60, windowSec = 60) {
  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  try {
    const { data, error } = await adminClient.rpc('increment_rate', { p_key: key, p_window_seconds: windowSec, p_limit: limit });
    if (error) return { allowed: false, error: error.message };
    // rpc returns an array of rows
    const row = Array.isArray(data) ? data[0] : data;
    return { allowed: row?.allowed ?? false, remaining: row?.remaining ?? 0, resetAt: row?.reset_at ?? null };
  } catch (e) {
    return { allowed: true, error: String(e) };
  }
}
