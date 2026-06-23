import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Championship, LEVEL_LABELS, SCHOOL_LEVEL_LABELS } from '@/types/database';
import { Calendar, Loader2, MapPin, ShieldCheck, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';

type OpenFee = {
  id: string;
  championship_id: string;
  name: string;
  description: string | null;
  amount_kes: number;
  is_required: boolean;
};

type RegistrationForm = {
  team_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
  fee_id: string;
};

const emptyForm: RegistrationForm = {
  team_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  notes: '',
  fee_id: '',
};

export default function OpenTournamentsPage() {
  const [loading, setLoading] = useState(true);
  const [submittingFor, setSubmittingFor] = useState<string | null>(null);
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [fees, setFees] = useState<OpenFee[]>([]);
  const [selectedChampionshipId, setSelectedChampionshipId] = useState('');
  const [form, setForm] = useState<RegistrationForm>(emptyForm);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: championshipData, error: championshipError }, { data: feeData, error: feeError }] = await Promise.all([
          supabase
            .from('championships')
            .select('id, name, school_level, level, category, location, start_date, end_date, description, created_at, updated_at')
            .eq('school_level', 'open')
            .order('start_date', { ascending: true, nullsFirst: false }),
          supabase
            .from('championship_fees')
            .select('id, championship_id, name, description, amount_kes, is_required')
            .order('amount_kes', { ascending: true }),
        ]);

        if (championshipError) throw championshipError;
        if (feeError) throw feeError;

        setChampionships((championshipData || []) as Championship[]);
        setFees((feeData || []) as OpenFee[]);
      } catch (error: any) {
        toast.error(error?.message || 'Could not load open tournaments');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedChampionship = useMemo(
    () => championships.find((championship) => championship.id === selectedChampionshipId) || null,
    [championships, selectedChampionshipId],
  );

  const selectedFees = useMemo(
    () => fees.filter((fee) => fee.championship_id === selectedChampionshipId),
    [fees, selectedChampionshipId],
  );

  useEffect(() => {
    if (!selectedChampionshipId) {
      setForm((current) => ({ ...current, fee_id: '' }));
      return;
    }
    if (selectedFees.length === 0) {
      setForm((current) => ({ ...current, fee_id: '' }));
      return;
    }
    if (!selectedFees.some((fee) => fee.id === form.fee_id)) {
      const requiredFee = selectedFees.find((fee) => fee.is_required) || selectedFees[0];
      setForm((current) => ({ ...current, fee_id: requiredFee?.id || '' }));
    }
  }, [form.fee_id, selectedChampionshipId, selectedFees]);

  const openChampionshipFees = useMemo(() => {
    const byChampionship = new Map<string, OpenFee[]>();
    for (const fee of fees) {
      const current = byChampionship.get(fee.championship_id) || [];
      current.push(fee);
      byChampionship.set(fee.championship_id, current);
    }
    return byChampionship;
  }, [fees]);

  const startCheckout = async () => {
    if (!selectedChampionship) {
      toast.error('Select an open tournament first');
      return;
    }
    if (!form.fee_id) {
      toast.error('Select a registration fee');
      return;
    }
    if (!form.team_name.trim() || !form.contact_name.trim() || !form.contact_email.trim()) {
      toast.error('Team name, contact name and contact email are required');
      return;
    }

    setSubmittingFor(selectedChampionship.id);
    try {
      const { data, error } = await supabase.functions.invoke('initialize-payment', {
        body: {
          mode: 'team_fee',
          championship_id: selectedChampionship.id,
          fee_id: form.fee_id,
          team_name: form.team_name,
          contact_name: form.contact_name,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
          notes: form.notes,
        },
      });
      if (error) throw error;
      if (!data?.authorization_url) throw new Error('No payment link returned');
      window.location.href = data.authorization_url;
    } catch (error: any) {
      toast.error(error?.message || 'Could not start checkout');
      setSubmittingFor(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] items-stretch">
          <div className="col-span-full flex justify-end">
            <Link to="/team-status">
              <Button variant="ghost">View registration status</Button>
            </Link>
          </div>
          <div className="rounded-3xl border border-border bg-gradient-to-br from-primary via-primary/90 to-[hsl(var(--navy-dark))] text-primary-foreground p-8 md:p-10 shadow-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--secondary)/0.25),transparent_55%)]" />
            <div className="relative space-y-4">
              <Badge variant="secondary" className="w-fit">Public Open Tournament Registration</Badge>
              <h1 className="font-display text-4xl md:text-6xl leading-tight">Register a team and pay online.</h1>
              <p className="text-primary-foreground/80 max-w-2xl text-base md:text-lg">
                Browse open tournaments, review the fee structure, and complete checkout through Paystack in one flow.
                Your registration is recorded immediately after payment confirmation.
              </p>
              <div className="grid gap-3 sm:grid-cols-3 pt-4 max-w-2xl">
                <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm p-4">
                  <Users className="w-5 h-5 mb-2 text-secondary" />
                  <div className="font-semibold">Team registration</div>
                  <div className="text-sm text-primary-foreground/75">Capture team and contact details before checkout.</div>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm p-4">
                  <Wallet className="w-5 h-5 mb-2 text-secondary" />
                  <div className="font-semibold">Fee selection</div>
                  <div className="text-sm text-primary-foreground/75">Choose the exact event fee tied to the tournament.</div>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm p-4">
                  <ShieldCheck className="w-5 h-5 mb-2 text-secondary" />
                  <div className="font-semibold">Verified payment</div>
                  <div className="text-sm text-primary-foreground/75">Payments are verified through the existing callback flow.</div>
                </div>
              </div>
            </div>
          </div>

          <Card className="border-secondary/40 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Start registration</CardTitle>
              <CardDescription>Pick a tournament and submit the team details required for checkout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tournament">Open tournament</Label>
                <Select
                  value={selectedChampionshipId}
                  onValueChange={(value) => {
                    setSelectedChampionshipId(value);
                    setForm((current) => ({ ...current, fee_id: '' }));
                  }}
                >
                  <SelectTrigger id="tournament">
                    <SelectValue placeholder={loading ? 'Loading tournaments...' : 'Select a tournament'} />
                  </SelectTrigger>
                  <SelectContent>
                    {championships.map((championship) => (
                      <SelectItem key={championship.id} value={championship.id}>
                        {championship.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fee">Fee structure</Label>
                <Select
                  value={form.fee_id}
                  onValueChange={(value) => setForm((current) => ({ ...current, fee_id: value }))}
                  disabled={!selectedChampionshipId || selectedFees.length === 0}
                >
                  <SelectTrigger id="fee">
                    <SelectValue placeholder={selectedChampionshipId ? 'Select a fee' : 'Choose a tournament first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedFees.map((fee) => (
                      <SelectItem key={fee.id} value={fee.id}>
                        {fee.name} - KSh {fee.amount_kes.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Team name</Label>
                  <Input
                    id="team-name"
                    value={form.team_name}
                    onChange={(event) => setForm((current) => ({ ...current, team_name: event.target.value }))}
                    placeholder="Eagles FC"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Contact person</Label>
                  <Input
                    id="contact-name"
                    value={form.contact_name}
                    onChange={(event) => setForm((current) => ({ ...current, contact_name: event.target.value }))}
                    placeholder="Coach Jane"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Contact email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={form.contact_email}
                    onChange={(event) => setForm((current) => ({ ...current, contact_email: event.target.value }))}
                    placeholder="coach@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Contact phone</Label>
                  <Input
                    id="contact-phone"
                    value={form.contact_phone}
                    onChange={(event) => setForm((current) => ({ ...current, contact_phone: event.target.value }))}
                    placeholder="07xx xxx xxx"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Optional tournament notes, age category, or team notes"
                />
              </div>
            </CardContent>
            <div className="px-6 pb-6 flex flex-col gap-3">
              <Button onClick={startCheckout} disabled={!selectedChampionshipId || submittingFor === selectedChampionshipId}>
                {submittingFor === selectedChampionshipId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Continue to payment
              </Button>
              <p className="text-xs text-muted-foreground">
                After payment verification you will see the team registered in the tournament admin flow.
              </p>
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-display text-3xl md:text-4xl text-foreground">Open tournaments</h2>
            <p className="text-muted-foreground">Public listings with available fee structures.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : championships.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <h3 className="font-display text-2xl mb-2">No open tournaments yet</h3>
                <p className="text-muted-foreground">Open tournament listings will appear here once they are published.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {championships.map((championship) => {
                const championshipFees = openChampionshipFees.get(championship.id) || [];
                return (
                  <Card key={championship.id} className="overflow-hidden border-border shadow-lg">
                    <CardHeader className="bg-muted/30">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-xl">{championship.name}</CardTitle>
                          <CardDescription className="mt-1">Public open tournament</CardDescription>
                        </div>
                        <Badge variant="secondary">Open</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Badge variant="outline">{LEVEL_LABELS[championship.level]}</Badge>
                        <Badge variant="outline">{SCHOOL_LEVEL_LABELS[championship.school_level]}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                      {championship.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{championship.location}</span>
                        </div>
                      )}
                      {(championship.start_date || championship.end_date) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{championship.start_date || 'TBA'}{championship.end_date ? ` - ${championship.end_date}` : ''}</span>
                        </div>
                      )}
                      {championship.description && <p className="text-sm text-muted-foreground">{championship.description}</p>}
                      <div className="space-y-2 pt-2">
                        <div className="text-sm font-medium">Fee structure</div>
                        {championshipFees.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {championshipFees.map((fee) => (
                              <Badge key={fee.id} variant={fee.is_required ? 'default' : 'outline'}>
                                {fee.name}: KSh {fee.amount_kes.toLocaleString()}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No fee structure has been published for this tournament yet.</p>
                        )}
                      </div>
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => {
                          setSelectedChampionshipId(championship.id);
                          const champFees = openChampionshipFees.get(championship.id) || [];
                          const requiredFee = champFees.find((fee) => fee.is_required) || champFees[0];
                          setForm((current) => ({ ...current, fee_id: requiredFee?.id || '' }));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        Register this team
                      </Button>
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
