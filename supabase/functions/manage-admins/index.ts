// Super admin operations:
//   - bootstrap_super_admin: idempotent. Updates the existing admin email to
//     oduorongo@gmail.com (password kept), assigns 'super_admin' role.
//   - create_level_admin: super-admin-only. Creates a new auth user, creates a
//     championship, and links the user_role row to that championship.
//   - list_admins: super-admin-only. Returns all admins (super + level).
//   - delete_level_admin: super-admin-only. Deletes the auth user + role.
//
// All admin-side reads/writes for level admins go through admin-write, which
// enforces the championship_id filter.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRate, extractIp } from "../_shared/rateLimit.ts";

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

const SUPER_ADMIN_EMAIL = "oduorongo@gmail.com";
const SUPER_ADMIN_PASSWORD = "oduor123";
const LEGACY_EMAIL = "oduorongo@zaroda.local";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const ip = extractIp(req);
  const dbIp = await checkRateDB(supabaseUrl!, serviceKey!, `ip:${ip}`, 60, 60);
  if (!dbIp.allowed) return jsonResponse({ error: 'Too many requests (ip)' }, 429);

  let payload: { action?: string; [key: string]: unknown };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const action = payload.action;

  // ---------- Public action: bootstrap_super_admin (idempotent, no auth) ----------
  if (action === "bootstrap_super_admin") {
    return await bootstrapSuperAdmin(adminClient);
  }

  // ---------- All other actions require super_admin auth ----------
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
    authHeader.replace("Bearer ", ""),
  );
  if (claimsError || !claimsData?.claims?.sub) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  const callerId = claimsData.claims.sub as string;

  const { data: superRole } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .eq("role", "super_admin")
    .maybeSingle();

  if (!superRole) {
    return jsonResponse({ error: "Forbidden: super_admin only" }, 403);
  }

  if (action === "create_level_admin") {
    return await createLevelAdmin(adminClient, callerId, payload);
  }
  if (action === "list_admins") {
    return await listAdmins(adminClient);
  }
  if (action === "delete_level_admin") {
    return await deleteLevelAdmin(adminClient, payload);
  }

  return jsonResponse({ error: `Unknown action: ${action}` }, 400);
});

async function bootstrapSuperAdmin(adminClient: ReturnType<typeof createClient>) {
  // 1. Find any existing user matching either the new or legacy email
  const { data: list, error: listError } = await adminClient.auth.admin.listUsers({
    perPage: 200,
  });
  if (listError) {
    console.error("listUsers failed", listError);
    return jsonResponse({ error: "Failed to list users" }, 500);
  }

  const newEmailUser = list.users.find(
    (u) => u.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase(),
  );
  const legacyUser = list.users.find(
    (u) => u.email?.toLowerCase() === LEGACY_EMAIL.toLowerCase(),
  );

  let userId: string;

  if (newEmailUser) {
    userId = newEmailUser.id;
    // Make sure password works
    await adminClient.auth.admin.updateUserById(userId, {
      password: SUPER_ADMIN_PASSWORD,
      email_confirm: true,
    });
  } else if (legacyUser) {
    userId = legacyUser.id;
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (updateError) {
      console.error("Failed to update legacy admin", updateError);
      return jsonResponse({ error: updateError.message }, 500);
    }
  } else {
    // Create from scratch
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (createError || !created.user) {
      console.error("Failed to create super admin", createError);
      return jsonResponse({ error: createError?.message || "Create failed" }, 500);
    }
    userId = created.user.id;
  }

  // 2. Ensure super_admin role row exists
  const { data: existingRole } = await adminClient
    .from("user_roles")
    .select("id, role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();

  if (!existingRole) {
    await adminClient.from("user_roles").insert({
      user_id: userId,
      role: "super_admin",
      championship_id: null,
    });
  }

  // 3. Remove any leftover plain 'admin' role on this user (super admin doesn't need it)
  await adminClient
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", "admin");

  return jsonResponse({
    success: true,
    user_id: userId,
    email: SUPER_ADMIN_EMAIL,
  });
}

async function createLevelAdmin(
  adminClient: ReturnType<typeof createClient>,
  superAdminId: string,
  payload: any,
) {
  const {
    email,
    password,
    championship,
  }: {
    email?: string;
    password?: string;
    championship?: {
      name: string;
      level: string;
      school_level: string;
      location?: string;
      start_date?: string;
      end_date?: string;
      description?: string;
    };
  } = payload;

  if (!email || !password || !championship?.name || !championship?.level) {
    return jsonResponse(
      { error: "email, password, championship.name and championship.level are required" },
      400,
    );
  }

  // 1. Create the championship first (so we have its id)
  const { data: champ, error: champError } = await adminClient
    .from("championships")
    .insert({
      name: championship.name,
      level: championship.level,
      school_level: championship.school_level || "primary",
      location: championship.location || null,
      start_date: championship.start_date || null,
      end_date: championship.end_date || null,
      description: championship.description || null,
      created_by: superAdminId,
    })
    .select()
    .single();

  if (champError || !champ) {
    return jsonResponse({ error: champError?.message || "Failed to create championship" }, 500);
  }

  // 2. Create the auth user
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { championship_id: champ.id, championship_name: championship.name },
  });

  if (createError || !created.user) {
    // Roll back the championship insert
    await adminClient.from("championships").delete().eq("id", champ.id);
    return jsonResponse({ error: createError?.message || "Failed to create user" }, 400);
  }

  // 3. Assign 'admin' role scoped to this championship
  const { error: roleError } = await adminClient.from("user_roles").insert({
    user_id: created.user.id,
    role: "admin",
    championship_id: champ.id,
  });

  if (roleError) {
    // Roll back both
    await adminClient.auth.admin.deleteUser(created.user.id);
    await adminClient.from("championships").delete().eq("id", champ.id);
    return jsonResponse({ error: roleError.message }, 500);
  }

  // 4. Drop a notification for the super admin
  await adminClient.from("notifications").insert({
    user_id: superAdminId,
    title: "Level admin created",
    body: `${email} can now manage "${champ.name}".`,
    type: "success",
  });

  return jsonResponse({
    success: true,
    user_id: created.user.id,
    email,
    championship: champ,
    credentials: { email, password },
  });
}

async function listAdmins(adminClient: ReturnType<typeof createClient>) {
  const { data: roles, error: rolesError } = await adminClient
    .from("user_roles")
    .select("id, user_id, role, championship_id, created_at");
  if (rolesError) return jsonResponse({ error: rolesError.message }, 500);

  const { data: list } = await adminClient.auth.admin.listUsers({ perPage: 500 });
  const usersById = new Map(list.users.map((u) => [u.id, u]));

  const champIds = Array.from(
    new Set((roles ?? []).map((r) => r.championship_id).filter(Boolean) as string[]),
  );
  let champs: Array<{ id: string; name: string }> = [];
  if (champIds.length) {
    const { data: c } = await adminClient
      .from("championships")
      .select("id, name")
      .in("id", champIds);
    champs = c || [];
  }
  const champById = new Map(champs.map((c) => [c.id, c.name]));

  const admins = (roles ?? []).map((r) => {
    const u = usersById.get(r.user_id);
    return {
      role_id: r.id,
      user_id: r.user_id,
      email: u?.email ?? "(deleted user)",
      role: r.role,
      championship_id: r.championship_id,
      championship_name: r.championship_id ? champById.get(r.championship_id) : null,
      last_sign_in_at: u?.last_sign_in_at,
      created_at: r.created_at,
    };
  });

  return jsonResponse({ admins });
}

async function deleteLevelAdmin(
  adminClient: ReturnType<typeof createClient>,
  payload: any,
) {
  const userId: string | undefined = payload.user_id;
  if (!userId) return jsonResponse({ error: "user_id is required" }, 400);

  // Don't allow deleting a super_admin via this action
  const { data: roles } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (roles?.some((r) => r.role === "super_admin")) {
    return jsonResponse({ error: "Cannot delete a super admin" }, 400);
  }

  await adminClient.from("user_roles").delete().eq("user_id", userId);
  const { error: delError } = await adminClient.auth.admin.deleteUser(userId);
  if (delError) return jsonResponse({ error: delError.message }, 500);

  return jsonResponse({ success: true });
}
