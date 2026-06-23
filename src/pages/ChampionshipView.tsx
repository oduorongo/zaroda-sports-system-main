import { useLocation, useParams, Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useChampionships } from '@/hooks/useChampionships';
import { useParticipants } from '@/hooks/useParticipants';
import { Navbar } from '@/components/Navbar';
import { ParticipantsTable } from '@/components/ParticipantsTable';
import { LEVEL_LABELS, CATEGORY_LABELS, SCHOOL_LEVEL_LABELS } from '@/types/database';
import { Loader2, ChevronLeft, Calendar, MapPin, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ChampionshipTeam = {
  id: string;
  championship_id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  team_code: string | null;
};

const getPointsFromPosition = (position?: number | null) => {
  if (!position || position < 1) return 0;
  if (position === 1) return 7;
  if (position === 2) return 5;
  if (position === 3) return 4;
  if (position === 4) return 3;
  if (position === 5) return 2;
  if (position === 6) return 1;
  return 0;
};

const formatDateRange = (start?: string | null, end?: string | null) => {
  if (!start && !end) return 'Dates to be announced';
  if (start && end) return `${start} - ${end}`;
  return start || end || 'Dates to be announced';
};

const ChampionshipView = () => {
  const { championshipId } = useParams() as { championshipId?: string };
  const location = useLocation();
  const requestedTab = (location.state as { tab?: string } | undefined)?.tab;
  const initialTab = requestedTab === 'rankings' ? 'rankings' : requestedTab === 'qualified' ? 'qualified' : 'participants';

  const { data: championships = [], isLoading: champLoading } = useChampionships(true, championshipId);
  const { data: participants = [], isLoading: participantsLoading } = useParticipants(undefined, true, championshipId);

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['championship-teams', championshipId],
    queryFn: async () => {
      if (!championshipId) return [] as ChampionshipTeam[];
      const { data, error } = await supabase
        .from('tournament_teams')
        .select('id, championship_id, name, contact_name, contact_email, contact_phone, team_code')
        .eq('championship_id', championshipId)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChampionshipTeam[];
    },
    enabled: !!championshipId,
  });

  const championship = championships.find((entry) => entry.id === championshipId) || null;

  const { data: tenantCounty } = useQuery({
    queryKey: ['championship-tenant-county', championship?.tenant_id ?? 'none'],
    queryFn: async () => {
      if (!championship?.tenant_id) return null;
      const { data, error } = await supabase
        .from('tenants')
        .select('county')
        .eq('id', championship.tenant_id)
        .maybeSingle();
      if (error) throw error;
      return data?.county || null;
    },
    enabled: !!championship?.tenant_id,
  });

  const isLoading = champLoading || participantsLoading || teamsLoading;
  const championshipCounty = (championship?.county || tenantCounty || '').trim() || 'Unknown county';
  const showTeamsTab = championship?.category === 'ball_games' || championship?.school_level === 'open';

  const qualifiedParticipants = useMemo(
    () => participants.filter((participant) => participant.is_qualified),
    [participants],
  );

  const rankings = useMemo(() => {
    const map = new Map<string, { schoolId: string; schoolName: string; points: number; results: number; qualifiedCount: number }>();

    for (const participant of participants) {
      const points = getPointsFromPosition(participant.position);
      if (!participant.school_id || points === 0) continue;

      const schoolName = participant.school?.name || participant.school_name || 'Unknown Team';
      const entry = map.get(participant.school_id) || {
        schoolId: participant.school_id,
        schoolName,
        points: 0,
        results: 0,
        qualifiedCount: 0,
      };

      entry.points += points;
      entry.results += 1;
      if (participant.is_qualified) entry.qualifiedCount += 1;
      map.set(participant.school_id, entry);
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.schoolName.localeCompare(b.schoolName);
    });
  }, [participants]);

  const championshipBackLink = championship?.category ? `/category/${championship.category}` : '/';

  if (!championshipId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="font-display text-4xl text-foreground mb-4">Championship Not Found</h1>
          <Link to="/" className="text-secondary hover:underline">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="bg-gradient-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link to={championshipBackLink} className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4" />Back to {championship?.category ? CATEGORY_LABELS[championship.category] : 'Home'}
          </Link>

          {isLoading ? (
            <div className="py-8"><Loader2 className="w-8 h-8 animate-spin text-secondary" /></div>
          ) : championship ? (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge className="bg-secondary text-secondary-foreground">{LEVEL_LABELS[championship.level]}</Badge>
                <Badge variant="outline" className="border-white/30 text-white">{championshipCounty}</Badge>
                <Badge variant="outline" className="border-white/30 text-white">{SCHOOL_LEVEL_LABELS[championship.school_level]}</Badge>
              </div>
              <h1 className="font-display text-4xl md:text-5xl tracking-wider">{championship.name}</h1>
              <div className="flex flex-wrap gap-3 mt-4 text-white/80">
                <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formatDateRange(championship.start_date, championship.end_date)}</span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" />{championship.location || 'Location to be confirmed'}</span>
                <span className="inline-flex items-center gap-1.5"><Trophy className="w-4 h-4" />{championshipCounty}</span>
              </div>
            </>
          ) : (
            <h1 className="font-display text-4xl">Championship Not Found</h1>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-secondary" /></div>
        ) : !championship ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">No championship data was found for this page.</p>
          </div>
        ) : (
          <Tabs defaultValue={initialTab} className="space-y-6">
            <TabsList className="flex w-full flex-wrap justify-start gap-2 bg-transparent p-0 h-auto">
              <TabsTrigger value="participants">Participants</TabsTrigger>
              {showTeamsTab && <TabsTrigger value="teams">Teams</TabsTrigger>}
              <TabsTrigger value="rankings">Rankings</TabsTrigger>
              <TabsTrigger value="qualified">Qualified</TabsTrigger>
            </TabsList>

            <TabsContent value="participants" className="space-y-4">
              <ParticipantsTable participants={participants} showGame />
            </TabsContent>

            {showTeamsTab && (
              <TabsContent value="teams" className="space-y-4">
                {teams.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
                    No teams have been registered for this championship yet.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {teams.map((team) => (
                      <div key={team.id} className="rounded-2xl border border-border bg-card p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-display text-xl">{team.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{team.contact_name || 'No contact name'}</p>
                          </div>
                          {team.team_code && <Badge variant="outline">{team.team_code}</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground mt-3 space-y-1">
                          <p>{team.contact_email || 'No email provided'}</p>
                          <p>{team.contact_phone || 'No phone provided'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}

            <TabsContent value="rankings" className="space-y-4">
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Pos</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                      <TableHead className="text-right">Results</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                          No rankings available yet.
                        </TableCell>
                      </TableRow>
                    ) : rankings.map((entry, index) => (
                      <TableRow key={entry.schoolId}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div className="font-medium">{entry.schoolName}</div>
                          <div className="text-xs text-muted-foreground">{entry.qualifiedCount} qualified results</div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-secondary">{entry.points}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{entry.results}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="qualified" className="space-y-4">
              {qualifiedParticipants.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
                  No qualified participants yet.
                </div>
              ) : (
                <ParticipantsTable participants={qualifiedParticipants} showGame />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default ChampionshipView;
