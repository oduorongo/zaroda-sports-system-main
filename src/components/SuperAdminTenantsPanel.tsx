import { useEffect, useState } from "react";
// IMPORTANT: admin auth lives in authClient (separate storage key), NOT the public
// `supabase` client. The public client has no session, so RLS (has_role super_admin)
// returns zero rows. Always use authClient for super-admin reads/writes here.
import { authClient } from "@/integrations/admin/authClient";
import { adminWrite } from "@/integrations/admin/adminWrite";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import {
  Building2, Calendar, RefreshCcw, CheckCircle2, XCircle, Clock,
  Loader2, AlertCircle, ChevronDown, ChevronRight, Trophy, MapPin, CreditCard,
} from "lucide-react";
import { devLog, devError } from "@/lib/dev";

interface SubscriptionRow {
  id: string;
  status: string;
  trial_ends_at: string;
  expires_at: string | null;
  plan_id: string;
  amount_paid_kes: number | null;
  subscription_plans?: { display_name: string; price_kes: number } | null;
}

interface TenantRow {
  id: string;
  organization_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  county: string | null;
  subcounty: string | null;
  user_id: string;
  created_at: string;
  last_active_at: string | null;
  championship_subscriptions: SubscriptionRow[];
}

interface TenantChampionship {
  id: string;
  name: string;
  level: string;
  school_level: string;
  location: string | null;
  created_at: string;
}

export function SuperAdminTenantsPanel() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [champsByTenant, setChampsByTenant] = useState<Record<string, TenantChampionship[]>>({});
  const [loadingChamps, setLoadingChamps] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    devLog("[Tenants] Fetching public.tenants via authClient...");
    const { data, error } = await authClient
      .from("tenants")
      .select(`
        *,
        championship_subscriptions(
          id, status, trial_ends_at, expires_at, plan_id, amount_paid_kes,
          subscription_plans(display_name, price_kes)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      devError("[Tenants] Fetch error:", error);
      setError(error.message);
      toast({ title: "Failed to load tenants", description: error.message, variant: "destructive" });
      setTenants([]);
    } else {
      devLog(`[Tenants] Loaded ${data?.length ?? 0} tenants`, data);
      setTenants((data as unknown as TenantRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleExpand = async (tenant: TenantRow) => {
    if (expanded === tenant.id) {
      setExpanded(null);
      return;
    }
    setExpanded(tenant.id);
    if (!champsByTenant[tenant.id]) {
      setLoadingChamps(tenant.id);
      const { data, error } = await authClient
        .from("championships")
        .select("id, name, level, school_level, location, created_at")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });
      if (error) {
        devError("[Tenants] Championship fetch error:", error);
        toast({ title: "Failed to load championships", description: error.message, variant: "destructive" });
      } else {
        setChampsByTenant((prev) => ({ ...prev, [tenant.id]: (data as TenantChampionship[]) || [] }));
      }
      setLoadingChamps(null);
    }
  };

  const extendTrial = async (subId: string, days: number) => {
    const newEnd = new Date(Date.now() + days * 86400000).toISOString();
    try {
      await adminWrite("championship_subscriptions", "update", {
        values: { trial_ends_at: newEnd, status: "trialing" },
        match: { id: subId },
      });
      toast({ title: `Trial extended by ${days} days` });
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const compSubscription = async (subId: string) => {
    const oneYear = new Date(Date.now() + 365 * 86400000).toISOString();
    try {
      await adminWrite("championship_subscriptions", "update", {
        values: { status: "active", expires_at: oneYear, paid_at: new Date().toISOString() },
        match: { id: subId },
      });
      toast({ title: "Subscription activated (1 year)" });
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const cancelSub = async (subId: string) => {
    if (!confirm("Cancel this subscription?")) return;
    try {
      await adminWrite("championship_subscriptions", "update", {
        values: { status: "cancelled" },
        match: { id: subId },
      });
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const filtered = tenants.filter(t =>
    !search ||
    t.organization_name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (s: SubscriptionRow) => {
    if (s.status === "active") {
      const exp = s.expires_at ? new Date(s.expires_at) : null;
      const live = !exp || exp > new Date();
      return <Badge variant={live ? "default" : "secondary"}>{live ? "Active" : "Expired"}</Badge>;
    }
    if (s.status === "trialing") {
      const left = Math.max(0, Math.ceil((new Date(s.trial_ends_at).getTime() - Date.now()) / 86400000));
      return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />Trial · {left}d</Badge>;
    }
    return <Badge variant="destructive">{s.status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />Tenants ({tenants.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Input placeholder="Search org or email..." value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />Loading tenants...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Could not load tenants</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button size="sm" variant="outline" onClick={load}><RefreshCcw className="w-4 h-4 mr-1" />Retry</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Subscriptions</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-64">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(t => (
                  <>
                    <TableRow key={t.id} className="cursor-pointer" onClick={() => toggleExpand(t)}>
                      <TableCell>
                        {expanded === t.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </TableCell>
                      <TableCell className="font-medium">{t.organization_name}</TableCell>
                      <TableCell>
                        <div className="text-sm">{t.contact_name}</div>
                        <div className="text-xs text-muted-foreground">{t.email}</div>
                        {t.phone && <div className="text-xs text-muted-foreground">{t.phone}</div>}
                      </TableCell>
                      <TableCell className="text-sm">{[t.subcounty, t.county].filter(Boolean).join(", ") || "—"}</TableCell>
                      <TableCell>
                        {t.championship_subscriptions.length === 0 ? (
                          <span className="text-xs text-muted-foreground">None</span>
                        ) : (
                          <div className="space-y-1">
                            {t.championship_subscriptions.map(s => (
                              <div key={s.id} className="flex items-center gap-2 text-xs">
                                {statusBadge(s)}
                                <span className="text-muted-foreground">{s.subscription_plans?.display_name || ""}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <Calendar className="inline w-3 h-3 mr-1" />
                        {new Date(t.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-1">
                          {t.championship_subscriptions.map(s => (
                            <div key={s.id} className="flex gap-1 flex-wrap">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => extendTrial(s.id, 7)}>+7d Trial</Button>
                              <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => compSubscription(s.id)}><CheckCircle2 className="w-3 h-3 mr-1" />Activate 1yr</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => cancelSub(s.id)}><XCircle className="w-3 h-3" /></Button>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded === t.id && (
                      <TableRow key={`${t.id}-detail`}>
                        <TableCell colSpan={7} className="bg-muted/40">
                          <div className="grid gap-4 md:grid-cols-2 py-2">
                            <div>
                              <h4 className="font-display text-sm flex items-center gap-1 mb-2"><Trophy className="w-4 h-4 text-secondary" />Championships</h4>
                              {loadingChamps === t.id ? (
                                <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Loading...</p>
                              ) : (champsByTenant[t.id]?.length ?? 0) === 0 ? (
                                <p className="text-xs text-muted-foreground">No championships yet.</p>
                              ) : (
                                <ul className="space-y-1">
                                  {champsByTenant[t.id].map(c => (
                                    <li key={c.id} className="text-xs flex items-center gap-2">
                                      <Badge variant="secondary" className="text-[10px]">{c.level}</Badge>
                                      <span className="font-medium">{c.name}</span>
                                      {c.location && <span className="text-muted-foreground"><MapPin className="inline w-3 h-3" /> {c.location}</span>}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div>
                              <h4 className="font-display text-sm flex items-center gap-1 mb-2"><CreditCard className="w-4 h-4 text-secondary" />Payment History</h4>
                              {t.championship_subscriptions.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No subscriptions / payments.</p>
                              ) : (
                                <ul className="space-y-1">
                                  {t.championship_subscriptions.map(s => (
                                    <li key={s.id} className="text-xs flex items-center gap-2">
                                      {statusBadge(s)}
                                      <span>{s.subscription_plans?.display_name || s.plan_id}</span>
                                      <span className="text-muted-foreground">
                                        {s.amount_paid_kes != null ? `KES ${s.amount_paid_kes.toLocaleString()}` : "—"}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No tenants found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
