import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';



import { useSubscriptionPlans, useTenantSubscription, type PackageTier } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_LABELS, GameCategory } from '@/types/database';
import { formatChampionshipName } from '@/lib/championship';
import { toast } from 'sonner';
import { Check, Loader2, Sparkles, Crown, Zap, Star, ChevronLeft } from 'lucide-react';

const PACKAGE_META: Record<PackageTier, { label: string; tagline: string; icon: typeof Crown; accent: string; features: string[] }> = {
  essential: {
    label: 'Essential',
    tagline: 'Access tier — get started',
    icon: Star,
    accent: 'border-border',
    features: ['Event setup & registration', 'Digital results capture', 'Standard PDF results sheets', 'Basic rankings', 'Offline + online'],
  },
  professional: {
    label: 'Professional',
    tagline: 'Most popular — recommended',
    icon: Zap,
    accent: 'border-secondary ring-2 ring-secondary',
    features: ['Everything in Essential', 'Live results dashboard (shareable link)', 'Branded results (logos & colours)', 'Advanced rankings & analytics', 'Multi-event coordination', 'Priority support'],
  },
  elite: {
    label: 'Elite',
    tagline: 'High-impact championships',
    icon: Crown,
    accent: 'border-primary',
    features: ['Everything in Professional', 'Real-time live coverage', 'Public spectator portal', 'Athlete progression tracking', 'Dedicated event-day support', 'Sponsor-ready custom reports'],
  },
  season_bundle: {
    label: 'Season Bundle',
    tagline: 'Institution package — unlimited events',
    icon: Sparkles,
    accent: 'border-accent',
    features: ['Unlimited events per season', 'Priority onboarding & training', 'Cross-event data tracking', 'Discounted vs per-event pricing'],
  },
};


const TIER_LABELS: Record<string, string> = {
  ward: 'Ward',
  zone: 'Zone',
  subcounty: 'Sub-County',
  county: 'County',
  regional: 'Regional',
  national: 'Open Tournament',
  open_tournament: 'Open Tournament',
  season_subcounty: 'Sub-County Season',
  season_county: 'County Season',
  season_regional: 'Regional Season',
};

const CATEGORIES: GameCategory[] = ['ball_games', 'athletics', 'music', 'other'];

export default function PricingPage() {
  const navigate = useNavigate();
  const { plans, loading } = useSubscriptionPlans();
  const { tenant, activeSubscription, trialDaysLeft } = useTenantSubscription();
  const [paying, setPaying] = useState<string | null>(null);
  const [category] = useState<GameCategory | ''>(() => {
    try { return (localStorage.getItem('zaroda_signup_category') as GameCategory) || ''; } catch { return ''; }
  });
  const [accountType] = useState<string>(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('account_type');
      return fromUrl || localStorage.getItem('zaroda_signup_account_type') || '';
    } catch { return ''; }
  });

  const grouped = useMemo(() => {
    const out: Record<PackageTier, typeof plans> = { essential: [], professional: [], elite: [], season_bundle: [] };
    plans.forEach(p => {
      const pt = (p.package_tier || 'essential') as PackageTier;
      if (out[pt]) out[pt].push(p);
    });
    return out;
  }, [plans]);

  const requireCategory = () => {
    if (!category) {
      toast.error('Please sign up and select a game category first');
      navigate('/signup');
      return false;
    }
    return true;
  };

  const startBaseLevel = async () => {
    if (!tenant) { toast.error('Please sign up first'); navigate('/signup'); return; }
    setPaying('base');
    try {
      const { data: existing, error: lookupError } = await supabase
        .from('championships')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('level', 'base')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lookupError) throw lookupError;

      if (!existing) {
        const { error } = await supabase.from('championships').insert({
          tenant_id: tenant.id,
          created_by: tenant.user_id,
          name: formatChampionshipName(`${tenant.organization_name} Championship`, 'base'),
          level: 'base',
          school_level: 'base',
          category: category || 'athletics',
          description: 'Base-level championship created from pricing.',
        });
        if (error) throw error;
      }

      toast.success('Base level is free. Opening your dashboard now.');
      navigate('/admin');
    } catch (e: any) {
      toast.error(e.message || 'Could not start Base level');
    } finally {
      setPaying(null);
    }
  };

  // Trial removed — Base championships are free, all other tiers require a paid subscription.


  const subscribe = async (planId: string) => {
    if (!tenant) { toast.error('Please sign up first'); navigate('/signup'); return; }
    if (!requireCategory()) return;
    setPaying(planId);
    try {
      const { data, error } = await supabase.functions.invoke('initialize-payment', {
        body: { plan_id: planId, category, account_type: accountType || undefined },
      });
      if (error) throw error;
      if (data?.authorization_url) window.location.href = data.authorization_url;
      else throw new Error('No payment URL returned');
    } catch (e: any) { toast.error(e.message || 'Payment initialization failed'); setPaying(null); }
  };

  const renderPlanCard = (p: typeof plans[number], pt: PackageTier) => {
    const meta = PACKAGE_META[pt];
    const Icon = meta.icon;
    const isBundle = p.championship_quota > 1;
    return (
      <Card key={p.id} className={`flex flex-col ${isBundle ? 'border-secondary ring-2 ring-secondary' : meta.accent}`}>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-5 h-5 text-secondary" />
            <Badge variant="outline">{isBundle ? 'Bundle — 4 levels' : (TIER_LABELS[p.tier] || p.tier)}</Badge>
          </div>
          <CardTitle className="text-xl">{p.display_name}</CardTitle>
          <CardDescription>{p.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="text-3xl font-bold">
            KSh {p.price_kes.toLocaleString()}
            <span className="text-sm font-normal text-muted-foreground"> {pt === 'season_bundle' ? '/ year' : '/ subscription'}</span>
          </div>
          <Badge variant="outline" className="mt-2">
            {p.championship_quota >= 999 ? 'Unlimited championships' : `${p.championship_quota} championship${p.championship_quota > 1 ? 's' : ''} included`}
          </Badge>
          <ul className="mt-4 space-y-2 text-sm">
            {meta.features.map(f => (
              <li key={f} className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {f}</li>
            ))}
          </ul>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full" onClick={() => subscribe(p.id)} disabled={paying === p.id}>
            {paying === p.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Subscribe — KSh {p.price_kes.toLocaleString()}
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-10">        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>        <div className="text-center mb-8">
          <h1 className="font-display text-4xl md:text-5xl mb-2 tracking-wide">CHOOSE YOUR PACKAGE</h1>
          <p className="text-muted-foreground text-lg">
            Per-championship pricing across all school levels — Tertiary, Senior School, Primary/JSS.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/30 text-sm">
            <Sparkles className="w-4 h-4 text-secondary" />
            <span><strong>Base level championships are free.</strong> Pay per level, or grab the KSh 8,800 bundle for up to 4 championships.</span>
          </div>
          {activeSubscription && (
            <Badge variant="secondary" className="mt-4 ml-2">Active subscription</Badge>
          )}
          {!tenant && (
            <div className="mt-4">
              <Link to="/signup"><Button>Sign Up to Get Started</Button></Link>
            </div>
          )}
        </div>

        {category && (
          <div className="text-center mb-6">
            <Badge variant="outline" className="text-sm">
              Category: {CATEGORY_LABELS[category as GameCategory]}
            </Badge>
          </div>
        )}

        <Card className="mb-8 border-secondary/40 bg-secondary/5">
          <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <Badge variant="secondary" className="mb-2">Free</Badge>
              <CardTitle>Base Level</CardTitle>
              <CardDescription>
                Create your Base championship at no cost. This is the free level.
              </CardDescription>
            </div>
            <div className="md:text-right">
              <div className="text-3xl font-bold">KSh 0</div>
              <div className="text-sm text-muted-foreground">No payment required</div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Create and manage your base championship</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Base setup included</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> No subscription or payment needed</li>
            </ul>
            <Button className="w-full md:w-auto" onClick={startBaseLevel} disabled={paying === 'base'}>
              {paying === 'base' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Continue with Base
            </Button>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
          <div>
            <div className="text-center mb-4">
              <h2 className="font-display text-2xl">{PACKAGE_META.essential.label}</h2>
              <p className="text-sm text-muted-foreground">Pay per level — or save with the KSh 8,800 bundle for up to 4 championships across Ward → Sub-County → County.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {grouped.essential
                .filter((p) => accountType === 'open' ? p.tier === 'national' : p.tier !== 'national')
                .map((p) => renderPlanCard(p, 'essential'))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
