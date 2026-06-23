// Thin client wrapper around the `admin-write` edge function.
// Every admin mutation in the app goes through this so RLS policies on the
// underlying tables can stay locked down to service_role only.

import { authClient } from "@/integrations/admin/authClient";

type AllowedTable =
  | "championships"
  | "games"
  | "schools"
  | "participants"
  | "heats"
  | "heat_participants"
  | "match_pools"
  | "circulars"
  | "tournament_teams"
  | "championship_fees"
  | "team_fee_payments"
  | "tenants"
  | "championship_subscriptions"
  | "admin_messages";

type Op = "insert" | "update" | "delete" | "upsert";

interface AdminWriteOptions {
  values?: Record<string, unknown> | Array<Record<string, unknown>>;
  match?: Record<string, unknown>;
  in?: Record<string, unknown[]>;
  returning?: boolean;
  single?: boolean;
}

export async function adminWrite<T = unknown>(
  table: AllowedTable,
  op: Op,
  options: AdminWriteOptions,
): Promise<T> {
  const { data, error } = await authClient.functions.invoke<{ data: T; error?: string }>(
    "admin-write",
    {
      body: { table, op, ...options },
    },
  );

  if (error) {
    // supabase.functions.invoke wraps non-2xx into FunctionsHttpError
    throw new Error(error.message || "Admin write failed");
  }

  if (data && typeof data === "object" && "error" in (data as any) && (data as any).error) {
    throw new Error((data as any).error as string);
  }

  return (data as any)?.data as T;
}
