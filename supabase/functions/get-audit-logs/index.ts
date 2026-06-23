import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { extractIp } from "../_shared/rateLimit.ts";
import { checkRateDB } from "../_shared/dbRateLimit.ts";
import { AuditQuerySchema } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) return jsonResponse({ error: "Server misconfigured" }, 500);

  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

  const token = authHeader.replace("Bearer ", "");
  const ip = extractIp(req);
  const dbIp = await checkRateDB(SUPABASE_URL!, SERVICE_KEY!, `ip:${ip}`, 60, 60);
  if (!dbIp.allowed) return jsonResponse({ error: 'Too many requests (ip)' }, 429);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });

  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims?.sub) return jsonResponse({ error: "Unauthorized" }, 401);
  const callerId = claimsData.claims.sub as string;

  const dbUser = await checkRateDB(SUPABASE_URL!, SERVICE_KEY!, `user:${callerId}`, 30, 60);
  if (!dbUser.allowed) return jsonResponse({ error: 'Too many requests (user)' }, 429);

  // Require super_admin role
  const { data: superRole } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (!superRole) return jsonResponse({ error: "Forbidden" }, 403);

  // Validate query payload
  const parsed = AuditQuerySchema.safeParse(payload);
  if (!parsed.success) return jsonResponse({ error: parsed.error.issues[0]?.message || 'Invalid query' }, 400);
  const { table_name: table, limit = 100, since, until } = parsed.data as any;
  const safeLimit = Math.min(limit || 100, 1000);
  const sinceIso = since ? new Date(since).toISOString() : undefined;
  const untilIso = until ? new Date(until).toISOString() : undefined;

  let q = adminClient.from("audit_logs").select("id,event_time,actor,action,table_name,record_id,changes").order("event_time", { ascending: false }).limit(safeLimit);
  if (table) q = q.eq("table_name", table);
  if (sinceIso) q = q.gte("event_time", sinceIso);
  if (untilIso) q = q.lte("event_time", untilIso);

  const { data, error } = await q;
  if (error) return jsonResponse({ error: error.message }, 500);

  return jsonResponse({ logs: data });
});
