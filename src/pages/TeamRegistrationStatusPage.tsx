import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar, Loader2, MapPin, Search, Users, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Championship, LEVEL_LABELS, SCHOOL_LEVEL_LABELS } from '@/types/database';

type Team = {
  id: string;
  championship_id: string;
  name: string;
  team_code: string | null;
  team_color: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
};

type Payment = {
  id: string;
  team_id: string;
  fee_id: string;
  championship_id: string;
  amount_kes: number;
  status: string;
  paid_at: string | null;
};

type Fee = {
  id: string;
  championship_id: string;
  name: string;
  amount_kes: number;
  is_required: boolean;
};

export default function TeamRegistrationStatusPage() {
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [selectedChampionshipId, setSelectedChampionshipId] = useState(params.get('championship') || '');

  useEffect(() => {
    (async () => {
      try {
        const [championshipRes, teamRes, paymentRes, feeRes] = await Promise.all([
          supabase
            .from('championships')
            .select('id, name, school_level, level, category, location, start_date, end_date, description, created_at, updated_at')
            .eq('school_level', 'open')
            .order('created_at', { ascending: false }),
          supabase
            .from('tournament_teams')
            .select('id, championship_id, name, team_code, team_color, contact_name, contact_email, contact_phone, notes')
            .order('name', { ascending: true }),
          supabase
            .from('public_team_fee_payments')
            .select('id, team_id, fee_id, championship_id, amount_kes, status, paid_at')
            .order('created_at', { ascending: false }),
          supabase
            .from('championship_fees')
            .select('id, championship_id, name, amount_kes, is_required')
            .order('amount_kes', { ascending: true }),
        ]);

        if (championshipRes.error) throw championshipRes.error;
        if (teamRes.error) throw teamRes.error;
        if (paymentRes.error) throw paymentRes.error;
        if (feeRes.error) throw feeRes.error;

        setChampionships((championshipRes.data || []) as Championship[]);
        setTeams((teamRes.data || []) as Team[]);
        setPayments((paymentRes.data || []) as Payment[]);
        setFees((feeRes.data || []) as Fee[]);
      } catch (error: any) {
        toast.error(error?.message || 'Could not load team registrations');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedChampionship = useMemo(
    () => championships.find((championship) => championship.id === selectedChampionshipId) || null,
    [championships, selectedChampionshipId],
  );

  const championshipFees = useMemo(
    () => fees.filter((fee) => fee.championship_id === selectedChampionshipId),
    [fees, selectedChampionshipId],
  );

  const visibleTeams = useMemo(() => {
    return teams.filter((team) => {
      if (selectedChampionshipId && team.championship_id !== selectedChampionshipId) return false;
      if (!teamSearch.trim()) return true;
      const needle = teamSearch.trim().toLowerCase();
      return [team.name, team.team_code || '', team.contact_name || '', team.contact_email || '']
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [teams, selectedChampionshipId, teamSearch]);

  const teamPayments = useMemo(() => {
    const byTeam = new Map<string, Payment[]>();
    for (const payment of payments) {
      const current = byTeam.get(payment.team_id) || [];
      current.push(payment);
      byTeam.set(payment.team_id, current);
    }
    return byTeam;
  }, [payments]);

  const selectedTeams = useMemo(() => {
    if (!selectedChampionshipId) return visibleTeams;
    return visibleTeams;
  }, [visibleTeams, selectedChampionshipId]);

  const registeredCount = selectedTeams.length;
  const paidCount = selectedTeams.filter((team) => (teamPayments.get(team.id) || []).some((payment) => payment.status === 'paid')).length;

  const handleSelectChampionship = (value: string) => {
    setSelectedChampionshipId(value);
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set('championship', value);
      else next.delete('championship');
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] items-stretch">
          <Card className="border-secondary/40 shadow-xl bg-gradient-to-br from-primary via-primary/95 to-[hsl(var(--navy-dark))] text-primary-foreground overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--secondary)/0.2),transparent_55%)]" />
            <CardHeader className="relative">
              <Badge variant="secondary" className="w-fit">Public Team Registration Status</Badge>
              <CardTitle className="text-3xl md:text-5xl leading-tight">See who’s registered in a championship.</CardTitle>
              <CardDescription className="text-primary-foreground/80 max-w-2xl">
                Choose an open tournament and view the teams that have registered, along with their payment state and contact details.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm p-4">
                <Users className="w-5 h-5 mb-2 text-secondary" />
                <div className="font-semibold">Registered teams</div>
                <div className="text-sm text-primary-foreground/75">All teams submitted for the selected tournament.</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm p-4">
                <ShieldCheck className="w-5 h-5 mb-2 text-secondary" />
                <div className="font-semibold">Payment status</div>
                <div className="text-sm text-primary-foreground/75">See which registrations are paid or pending.</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm p-4">
                <Search className="w-5 h-5 mb-2 text-secondary" />
                <div className="font-semibold">Fast search</div>
                <div className="text-sm text-primary-foreground/75">Search by team, code, or contact person.</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Choose a championship</CardTitle>
              <CardDescription>Filter the public list by tournament.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Select value={selectedChampionshipId || 'all'} onValueChange={(value) => handleSelectChampionship(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={loading ? 'Loading tournaments...' : 'All open tournaments'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All open tournaments</SelectItem>
                    {championships.map((championship) => (
                      <SelectItem key={championship.id} value={championship.id}>{championship.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Input
                  value={teamSearch}
                  onChange={(event) => setTeamSearch(event.target.value)}
                  placeholder="Search team or contact..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="text-xs uppercase text-muted-foreground">Teams</div>
                  <div className="text-3xl font-semibold">{registeredCount}</div>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="text-xs uppercase text-muted-foreground">Paid</div>
                  <div className="text-3xl font-semibold">{paidCount}</div>
                </div>
              </div>

              {selectedChampionship ? (
                <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
                  <div className="font-medium">{selectedChampionship.name}</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{LEVEL_LABELS[selectedChampionship.level]}</Badge>
                    <Badge variant="outline">{SCHOOL_LEVEL_LABELS[selectedChampionship.school_level]}</Badge>
                  </div>
                  {selectedChampionship.location && <div className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedChampionship.location}</div>}
                  {(selectedChampionship.start_date || selectedChampionship.end_date) && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {selectedChampionship.start_date || 'TBA'}{selectedChampionship.end_date ? ` - ${selectedChampionship.end_date}` : ''}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Select a championship to narrow the team list.</p>
              )}

              {selectedChampionshipId && championshipFees.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Published fees</div>
                  <div className="flex flex-wrap gap-2">
                    {championshipFees.map((fee) => (
                      <Badge key={fee.id} variant={fee.is_required ? 'default' : 'outline'}>
                        {fee.name}: KSh {fee.amount_kes.toLocaleString()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-display text-3xl md:text-4xl text-foreground">Registered teams</h2>
              <p className="text-muted-foreground">Public team list for the selected championship.</p>
            </div>
            <Button asChild variant="outline">
              <Link to="/open-tournaments">Back to registration</Link>
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : selectedTeams.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                No teams found for this championship yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {selectedTeams.map((team) => {
                const paymentList = teamPayments.get(team.id) || [];
                const paidPayment = paymentList.find((payment) => payment.status === 'paid');
                const latestPayment = paymentList[0];

                return (
                  <Card key={team.id} className="shadow-md border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-xl">{team.name}</CardTitle>
                          {team.team_code && <CardDescription>Code: {team.team_code}</CardDescription>}
                        </div>
                        <Badge variant={paidPayment ? 'default' : 'secondary'}>{paidPayment ? 'Paid' : latestPayment ? latestPayment.status : 'Pending'}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1 text-sm">
                        {team.contact_name && <div><span className="font-medium">Contact:</span> {team.contact_name}</div>}
                        {team.contact_email && <div><span className="font-medium">Email:</span> {team.contact_email}</div>}
                        {team.contact_phone && <div><span className="font-medium">Phone:</span> {team.contact_phone}</div>}
                        {team.team_color && <div><span className="font-medium">Colour:</span> {team.team_color}</div>}
                        {team.notes && <div><span className="font-medium">Notes:</span> {team.notes}</div>}
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                        <div className="font-medium">Payment summary</div>
                        {paymentList.length > 0 ? (
                          paymentList.map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between gap-3">
                              <span>KSh {payment.amount_kes.toLocaleString()}</span>
                              <Badge variant={payment.status === 'paid' ? 'default' : 'outline'}>{payment.status}</Badge>
                            </div>
                          ))
                        ) : (
                          <div className="text-muted-foreground">No payment recorded yet.</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
