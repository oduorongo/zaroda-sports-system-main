// Client wrapper for the manage-admins edge function (super-admin only).

import { authClient } from "@/integrations/admin/authClient";

export interface CreateLevelAdminPayload {
  email: string;
  password: string;
  championship: {
    name: string;
    level: string;
    school_level: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
  };
}

export interface AdminListItem {
  role_id: string;
  user_id: string;
  email: string;
  role: "super_admin" | "admin";
  championship_id: string | null;
  championship_name: string | null;
  last_sign_in_at: string | null;
  created_at: string;
}

async function call<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await authClient.functions.invoke<any>("manage-admins", {
    body: { action, ...body },
  });
  if (error) throw new Error(error.message || "Request failed");
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const listAdmins = () =>
  call<{ admins: AdminListItem[] }>("list_admins").then((r) => r.admins);

export const createLevelAdmin = (payload: CreateLevelAdminPayload) =>
  call<{
    success: boolean;
    user_id: string;
    email: string;
    championship: { id: string; name: string };
    credentials: { email: string; password: string };
  }>("create_level_admin", payload as unknown as Record<string, unknown>);

export const deleteLevelAdmin = (userId: string) =>
  call<{ success: boolean }>("delete_level_admin", { user_id: userId });
