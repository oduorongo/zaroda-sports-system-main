"use client";

import * as React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiGet, apiPatch } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

interface TenantRow {
  id: string;
  organizationName: string;
  email: string;
  accountType: string;
  county: string;
  createdAt: string;
  _count: { championships: number };
  subscriptions: Array<{ id: string; status: string; expiresAt: string | null; plan: { displayName: string; level: string } }>;
}

function TenantCard({ tenant }: { tenant: TenantRow }) {
  const queryClient = useQueryClient();

  const overrideMutation = useMutation({
    mutationFn: (vars: { subscriptionId: string; status: string }) =>
      apiPatch(`/api/tenants/${tenant.id}`, { subscriptionOverride: vars }),
    onSuccess: () => {
      toast.success("Subscription updated");
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Update failed"),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{tenant.organizationName}</CardTitle>
          <p className="text-sm text-muted">{tenant.email}</p>
        </div>
        <Badge variant="secondary">{tenant.accountType.replace("_", " ")}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted">
          {tenant.county} - {tenant._count.championships} championships - joined {formatDate(tenant.createdAt)}
        </p>
        {tenant.subscriptions.length === 0 && <p className="text-sm text-muted">No subscriptions yet.</p>}
        {tenant.subscriptions.map((sub) => (
          <div key={sub.id} className="flex items-center justify-between rounded-md border border-border p-2">
            <div>
              <p className="text-sm font-medium text-foreground">{sub.plan.displayName}</p>
              <p className="text-xs text-muted">{sub.expiresAt ? `Expires ${formatDate(sub.expiresAt)}` : "No expiry set"}</p>
            </div>
            <Select
              value={sub.status}
              onValueChange={(status) => overrideMutation.mutate({ subscriptionId: sub.id, status })}
            >
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TRIAL">Trial</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function TenantsGrid() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => apiGet<{ tenants: TenantRow[] }>("/api/tenants"),
  });

  if (isLoading) return <p className="text-muted">Loading tenants...</p>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {(data?.tenants ?? []).map((tenant) => (
        <TenantCard key={tenant.id} tenant={tenant} />
      ))}
      {(data?.tenants ?? []).length === 0 && <p className="text-muted">No tenants registered yet.</p>}
    </div>
  );
}
