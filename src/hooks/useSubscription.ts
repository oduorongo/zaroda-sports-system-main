import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PackageTier = 'essential' | 'professional' | 'elite' | 'season_bundle';

export interface SubscriptionPlan {
  id: string;
  tier: string;
  package_tier: PackageTier;
  display_name: string;
  description: string | null;
  price_kes: number;
  trial_days: number;
  championship_quota: number;
}

export interface Tenant {
  id: string;
  user_id: string;
  organization_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  county: string | null;
  subcounty: string | null;
}

export interface Subscription {
  id: string;
  status: 'trialing' | 'active' | 'expired' | 'cancelled';
  trial_ends_at: string;
  expires_at: string | null;
  plan_id: string;
  championship_id: string | null;
}

export const useSubscriptionPlans = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_kes');
      setPlans((data as SubscriptionPlan[]) || []);
      setLoading(false);
    })();
  }, []);

  return { plans, loading };
};

export const useTenantSubscription = () => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setTenant(null); setSubscriptions([]); setLoading(false); return;
    }
    const { data: t } = await supabase
      .from('tenants').select('*').eq('user_id', user.id).maybeSingle();
    setTenant(t as Tenant | null);
    if (t) {
      const { data: subs } = await supabase
        .from('championship_subscriptions').select('*').eq('tenant_id', (t as Tenant).id);
      setSubscriptions((subs as Subscription[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const activeSubscription = subscriptions.find(s => {
    if (s.status === 'active' && (!s.expires_at || new Date(s.expires_at) > new Date())) return true;
    if (s.status === 'trialing' && new Date(s.trial_ends_at) > new Date()) return true;
    return false;
  });

  const trialDaysLeft = activeSubscription?.status === 'trialing'
    ? Math.max(0, Math.ceil((new Date(activeSubscription.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null;

  return { tenant, subscriptions, activeSubscription, trialDaysLeft, loading, refresh };
};
