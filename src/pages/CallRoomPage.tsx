import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useChampionships } from '@/hooks/useChampionships';
import { useGames } from '@/hooks/useGames';
import { useParticipants } from '@/hooks/useParticipants';
import { useAdmin } from '@/contexts/AdminContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, CheckCircle2, XCircle, ListChecks, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import {
  GENDER_LABELS,
  PARTICIPANT_STATUS_LABELS,
  type ParticipantStatus,
} from '@/types/database';

const STATUS_COLOR: Record<ParticipantStatus, string> = {
  registered: 'bg-muted text-foreground',
  called: 'bg-blue-100 text-blue-700',
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  advanced: 'bg-purple-100 text-purple-700',
};

export default function CallRoomPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { championshipId: adminChampionshipId } = useAdmin();
  const { data: championships = [] } = useChampionships(true, adminChampionshipId ?? undefined);
  const { data: games = [] } = useGames(undefined, true, adminChampionshipId ?? undefined);
  const { data: participants = [] } = useParticipants(undefined, true, adminChampionshipId ?? undefined);

  const [championshipId, setChampionshipId] = useState<string>(adminChampionshipId ?? '');
  const [dayFilter, setDayFilter] = useState<string>('all');

  useEffect(() => {
    if (adminChampionshipId) {
      setChampionshipId(adminChampionshipId);
    }
  }, [adminChampionshipId]);

  const champGames = useMemo(
    () => games.filter(g => g.championship_id === championshipId && g.category === 'athletics'),
    [games, championshipId]
  );

  // Group games by scheduled day
  const gamesByDay = useMemo(() => {
    const map = new Map<string, typeof champGames>();
    champGames.forEach(g => {
      const key = g.scheduled_date || 'unscheduled';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [champGames]);

  const visibleDays = dayFilter === 'all' ? gamesByDay : gamesByDay.filter(([d]) => d === dayFilter);

  // Per-game stats
  const gameStats = (gameId: string) => {
    const ps = participants.filter(p => p.game_id === gameId);
    const total = ps.length;
    const called = ps.filter(p => p.status && p.status !== 'registered').length;
    const present = ps.filter(p => p.status === 'present' || p.status === 'advanced').length;
    const absent = ps.filter(p => p.status === 'absent').length;
    return { total, called, present, absent, remaining: total - called };
  };

  // Championship-wide counters
  const champCounters = useMemo(() => {
    const totalGames = champGames.length;
    let seeded = 0;
    let throughCallRoom = 0;
    champGames.forEach(g => {
      const ps = participants.filter(p => p.game_id === g.id);
      if (ps.length > 0) seeded++;
      if (ps.length > 0 && ps.every(p => p.status && p.status !== 'registered')) throughCallRoom++;
    });
    return {
      totalGames,
      seeded,
      throughCallRoom,
      remaining: totalGames - throughCallRoom,
    };
  }, [champGames, participants]);

  const updateStatus = async (id: string, status: ParticipantStatus) => {
    const { error } = await supabase.from('participants').update({ status }).eq('id', id);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success(`Marked ${PARTICIPANT_STATUS_LABELS[status]}`);
    queryClient.invalidateQueries({ queryKey: ['participants'] });
  };

  const [openGameId, setOpenGameId] = useState<string | null>(null);
  const openGameParticipants = useMemo(
    () => openGameId ? participants.filter(p => p.game_id === openGameId) : [],
    [openGameId, participants]
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Call Room</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-sm font-medium">Championship</label>
            <Select value={championshipId} onValueChange={(v) => { setChampionshipId(v); setDayFilter('all'); }}>
              <SelectTrigger className="w-72"><SelectValue placeholder="Select championship" /></SelectTrigger>
              <SelectContent>
                {championships.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {gamesByDay.length > 1 && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Day</label>
              <Select value={dayFilter} onValueChange={setDayFilter}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All days</SelectItem>
                  {gamesByDay.map(([d]) => (
                    <SelectItem key={d} value={d}>{d === 'unscheduled' ? 'Unscheduled' : d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {championshipId && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4"><p className="text-xs text-muted-foreground">Total events</p><p className="text-2xl font-bold">{champCounters.totalGames}</p></Card>
            <Card className="p-4"><p className="text-xs text-muted-foreground">Seeded</p><p className="text-2xl font-bold text-blue-600">{champCounters.seeded}</p></Card>
            <Card className="p-4"><p className="text-xs text-muted-foreground">Through Call Room</p><p className="text-2xl font-bold text-green-600">{champCounters.throughCallRoom}</p></Card>
            <Card className="p-4"><p className="text-xs text-muted-foreground">Remaining</p><p className="text-2xl font-bold text-orange-600">{champCounters.remaining}</p></Card>
          </div>
        )}

        {!championshipId && (
          <div className="text-center py-16 text-muted-foreground">Select a championship to begin.</div>
        )}

        {championshipId && visibleDays.map(([day, dayGames]) => (
          <section key={day} className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CalendarDays className="w-5 h-5 text-primary" />
              {day === 'unscheduled' ? 'Unscheduled events' : day}
              <Badge variant="outline">{dayGames.length} events</Badge>
            </h2>
            <div className="grid gap-2">
              {dayGames.map(g => {
                const s = gameStats(g.id);
                return (
                  <Card key={g.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{g.name} <span className="text-xs text-muted-foreground">({GENDER_LABELS[g.gender]})</span></p>
                      <p className="text-xs text-muted-foreground">
                        {s.total} registered · {s.called} called · {s.present} present · {s.absent} absent
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setOpenGameId(g.id === openGameId ? null : g.id)}>
                      {openGameId === g.id ? 'Close' : 'Open'}
                    </Button>
                  </Card>
                );
              })}
            </div>
            {openGameId && dayGames.find(g => g.id === openGameId) && (
              <Card className="p-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bib</TableHead>
                      <TableHead>Athlete</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openGameParticipants.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No registered athletes</TableCell></TableRow>
                    )}
                    {openGameParticipants.map(p => {
                      const status = (p.status || 'registered') as ParticipantStatus;
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono">{p.bib_number || '—'}</TableCell>
                          <TableCell>{p.first_name} {p.last_name}</TableCell>
                          <TableCell>{p.school?.name || p.school_name || '—'}</TableCell>
                          <TableCell><Badge className={STATUS_COLOR[status]}>{PARTICIPANT_STATUS_LABELS[status]}</Badge></TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button size="sm" variant="outline" onClick={() => updateStatus(p.id, 'present')}>
                              <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" /> Present
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => updateStatus(p.id, 'absent')}>
                              <XCircle className="w-3 h-3 mr-1 text-red-600" /> No-show
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground mt-2">
                  Athletes marked as no-show are excluded from results and won't proceed to the next stage.
                </p>
              </Card>
            )}
          </section>
        ))}

        {championshipId && (
          <div className="pt-4 border-t">
            <Link to={`/bib-ranges?championship=${championshipId}`} className="text-sm text-primary hover:underline">
              Manage school bib ranges →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
