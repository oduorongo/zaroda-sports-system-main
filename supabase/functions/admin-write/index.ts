// Generic admin-write edge function.
// Verifies the caller's JWT and role, then enforces championship-scoped access:
//   - super_admin: can write anything on whitelisted tables.
//   - admin (level admin): can ONLY write rows tied to their championship_id.
//     For tables that have championship_id directly (championships, games),
//     we check it on the row. For tables tied via game_id (participants,
//     heats, heat_participants, match_pools), we resolve game.championship_id.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { extractIp } from "../_shared/rateLimit.ts";
import { checkRateDB } from "../_shared/dbRateLimit.ts";
import { AdminWriteSchema } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_TABLES = new Set([
  "championships",
  "games",
  "schools",
  "participants",
  "heats",
  "heat_participants",
  "match_pools",
  "circulars",
  "tournament_teams",
  "championship_fees",
  "team_fee_payments",
  "tenants",
  "championship_subscriptions",
  "admin_messages",
]);

const SUPER_ADMIN_ONLY_TABLES = new Set([
  "tenants",
  "championship_subscriptions",
]);

const ALLOWED_OPS = new Set(["insert", "update", "delete", "upsert"]);

interface AdminWriteRequest {
  table: string;
  op: "insert" | "update" | "delete" | "upsert";
  values?: Record<string, unknown> | Array<Record<string, unknown>>;
  match?: Record<string, unknown>;
  in?: Record<string, unknown[]>;
  returning?: boolean;
  single?: boolean;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // Rate-limit by IP (DB-backed)
  const ip = extractIp(req);
  const dbIp = await checkRateDB(supabaseUrl!, serviceKey!, `ip:${ip}`, 300, 60);
  if (!dbIp.allowed) return jsonResponse({ error: 'Too many requests (ip)' }, 429);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
    authHeader.replace("Bearer ", ""),
  );
  if (claimsError || !claimsData?.claims?.sub) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  const userId = claimsData.claims.sub as string;

  const dbUser = await checkRateDB(supabaseUrl!, serviceKey!, `user:${userId}`, 120, 60);
  if (!dbUser.allowed) return jsonResponse({ error: 'Too many requests (user)' }, 429);

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Look up role(s) for this user
  const { data: roles, error: roleError } = await adminClient
    .from("user_roles")
    .select("role, championship_id")
    .eq("user_id", userId);

  if (roleError) return jsonResponse({ error: "Authorization check failed" }, 500);
  if (!roles || roles.length === 0) {
    return jsonResponse({ error: "Forbidden: no role assigned" }, 403);
  }

  const isSuper = roles.some((r) => r.role === "super_admin");
  const levelRow = roles.find((r) => r.role === "admin");
  const scopedChampionshipId = levelRow?.championship_id ?? null;

  if (!isSuper && !levelRow) {
    return jsonResponse({ error: "Forbidden: admin role required" }, 403);
  }
  if (!isSuper && !scopedChampionshipId) {
    return jsonResponse({ error: "Forbidden: no championship assigned" }, 403);
  }

  // Parse body
  let payload: AdminWriteRequest;
  try {
    const raw = await req.json();
    const parsed = AdminWriteSchema.safeParse(raw);
    if (!parsed.success) return jsonResponse({ error: parsed.error.issues[0]?.message || 'Invalid payload' }, 400);
    payload = parsed.data as AdminWriteRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  const { table, op } = payload;
  if (!table || !ALLOWED_TABLES.has(table)) {
    return jsonResponse({ error: `Table not allowed: ${table}` }, 400);
  }
  if (!op || !ALLOWED_OPS.has(op)) {
    return jsonResponse({ error: `Op not allowed: ${op}` }, 400);
  }

  // Schools and circulars are super-admin-only (global resources)
  if (!isSuper && (table === "schools" || table === "circulars" || table === "championships" || SUPER_ADMIN_ONLY_TABLES.has(table))) {
    return jsonResponse(
      { error: `Forbidden: only super_admin can modify ${table}` },
      403,
    );
  }

  // Skip championship-scope check for tables that aren't game-scoped
  const SKIP_SCOPE_TABLES = new Set([
    "tournament_teams", "championship_fees", "team_fee_payments", "admin_messages",
  ]);

  // Enforce championship scope for level admins (only on game-scoped tables)
  if (!isSuper && !SKIP_SCOPE_TABLES.has(table)) {
    const scopeError = await enforceChampionshipScope(
      adminClient,
      table,
      op,
      payload,
      scopedChampionshipId!,
    );
    if (scopeError) return jsonResponse({ error: scopeError }, 403);
  }

  // Execute
  try {
    let query: any;
    if (op === "insert") {
      if (!payload.values) return jsonResponse({ error: "Missing values for insert" }, 400);
      query = adminClient.from(table).insert(payload.values as any);
      if (payload.returning !== false) query = query.select();
      if (payload.single) query = query.single();
    } else if (op === "upsert") {
      if (!payload.values) return jsonResponse({ error: "Missing values for upsert" }, 400);
      query = adminClient.from(table).upsert(payload.values as any);
      if (payload.returning !== false) query = query.select();
      if (payload.single) query = query.single();
    } else if (op === "update") {
      if (!payload.values) return jsonResponse({ error: "Missing values for update" }, 400);
      query = adminClient.from(table).update(payload.values as any);
      query = applyFilters(query, payload);
      if (payload.returning !== false) query = query.select();
      if (payload.single) query = query.single();
    } else if (op === "delete") {
      query = adminClient.from(table).delete();
      query = applyFilters(query, payload);
      if (payload.returning) query = query.select();
    }

    const { data, error } = await query;
    if (error) return jsonResponse({ error: error.message, code: error.code }, 400);
    return jsonResponse({ data });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Operation failed" }, 500);
  }
});

function applyFilters(query: any, payload: AdminWriteRequest) {
  if (payload.match && Object.keys(payload.match).length > 0) {
    for (const [col, val] of Object.entries(payload.match)) query = query.eq(col, val);
  }
  if (payload.in) {
    for (const [col, vals] of Object.entries(payload.in)) query = query.in(col, vals);
  }
  if (!payload.match && !payload.in) {
    throw new Error("update/delete requires match or in filter");
  }
  return query;
}

// Returns null if access is allowed, otherwise an error message string
async function enforceChampionshipScope(
  adminClient: ReturnType<typeof createClient>,
  table: string,
  op: string,
  payload: AdminWriteRequest,
  championshipId: string,
): Promise<string | null> {
  // Helper: pull a single value from payload.values (handles batch arrays)
  const getValue = (key: string): unknown => {
    if (!payload.values) return undefined;
    if (Array.isArray(payload.values)) {
      // for batch, every row must match
      return payload.values.map((r: any) => r[key]);
    }
    return (payload.values as any)[key];
  };

  // games table: champion_id is directly on the row
  if (table === "games") {
    if (op === "insert" || op === "upsert") {
      const v = getValue("championship_id");
      if (Array.isArray(v)) {
        if (v.some((x) => x !== championshipId)) {
          return "Cannot create games outside your championship";
        }
      } else if (v !== championshipId) {
        return "Cannot create games outside your championship";
      }
    }
    if (op === "update" || op === "delete") {
      // Verify the targeted game belongs to this championship
      const ids = collectIds(payload, "id");
      if (!ids.length) return "Missing id filter";
      const { data, error } = await adminClient
        .from("games")
        .select("id, championship_id")
        .in("id", ids);
      if (error) return "Failed to verify scope";
      if (data?.some((g: any) => g.championship_id !== championshipId)) {
        return "Game outside your championship";
      }
    }
    return null;
  }

  // participants / heats / match_pools: scoped via game_id
  if (table === "participants" || table === "heats" || table === "match_pools") {
    if (op === "insert" || op === "upsert") {
      const v = getValue("game_id");
      const gameIds = Array.isArray(v) ? v : [v];
      if (!(await allGamesInChampionship(adminClient, gameIds as string[], championshipId))) {
        return "Game outside your championship";
      }
    }
    if (op === "update" || op === "delete") {
      const ids = collectIds(payload, "id");
      const gameIdFilter = collectIds(payload, "game_id");
      if (gameIdFilter.length) {
        if (!(await allGamesInChampionship(adminClient, gameIdFilter, championshipId))) {
          return "Game outside your championship";
        }
      } else if (ids.length) {
        const { data } = await adminClient.from(table).select("game_id").in("id", ids);
        const gameIds = (data ?? []).map((r: any) => r.game_id).filter(Boolean);
        if (!(await allGamesInChampionship(adminClient, gameIds, championshipId))) {
          return "Row outside your championship";
        }
      } else {
        return "Missing id/game_id filter";
      }
    }
    return null;
  }

  // heat_participants: scoped via heat -> game -> championship
  if (table === "heat_participants") {
    let heatIds: string[] = [];
    if (op === "insert" || op === "upsert") {
      const v = getValue("heat_id");
      heatIds = Array.isArray(v) ? (v as string[]) : [v as string];
    } else {
      heatIds = collectIds(payload, "heat_id");
      if (!heatIds.length) {
        const ids = collectIds(payload, "id");
        if (!ids.length) return "Missing heat_id/id filter";
        const { data } = await adminClient
          .from("heat_participants")
          .select("heat_id")
          .in("id", ids);
        heatIds = (data ?? []).map((r: any) => r.heat_id);
      }
    }
    if (!heatIds.length) return "Missing heat_id";
    const { data: heats } = await adminClient
      .from("heats")
      .select("game_id")
      .in("id", heatIds);
    const gameIds = (heats ?? []).map((h: any) => h.game_id);
    if (!(await allGamesInChampionship(adminClient, gameIds, championshipId))) {
      return "Heat outside your championship";
    }
    return null;
  }

  return null;
}

function collectIds(payload: AdminWriteRequest, key: string): string[] {
  const out = new Set<string>();
  if (payload.match && payload.match[key]) out.add(payload.match[key] as string);
  if (payload.in && Array.isArray(payload.in[key])) {
    for (const v of payload.in[key] as string[]) out.add(v);
  }
  return Array.from(out);
}

async function allGamesInChampionship(
  adminClient: ReturnType<typeof createClient>,
  gameIds: string[],
  championshipId: string,
): Promise<boolean> {
  if (!gameIds.length) return false;
  const { data, error } = await adminClient
    .from("games")
    .select("id, championship_id")
    .in("id", gameIds);
  if (error) return false;
  if (!data || data.length !== new Set(gameIds).size) return false;
  return data.every((g: any) => g.championship_id === championshipId);
}
