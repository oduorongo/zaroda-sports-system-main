import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSubscription, useSubscriptionPlans } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trophy, Plus, Crown, Sparkles, Loader2, Calendar, MapPin, AlertTriangle, CheckCircle2 } from "lucide-react";
import { CompetitionLevel, SchoolLevel, GameCategory, LEVEL_LABELS, SCHOOL_LEVEL_LABELS, CATEGORY_LABELS } from "@/types/database";
import { formatChampionshipName } from "@/lib/championship";

export default function TenantDashboardPage() {
  const navigate = useNavigate();
  const { tenant, subscriptions, activeSubscription, trialDaysLeft, loading: subsLoading, refresh } = useTenantSubscription();
  const { plans } = useSubscriptionPlans();
  const [championships, setChampionships] = useState<any[]>([]);
  const [quotaRemaining, setQuotaRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    level: "base" as CompetitionLevel,
    school_level: "primary_junior" as SchoolLevel,
    category: "athletics" as GameCategory,
    location: "",
    start_date: "",
    end_date: "",
    description: "",
  });

  const loadAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }
    if (tenant) {
      const { data: champs } = await supabase
        .from("championships").select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });
      setChampionships(champs || []);
      const { data: q } = await supabase.rpc("tenant_championship_quota_remaining", { _user_id: user.id });
      setQuotaRemaining(typeof q === "number" ? q : 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!subsLoading) loadAll();
    // eslint-disable-next-line
  }, [subsLoading, tenant?.id]);

  const totalQuota = subscriptions.reduce((sum, s: any) => {
    const sub = s as any;
    const isLive =
      (sub.status === "trialing" && new Date(sub.trial_ends_at) > new Date()) ||
      (sub.status === "active" && (!sub.expires_at || new Date(sub.expires_at) > new Date()));
    if (!isLive) return sum;
    const plan = plans.find(p => p.id === sub.plan_id);
    return sum + ((plan as any)?.championship_quota || 1);
  }, 0);

  const usedQuota = championships.length;

  const isBaseLevel = form.level === 'base';
  const finalChampionshipName = formatChampionshipName(form.name, form.level);

  const submit = async () => {
    if (!tenant) { toast.error("Not signed in"); return; }
    if (!isBaseLevel && quotaRemaining <= 0) {
      toast.error("No quota left for paid levels — upgrade your plan or use Base level (free).");
      navigate("/pricing");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("championships").insert([{
        ...form,
        name: finalChampionshipName,
        tenant_id: tenant.id,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      }]);
      if (error) throw error;
      toast.success(isBaseLevel ? "Free base-level championship created" : "Championship created");
      setOpen(false);
      setForm({ ...form, name: "", location: "", description: "", start_date: "", end_date: "" });
      await loadAll();
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to create championship");
    } finally {
      setSubmitting(false);
    }
  };

  if (subsLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-secondary" /></div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <Trophy className="w-16 h-16 mx-auto text-secondary mb-4" />
          <h1 className="font-display text-3xl mb-2">Sign up to manage championships</h1>
          <p className="text-muted-foreground mb-6">Create a tenant account, pick a subscription package and start running championships.</p>
          <div className="flex gap-3 justify-center">
            <Link to="/signup"><Button>Sign Up</Button></Link>
            <Link to="/pricing"><Button variant="outline">View Pricing</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <header className="bg-gradient-to-br from-primary via-primary to-[hsl(var(--navy-dark))] text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 shadow-lg overflow-hidden">
                <img
                  src="/zaroda-logo.png"
                  alt="Zaroda Sports Management"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <Badge className="bg-secondary text-secondary-foreground mb-2">My Account</Badge>
                <h1 className="font-display text-3xl md:text-4xl tracking-wide">{tenant.organization_name}</h1>
                <p className="text-primary-foreground/80 mt-1">{tenant.contact_name} · {tenant.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate("/pricing")}>
                <Sparkles className="w-4 h-4 mr-1" />Subscribe / Upgrade Level
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Quota cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Active subscriptions</div>
              <div className="text-3xl font-display">{subscriptions.filter(s => {
                const x: any = s;
                return (x.status === "trialing" && new Date(x.trial_ends_at) > new Date()) ||
                  (x.status === "active" && (!x.expires_at || new Date(x.expires_at) > new Date()));
              }).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Championship quota</div>
              <div className="text-3xl font-display">{totalQuota}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Used</div>
              <div className="text-3xl font-display">{usedQuota}</div>
            </CardContent>
          </Card>
          <Card className={quotaRemaining > 0 ? "border-secondary" : "border-destructive"}>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Remaining</div>
              <div className={`text-3xl font-display ${quotaRemaining > 0 ? "text-secondary" : "text-destructive"}`}>{quotaRemaining}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-secondary/40 bg-secondary/5">
          <CardContent className="p-4 flex items-center gap-3 flex-wrap">
            <Sparkles className="w-5 h-5 text-secondary" />
            <span className="text-sm">
              <strong>Base championships are always free</strong> and don't count against your quota.
              Subscribe to unlock Zone → National levels.
            </span>
            <Button size="sm" variant="secondary" className="ml-auto" onClick={() => navigate("/pricing")}>View Plans</Button>
          </CardContent>
        </Card>

        {/* Championships list */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-secondary" />Your Championships
                </CardTitle>
                <CardDescription>
                  Add a championship under your active subscription quota.
                </CardDescription>
              </div>
              <Button onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />Add Championship
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {quotaRemaining <= 0 && (
              <div className="mb-4 p-3 rounded-lg bg-secondary/5 border border-secondary/30 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-secondary" />
                You've used your paid quota — but you can still create unlimited <strong>Base</strong> championships for free.
                <Link to="/pricing" className="text-secondary underline ml-1">Upgrade for higher levels</Link>
              </div>
            )}
            {championships.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No championships yet — click "Add Championship" to start.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>School Level</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Dates</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {championships.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          <Link to={`/championship/${c.id}`} className="hover:text-secondary">{c.name}</Link>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{LEVEL_LABELS[c.level as CompetitionLevel]}</Badge></TableCell>
                        <TableCell>{SCHOOL_LEVEL_LABELS[c.school_level as SchoolLevel]}</TableCell>
                        <TableCell className="text-sm"><MapPin className="inline w-3 h-3 mr-1" />{c.location || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <Calendar className="inline w-3 h-3 mr-1" />
                          {c.start_date ? new Date(c.start_date).toLocaleDateString() : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscriptions overview */}
        <Card>
          <CardHeader>
            <CardTitle>My Subscriptions</CardTitle>
            <CardDescription>Each plan adds quota to your championship pool.</CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No subscriptions yet</p>
                <Link to="/pricing"><Button className="mt-3">Browse Plans</Button></Link>
              </div>
            ) : (
              <div className="space-y-2">
                {subscriptions.map((s: any) => {
                  const plan = plans.find(p => p.id === s.plan_id) as any;
                  const isLive =
                    (s.status === "trialing" && new Date(s.trial_ends_at) > new Date()) ||
                    (s.status === "active" && (!s.expires_at || new Date(s.expires_at) > new Date()));
                  return (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <div className="font-medium">{plan?.display_name || "Plan"}</div>
                        <div className="text-xs text-muted-foreground">
                          Quota: {plan?.championship_quota ?? 1} championship{(plan?.championship_quota ?? 1) > 1 ? "s" : ""}
                        </div>
                      </div>
                      <Badge variant={isLive ? (s.status === "trialing" ? "outline" : "default") : "secondary"}>
                        {isLive ? (s.status === "trialing" ? `Trial · ${Math.max(0, Math.ceil((new Date(s.trial_ends_at).getTime() - Date.now()) / 86400000))}d` : "Active") : s.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add championship dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" /> Add Championship
              <Badge variant="outline" className="ml-2">{quotaRemaining} left</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Championship name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sub-County Term 2 Athletics 2026" />
              <p className="text-xs text-muted-foreground mt-1">Final name: {finalChampionshipName || 'Enter a championship name and choose a level'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Level</Label>
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v as CompetitionLevel })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEVEL_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>School Level</Label>
                <Select value={form.school_level} onValueChange={(v) => setForm({ ...form, school_level: v as SchoolLevel })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SCHOOL_LEVEL_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as GameCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>End date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            {isBaseLevel ? (
              <div className="text-xs flex items-center gap-1 text-secondary">
                <Sparkles className="w-3 h-3" /> Base level is FREE — won't use any subscription quota.
              </div>
            ) : quotaRemaining > 0 ? (
              <div className="text-xs flex items-center gap-1 text-secondary">
                <CheckCircle2 className="w-3 h-3" /> This championship will use 1 of your {quotaRemaining} remaining slots.
              </div>
            ) : (
              <div className="text-xs flex items-center gap-1 text-destructive">
                <AlertTriangle className="w-3 h-3" /> No paid quota left — switch level to <strong>Base</strong> for free, or upgrade your plan.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!form.name || submitting || (!isBaseLevel && quotaRemaining <= 0)}>
              {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
