import { useEffect, useState } from "react";
import { authClient } from "@/integrations/admin/authClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Trophy, CreditCard, Activity, Loader2, UserPlus, Calendar } from "lucide-react";
import { devError, devLog } from "@/lib/dev";

interface ActivityItem {
  type: "tenant" | "championship";
  label: string;
  sub: string;
  at: string;
}

export function SuperAdminOverview() {
  const [loading, setLoading] = useState(true);
  const [championships, setChampionships] = useState(0);
  const [tenants, setTenants] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [champRes, tenantRes, subRes, recentTenants, recentChamps] = await Promise.all([
          authClient.from("championships").select("id", { count: "exact", head: true }),
          authClient.from("tenants").select("id", { count: "exact", head: true }),
          authClient.from("championship_subscriptions").select("amount_paid_kes, status"),
          authClient.from("tenants").select("organization_name, county, created_at").order("created_at", { ascending: false }).limit(5),
          authClient.from("championships").select("name, level, created_at").order("created_at", { ascending: false }).limit(5),
        ]);

        if (cancelled) return;

        setChampionships(champRes.count ?? 0);
        setTenants(tenantRes.count ?? 0);

        const total = (subRes.data ?? [])
          .filter((s: any) => s.status === "active")
          .reduce((sum: number, s: any) => sum + (Number(s.amount_paid_kes) || 0), 0);
        setRevenue(total);

        const items: ActivityItem[] = [
          ...((recentTenants.data ?? []) as any[]).map((t) => ({
            type: "tenant" as const,
            label: t.organization_name,
            sub: t.county || "New tenant",
            at: t.created_at,
          })),
          ...((recentChamps.data ?? []) as any[]).map((c) => ({
            type: "championship" as const,
            label: c.name,
            sub: `${c.level} championship`,
            at: c.created_at,
          })),
        ]
          .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
          .slice(0, 8);
        setActivity(items);
        devLog("[Overview] Loaded", { championships: champRes.count, tenants: tenantRes.count, revenue: total });
      } catch (e) {
        devError("[Overview] Failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = [
    { label: "Total Championships", value: championships, icon: Trophy },
    { label: "Total Tenants", value: tenants, icon: Building2 },
    { label: "Total Revenue", value: `KES ${revenue.toLocaleString()}`, icon: CreditCard },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">{s.label}</p>
                  <p className="text-2xl font-display">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : s.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Activity className="w-5 h-5 text-secondary" />Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-6"><Loader2 className="w-4 h-4 animate-spin" />Loading...</div>
          ) : activity.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center">No recent activity.</p>
          ) : (
            <ul className="divide-y divide-border">
              {activity.map((a, i) => {
                const Icon = a.type === "tenant" ? UserPlus : Trophy;
                return (
                  <li key={i} className="flex items-center gap-3 py-3">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className="w-4 h-4 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{a.label}</p>
                      <p className="text-xs text-muted-foreground capitalize">{a.sub}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      <Calendar className="inline w-3 h-3 mr-1" />{new Date(a.at).toLocaleDateString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
