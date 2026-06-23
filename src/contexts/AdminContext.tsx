import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authClient } from "@/integrations/admin/authClient";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface AdminContextType {
  isAdmin: boolean;          // true for any admin (super or level)
  isSuperAdmin: boolean;
  isLevelAdmin: boolean;
  championshipId: string | null; // assigned championship for level admins
  tenantId: string | null;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLevelAdmin, setIsLevelAdmin] = useState(false);
  const [championshipId, setChampionshipId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAdminRole = async (uid: string | null) => {
      if (!uid) {
        if (!cancelled) {
          setIsSuperAdmin(false);
          setIsLevelAdmin(false);
          setChampionshipId(null);
          setTenantId(null);
        }
        return;
      }
      // Use authClient (it carries the user JWT) so RLS sees the user.
      const { data, error } = await authClient
        .from("user_roles")
        .select("role, championship_id")
        .eq("user_id", uid);
      if (cancelled) return;
      if (error || !data) {
        setIsSuperAdmin(false);
        setIsLevelAdmin(false);
        setChampionshipId(null);
        setTenantId(null);
        return;
      }
      const superRow = data.find((r: any) => r.role === "super_admin");
      const levelRow = data.find((r: any) => r.role === "admin");
      const { data: tenantRow } = await authClient
        .from("tenants")
        .select("id")
        .eq("user_id", uid)
        .maybeSingle();
      if (cancelled) return;
      setIsSuperAdmin(!!superRow);
      setTenantId((tenantRow?.id as string) ?? null);

      if (tenantRow?.id) {
        const [{ data: tenantChampionships }, { data: hasActiveAccess }] = await Promise.all([
          authClient
            .from("championships")
            .select("id, level")
            .eq("tenant_id", tenantRow.id),
          authClient.rpc("tenant_has_active_access", { _user_id: uid }),
        ]);
        if (cancelled) return;

        const hasBaseChampionship = (tenantChampionships ?? []).some(
          (championship: any) => championship.level === "base",
        );
        const hasTenantAccess = !!hasActiveAccess || hasBaseChampionship;

        setIsLevelAdmin(!!levelRow?.championship_id || hasTenantAccess);
        setChampionshipId((levelRow?.championship_id as string) ?? null);
        return;
      }

      if (levelRow?.championship_id) {
        setIsLevelAdmin(true);
        setChampionshipId(levelRow.championship_id as string);
        return;
      }

      if (tenantRow?.id) {
        const { data: tenantChampionship } = await authClient
          .from("championships")
          .select("id")
          .eq("tenant_id", tenantRow.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        setIsLevelAdmin(!!tenantChampionship);
        setChampionshipId((tenantChampionship?.id as string) ?? null);
        return;
      }

      setIsLevelAdmin(false);
      setChampionshipId(null);
    };

    // 1) Set up the auth state listener FIRST (synchronous state updates only)
    const { data: subscription } = authClient.auth.onAuthStateChange((_event, newSession) => {
      setIsLoading(true);
      setSession(newSession);
      setUser(newSession?.user ?? null);
      // Defer the role check to avoid deadlocks inside the listener
      setTimeout(() => {
        checkAdminRole(newSession?.user?.id ?? null).finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      }, 0);
    });

    // 2) THEN check for an existing session
    authClient.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(true);
      checkAdminRole(currentSession?.user?.id ?? null).finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await authClient.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      return { success: false, error: "Invalid email or password" };
    }
    return { success: true };
  };

  const logout = async () => {
    await authClient.auth.signOut();
    setIsSuperAdmin(false);
    setIsLevelAdmin(false);
    setChampionshipId(null);
    setTenantId(null);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user?.email) {
      return { success: false, error: "Not signed in" };
    }
    // Re-verify the current password by attempting a fresh sign-in.
    const { error: verifyError } = await authClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) {
      return { success: false, error: "Invalid current password" };
    }
    const { error } = await authClient.auth.updateUser({ password: newPassword });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  const isAdmin = isSuperAdmin || isLevelAdmin;

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        isSuperAdmin,
        isLevelAdmin,
        championshipId,
        tenantId,
        isLoading,
        user,
        session,
        login,
        logout,
        changePassword,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
};
