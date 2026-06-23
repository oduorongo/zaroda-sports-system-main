import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronLeft, Loader2, MapPin, Trophy, X } from 'lucide-react';
import { CATEGORY_LABELS, CompetitionLevel, GameCategory, LEVEL_LABELS, SCHOOL_LEVEL_LABELS, Championship } from '@/types/database';

type TournamentType = 'open_tournament' | 'school_games';

type TenantCounty = {
  id: string;
  county: string | null;
};

// Levels are displayed in official progression order.
const LEVEL_ORDER: CompetitionLevel[] = ['base', 'ward', 'zone', 'subcounty', 'county', 'region', 'national'];



const formatDateRange = (start?: string | null, end?: string | null) => {
  if (!start && !end) return 'Dates to be announced';
  if (start && end) return `${start} - ${end}`;
  return start || end || 'Dates to be announced';
};

const getCountyForChampionship = (championship: Championship, countyByTenant: Map<string, string | null>) => {
  const fromChampionship = (championship.county || '').trim();
  if (fromChampionship) return fromChampionship;
  const fromTenant = countyByTenant.get(championship.tenant_id || '')?.trim();
  return fromTenant || '';
};

const CategoryPage = () => {
  const { category } = useParams() as { category?: GameCategory };

  const [tournamentType, setTournamentType] = useState<TournamentType | ''>('');
  const [county, setCounty] = useState('');
  const [level, setLevel] = useState<CompetitionLevel | ''>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-category-browse', category],
    queryFn: async () => {
      const [championshipRes, tenantRes] = await Promise.all([
        supabase
          .from('championships')
          .select('*')
          .order('start_date', { ascending: false, nullsFirst: false }),
        supabase
          .from('tenants')
          .select('id, county'),
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

  const categoryChampionships = useMemo(() => {
    return (data?.championships || [])
      .filter((championship) => championship.category === category)
      .map((championship) => ({
        ...championship,
        countyLabel: getCountyForChampionship(championship, countyByTenant),
      }))
      .filter((championship) => championship.countyLabel);
  }, [data?.championships, countyByTenant, category]);

  const isOpenTournament = tournamentType === 'open_tournament';

  // Championships matching the selected tournament type (school vs open).
  const tournamentChampionships = useMemo(() => {
    if (!tournamentType) return [];
    return categoryChampionships.filter((championship) =>
      isOpenTournament
        ? championship.school_level === 'open'
        : championship.school_level !== 'open',
    );
  }, [categoryChampionships, isOpenTournament, tournamentType]);

  // Filter 2 — counties are derived from the championships that actually exist
  // (county resolved from championship or its owning tenant), deduplicated and
  // sorted alphabetically. Only counties with championships are shown.
  const countyOptions = useMemo(() => {
    if (!tournamentType) return [];
    return Array.from(
      new Set(tournamentChampionships.map((championship) => championship.countyLabel).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));
  }, [tournamentChampionships, tournamentType]);

  const countyChampionships = useMemo(() => {
    if (!tournamentType || !county) return [];
    return tournamentChampionships.filter((championship) => championship.countyLabel === county);
  }, [tournamentChampionships, county, tournamentType]);

  // Filter 3 — levels are derived from the championships in the selected county,
  // shown in official progression order.
  const levelOptions = useMemo(() => {
    if (!county) return [];
    return Array.from(new Set(countyChampionships.map((championship) => championship.level))).sort(
      (a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b),
    );
  }, [county, countyChampionships]);


  const filteredChampionships = useMemo(() => {
    if (!level) return [];
    return countyChampionships.filter((championship) => championship.level === level);
  }, [countyChampionships, level]);

  const clearAll = () => {
    setTournamentType('');
    setCounty('');
    setLevel('');
  };

  const invalidCategory = !category || !['ball_games', 'athletics', 'music', 'other'].includes(category);

  if (invalidCategory) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="font-display text-4xl text-foreground mb-4">Category Not Found</h1>
          <Link to="/" className="text-secondary hover:underline">Return Home</Link>
        </div>
      </div>
    );
  }

  const activeSelections = [
    tournamentType && {
      label: 'Tournament Type',
      value: tournamentType === 'open_tournament' ? 'Open Tournament' : 'School Games',
      clear: () => {
        setTournamentType('');
        setCounty('');
        setLevel('');
      },
    },
    county && {
      label: 'County',
      value: county,
      clear: () => {
        setCounty('');
        setLevel('');
      },
    },
    level && {
      label: 'Level',
      value: LEVEL_LABELS[level],
      clear: () => setLevel(''),
    },
  ].filter(Boolean) as Array<{ label: string; value: string; clear: () => void }>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="bg-gradient-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="font-display text-4xl md:text-5xl tracking-wider">
            {CATEGORY_LABELS[category]}
          </h1>
          <p className="text-white/75 mt-2 max-w-2xl">
            Start with tournament type, then narrow down by county, level, and championship.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="rounded-2xl border border-border bg-card p-4 md:p-5 shadow-sm space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Filter 1 - Tournament Type</p>
              <Select
                value={tournamentType || 'none'}
                onValueChange={(value) => {
                  if (value === 'none') {
                    clearAll();
                    return;
                  }
                  setTournamentType(value as TournamentType);
                  setCounty('');
                  setLevel('');
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select tournament type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select tournament type</SelectItem>
                  <SelectItem value="open_tournament">Open Tournament</SelectItem>
                  <SelectItem value="school_games">School Games</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Filter 2 - County</p>
              <Select
                value={county || 'none'}
                disabled={!tournamentType}
                onValueChange={(value) => {
                  if (value === 'none') {
                    setCounty('');
                    setLevel('');
                    return;
                  }
                  setCounty(value);
                  setLevel('');
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={!tournamentType ? 'Select tournament type first' : 'Select county'} />
                </SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto">
                  <SelectItem value="none">Select county</SelectItem>
                  {countyOptions.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground">
                      No championships found yet
                    </div>
                  ) : (
                    countyOptions.map((countyName) => (
                      <SelectItem key={countyName} value={countyName}>
                        {countyName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>


            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Filter 3 - Level</p>
              <Select
                value={level || 'none'}
                disabled={!county}
                onValueChange={(value) => {
                  if (value === 'none') {
                    setLevel('');
                    return;
                  }
                  setLevel(value as CompetitionLevel);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={!county ? 'Select county first' : 'Select level'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select level</SelectItem>
                  {county && levelOptions.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground">
                      No championships found for this county
                    </div>
                  ) : (
                    levelOptions.map((levelOption) => (
                      <SelectItem key={levelOption} value={levelOption}>
                        {levelOption === 'region' ? 'Regional' : LEVEL_LABELS[levelOption]}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>

              </Select>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Filter 4 - Championship</p>
              <Select value="none" disabled={!level}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={!level ? 'Select level first' : 'Championship list below'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Championships appear below</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex flex-wrap gap-2">
              {activeSelections.map((selection) => (
                <Badge key={`${selection.label}-${selection.value}`} variant="secondary" className="pr-1 pl-3 py-1.5 flex items-center gap-2">
                  <span>{selection.label}: {selection.value}</span>
                  <button
                    type="button"
                    onClick={selection.clear}
                    className="rounded-full hover:bg-secondary-foreground/10 p-0.5"
                    aria-label={`Clear ${selection.label}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
            <Button variant="outline" onClick={clearAll} className="border-primary/20 text-primary hover:bg-primary/5">
              Clear filters
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-secondary" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
            Unable to load championships right now.
          </div>
        ) : !tournamentType ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Trophy className="w-10 h-10 text-secondary mx-auto mb-3" />
            <h2 className="font-display text-2xl mb-2">Select a tournament type to begin</h2>
            <p className="text-muted-foreground">The rest of the filters will appear in sequence once you choose the first option.</p>
          </div>
        ) : filteredChampionships.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Trophy className="w-10 h-10 text-secondary mx-auto mb-3" />
            <h2 className="font-display text-2xl mb-2">No championships found</h2>
            <p className="text-muted-foreground mb-4">
              No public championships match the selected filters.
            </p>
            <Button variant="outline" onClick={clearAll}>Clear filters</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {county && !level && (
              <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-5 text-sm text-muted-foreground">
                Choose a level to see championships in {county}.
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredChampionships.map((championship) => (
                <Link
                  key={championship.id}
                  to={`/championship/${championship.id}`}
                  className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-xl text-foreground group-hover:text-primary transition-colors">
                        {championship.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDateRange(championship.start_date, championship.end_date)}
                      </p>
                    </div>
                    <Badge variant="outline">{championship.countyLabel}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <Badge variant="secondary">{LEVEL_LABELS[championship.level]}</Badge>
                    <Badge variant="outline">{SCHOOL_LEVEL_LABELS[championship.school_level]}</Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mt-4 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {championship.location || 'Location to be confirmed'}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
