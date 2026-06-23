import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminWrite } from "@/integrations/admin/adminWrite";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { Trophy, Users, DollarSign, Plus, Trash2, CheckCircle2 } from "lucide-react";

interface Championship { id: string; name: string; school_level: string; level: string; }
interface Team { id: string; championship_id: string; name: string; team_code: string | null; team_color: string | null; contact_name: string | null; contact_email: string | null; contact_phone: string | null; }
interface Fee { id: string; championship_id: string; name: string; description: string | null; amount_kes: number; is_required: boolean; }
interface Payment { id: string; team_id: string; fee_id: string; championship_id: string; amount_kes: number; status: string; paystack_reference?: string | null; paid_at: string | null; }

export function OpenTournamentPanel({ scopedChampionshipId }: { scopedChampionshipId?: string | null }) {
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [selectedCh, setSelectedCh] = useState<string>("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Forms
  const [newTeam, setNewTeam] = useState({ name: "", team_code: "", team_color: "", contact_name: "", contact_email: "", contact_phone: "" });
  const [newFee, setNewFee] = useState({ name: "", description: "", amount_kes: "", is_required: true });

  const loadAll = async () => {
    const { data: ch } = await supabase.from("championships")
      .select("id, name, school_level, level")
      .eq("school_level", "open")
      .order("created_at", { ascending: false });
    let chList = (ch as Championship[]) || [];
    if (scopedChampionshipId) chList = chList.filter(c => c.id === scopedChampionshipId);
    setChampionships(chList);
    if (!selectedCh && chList.length) setSelectedCh(chList[0].id);
  };

  const loadForCh = async (id: string) => {
    if (!id) return;
    const [t, f, p] = await Promise.all([
      supabase.from("tournament_teams").select("*").eq("championship_id", id).order("name"),
      supabase.from("championship_fees").select("*").eq("championship_id", id).order("created_at"),
      supabase.from("public_team_fee_payments").select("*").eq("championship_id", id),
    ]);
    setTeams((t.data as Team[]) || []);
    setFees((f.data as Fee[]) || []);
    setPayments((p.data as Payment[]) || []);
  };

  useEffect(() => { loadAll(); }, [scopedChampionshipId]);
  useEffect(() => { if (selectedCh) loadForCh(selectedCh); }, [selectedCh]);

  const addTeam = async () => {
    if (!newTeam.name.trim() || !selectedCh) return;
    try {
      await adminWrite("tournament_teams", "insert", {
        values: { ...newTeam, championship_id: selectedCh },
      });
      toast({ title: "Team added" });
      setNewTeam({ name: "", team_code: "", team_color: "", contact_name: "", contact_email: "", contact_phone: "" });
      loadForCh(selectedCh);
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const deleteTeam = async (id: string) => {
    if (!confirm("Delete team?")) return;
    try {
      await adminWrite("tournament_teams", "delete", { match: { id } });
      loadForCh(selectedCh);
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const addFee = async () => {
    const amt = parseInt(newFee.amount_kes);
    if (!newFee.name.trim() || !amt || amt < 0 || !selectedCh) {
      toast({ title: "Provide name and valid amount", variant: "destructive" });
      return;
    }
    try {
      await adminWrite("championship_fees", "insert", {
        values: {
          championship_id: selectedCh,
          name: newFee.name.trim(),
          description: newFee.description.trim() || null,
          amount_kes: amt,
          is_required: newFee.is_required,
        },
      });
      toast({ title: "Fee added" });
      setNewFee({ name: "", description: "", amount_kes: "", is_required: true });
      loadForCh(selectedCh);
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const deleteFee = async (id: string) => {
    if (!confirm("Delete fee?")) return;
    try {
      await adminWrite("championship_fees", "delete", { match: { id } });
      loadForCh(selectedCh);
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const markPaid = async (teamId: string, fee: Fee) => {
    try {
      const existing = payments.find(p => p.team_id === teamId && p.fee_id === fee.id);
      if (existing) {
        await adminWrite("team_fee_payments", "update", {
          values: { status: "paid", paid_at: new Date().toISOString() },
          match: { id: existing.id },
        });
      } else {
        await adminWrite("team_fee_payments", "insert", {
          values: {
            team_id: teamId,
            fee_id: fee.id,
            championship_id: selectedCh,
            amount_kes: fee.amount_kes,
            status: "paid",
            paid_at: new Date().toISOString(),
          },
        });
      }
      toast({ title: "Marked paid" });
      loadForCh(selectedCh);
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const paymentStatus = (teamId: string, feeId: string): string => {
    return payments.find(p => p.team_id === teamId && p.fee_id === feeId)?.status || "pending";
  };

  const totalCollected = payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount_kes, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5" />Open Tournament Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium">Championship:</label>
            <Select value={selectedCh} onValueChange={setSelectedCh}>
              <SelectTrigger className="w-80"><SelectValue placeholder="Select championship" /></SelectTrigger>
              <SelectContent>
                {championships.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} ({c.school_level} · {c.level})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="ml-auto">
              <DollarSign className="w-3 h-3 mr-1" />Collected: KES {totalCollected.toLocaleString()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {selectedCh && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Fees */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><DollarSign className="w-4 h-4" />Fee Items ({fees.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 p-3 bg-muted/40 rounded">
                <Input placeholder="Fee name (e.g., Registration)" value={newFee.name} onChange={e => setNewFee({ ...newFee, name: e.target.value })} />
                <Input placeholder="Amount (KES)" type="number" value={newFee.amount_kes} onChange={e => setNewFee({ ...newFee, amount_kes: e.target.value })} />
                <Textarea placeholder="What is this fee for?" value={newFee.description} onChange={e => setNewFee({ ...newFee, description: e.target.value })} rows={2} />
                <Button size="sm" onClick={addFee}><Plus className="w-4 h-4 mr-1" />Add Fee</Button>
              </div>
              {fees.map(f => (
                <div key={f.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium text-sm">{f.name} <Badge variant="outline" className="ml-2">KES {f.amount_kes.toLocaleString()}</Badge></div>
                    {f.description && <div className="text-xs text-muted-foreground">{f.description}</div>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteFee(f.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Teams */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Users className="w-4 h-4" />Teams ({teams.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 p-3 bg-muted/40 rounded">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Team name *" value={newTeam.name} onChange={e => setNewTeam({ ...newTeam, name: e.target.value })} />
                  <Input placeholder="Code (3-4 letters)" value={newTeam.team_code} onChange={e => setNewTeam({ ...newTeam, team_code: e.target.value.toUpperCase() })} maxLength={4} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Contact name" value={newTeam.contact_name} onChange={e => setNewTeam({ ...newTeam, contact_name: e.target.value })} />
                  <Input placeholder="Contact phone" value={newTeam.contact_phone} onChange={e => setNewTeam({ ...newTeam, contact_phone: e.target.value })} />
                </div>
                <Input placeholder="Contact email" type="email" value={newTeam.contact_email} onChange={e => setNewTeam({ ...newTeam, contact_email: e.target.value })} />
                <Button size="sm" onClick={addTeam}><Plus className="w-4 h-4 mr-1" />Add Team</Button>
              </div>
              {teams.map(t => (
                <div key={t.id} className="p-2 border rounded">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{t.name} {t.team_code && <Badge variant="outline" className="ml-1">{t.team_code}</Badge>}</div>
                    <Button size="sm" variant="ghost" onClick={() => deleteTeam(t.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  {t.contact_name && <div className="text-xs text-muted-foreground">{t.contact_name} · {t.contact_phone}</div>}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Payment matrix */}
          {teams.length > 0 && fees.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Payments Matrix</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team</TableHead>
                      {fees.map(f => <TableHead key={f.id}>{f.name}<br /><span className="text-xs font-normal">KES {f.amount_kes.toLocaleString()}</span></TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teams.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        {fees.map(f => {
                          const status = paymentStatus(t.id, f.id);
                          return (
                            <TableCell key={f.id}>
                              {status === "paid" ? (
                                <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" />Paid</Badge>
                              ) : (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markPaid(t.id, f)}>Mark Paid</Button>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
