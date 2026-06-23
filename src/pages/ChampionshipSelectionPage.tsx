import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Calendar, ChevronRight, MapPin, Search, Trophy } from 'lucide-react';
import { Championship, LEVEL_LABELS, SCHOOL_LEVEL_LABELS } from '@/types/database';

type SelectionMode = 'rankings' | 'qualified';

type ChampionshipSelectorProps = {
  mode: SelectionMode;
};

type TenantCounty = {
  id: string;
  county: string | null;
  organization_name: string | null;
};

const formatDateRange = (start?: string | null, end?: string | null) => {
  if (!start && !end) return 'Dates to be announced';
  if (start && end) return `${start} - ${end}`;
  return start || end || 'Dates to be announced';
};

const getCountyForChampionship = (championship: Championship, countyByTenant: Map<string, string | null>) => {
  const fromChampionship = (championship.county || '').trim();
  if (fromChampionship) return fromChampionship;
  const fromTenant = countyByTenant.get(championship.tenant_id || '')?.trim();
  if (fromTenant) return fromTenant;
  return (championship.location || '').trim() || 'Unknown';
};

const ChampionshipSelectionPage = ({ mode }: ChampionshipSelectorProps) => {
  const navigate = useNavigate();
  const [selectedChampionshipId, setSelectedChampionshipId] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-championship-selector', mode],
    queryFn: async () => {
      const [championshipRes, tenantRes] = await Promise.all([
        supabase
          .from('championships')
          .select('*')
          .order('start_date', { ascending: false, nullsFirst: false }),
        supabase
          .from('tenants')
          .select('id, county, organization_name'),
      ]);

      if (championshipRes.error) throw championshipRes.error;
      if (tenantRes.error) throw tenantRes.error;

      return {
        championships: (championshipRes.data ?? []) as Championship[],
        tenants: (tenantRes.data ?? []) as TenantCounty[],
      };
    },
  });

  const countyByTenant = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const tenant of data?.tenants || []) {
      map.set(tenant.id, tenant.county);
    }
    return map;
  }, [data?.tenants]);

  const championships = useMemo(() => {
    const visible = (data?.championships || []).filter((championship) => {
      if (championship.is_published === false) return false;
      return true;
    });

    return visible.map((championship) => ({
      ...championship,
      county: getCountyForChampionship(championship, countyByTenant),
    }));
  }, [data?.championships, countyByTenant]);

  const selectedChampionship = championships.find((championship) => championship.id === selectedChampionshipId) || null;

  const goToChampionship = () => {
    if (!selectedChampionshipId) return;
    navigate(`/championship/${selectedChampionshipId}`, {
      state: { tab: mode },
    });
  };

  const heading = mode === 'rankings'
    ? 'Select a championship to view rankings'
    : 'Select a championship to view qualified teams';

  const description = mode === 'rankings'
    ? 'Choose one championship to see rankings for that championship only.'
    : 'Choose one championship to see qualified teams and participants for that championship only.';

  const sortedChampionships = useMemo(() => {
    return [...championships].sort((a, b) => {
      const dateA = a.start_date || a.created_at;
      const dateB = b.start_date || b.created_at;
      return (dateB || '').localeCompare(dateA || '');
    });
  }, [championships]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="bg-gradient-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link to="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors">
            <ChevronRight className="w-4 h-4 rotate-180" />Back to Home
          </Link>
          <div className="max-w-3xl">
            <Badge className="bg-secondary text-secondary-foreground mb-3">Championship selector</Badge>
            <h1 className="font-display text-4xl md:text-5xl tracking-wider">{heading}</h1>
            <p className="text-white/75 mt-3 text-base md:text-lg">{description}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-secondary" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
            Unable to load championships right now.
          </div>
        ) : championships.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Trophy className="w-10 h-10 text-secondary mx-auto mb-3" />
            <h2 className="font-display text-2xl mb-2">No championships found</h2>
            <p className="text-muted-foreground">There are no public championships available for this view.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Championship</p>
                <Select value={selectedChampionshipId || 'none'} onValueChange={(value) => {
                  if (value === 'none') {
                    setSelectedChampionshipId('');
                    return;
                  }
                  setSelectedChampionshipId(value);
                }}>
                  <SelectTrigger className="w-full lg:w-[420px]">
                    <SelectValue placeholder="Choose a championship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Choose a championship</SelectItem>
                    {sortedChampionships.map((championship) => (
                      <SelectItem key={championship.id} value={championship.id}>
                        {championship.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={goToChampionship}
                disabled={!selectedChampionshipId}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                Continue
              </Button>
            </div>

            {selectedChampionship && (
              <div className="rounded-2xl border border-secondary/30 bg-secondary/5 p-5">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="secondary">{LEVEL_LABELS[selectedChampionship.level]}</Badge>
                  <Badge variant="outline">{SCHOOL_LEVEL_LABELS[selectedChampionship.school_level]}</Badge>
                  <Badge variant="outline">{selectedChampionship.county || 'Unknown county'}</Badge>
                </div>
                <h2 className="font-display text-2xl">{selectedChampionship.name}</h2>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formatDateRange(selectedChampionship.start_date, selectedChampionship.end_date)}</span>
                  <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" />{selectedChampionship.location || 'Location to be confirmed'}</span>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedChampionships.map((championship) => (
                <button
                  key={championship.id}
                  onClick={() => setSelectedChampionshipId(championship.id)}
                  className={`text-left rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${selectedChampionshipId === championship.id ? 'border-secondary bg-secondary/5 shadow-md' : 'border-border bg-card'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-xl text-foreground">{championship.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{formatDateRange(championship.start_date, championship.end_date)}</p>
                    </div>
                    <Badge variant="outline">{championship.county || 'Unknown'}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Badge variant="secondary">{LEVEL_LABELS[championship.level]}</Badge>
                    <Badge variant="outline">{SCHOOL_LEVEL_LABELS[championship.school_level]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />{championship.location || 'No location listed'}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChampionshipSelectionPage;