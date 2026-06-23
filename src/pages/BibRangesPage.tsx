import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useChampionships } from '@/hooks/useChampionships';
import { useSchools } from '@/hooks/useSchools';
import { useAdmin } from '@/contexts/AdminContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Hash, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface BibRange {
  id: string;
  championship_id: string;
  school_id: string;
  range_start: number;
  range_end: number;
}

export default function BibRangesPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const { championshipId: adminChampionshipId } = useAdmin();
  const { data: championships = [] } = useChampionships(true, adminChampionshipId ?? undefined);
  const { data: schools = [] } = useSchools(true, adminChampionshipId ?? undefined);

  const [championshipId, setChampionshipId] = useState<string>(params.get('championship') || adminChampionshipId || '');
  const [draft, setDraft] = useState<{ school_id: string; range_start: string; range_end: string }>({ school_id: '', range_start: '', range_end: '' });

  useEffect(() => {
    if (adminChampionshipId) {
      setChampionshipId(adminChampionshipId);
    }
  }, [adminChampionshipId]);

  const { data: ranges = [], refetch } = useQuery({
    queryKey: ['school_bib_ranges', championshipId],
    enabled: !!championshipId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_bib_ranges')
        .select('*')
        .eq('championship_id', championshipId);
      if (error) throw error;
      return data as BibRange[];
    },
  });

  useEffect(() => {
    setDraft({ school_id: '', range_start: '', range_end: '' });
  }, [championshipId]);

  const schoolName = (id: string) => schools.find(s => s.id === id)?.name || id;

  const handleSave = async () => {
    if (!championshipId || !draft.school_id) { toast.error('Select championship and team'); return; }
    const start = parseInt(draft.range_start);
    const end = parseInt(draft.range_end);
    if (isNaN(start) || isNaN(end) || end < start) { toast.error('Invalid range'); return; }

    const { error } = await supabase.from('school_bib_ranges').upsert({
      championship_id: championshipId,
      school_id: draft.school_id,
      range_start: start,
      range_end: end,
    }, { onConflict: 'championship_id,school_id' });
    if (error) { toast.error(error.message); return; }
    toast.success('Bib range saved');
    setDraft({ school_id: '', range_start: '', range_end: '' });
    refetch();
    queryClient.invalidateQueries({ queryKey: ['school_bib_ranges'] });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('school_bib_ranges').delete().eq('id', id);
    if (error) { toast.error('Failed'); return; }
    toast.success('Removed');
    refetch();
    queryClient.invalidateQueries({ queryKey: ['school_bib_ranges'] });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Hash className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">School Bib Ranges</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Reserve a unique number range per school per championship (e.g. School A 1–100, School B 101–200).
          Bibs auto-suggest from these ranges when registering athletes.
        </p>

        <div className="space-y-1 max-w-md">
          <label className="text-sm font-medium">Championship</label>
          <Select value={championshipId} onValueChange={setChampionshipId}>
            <SelectTrigger><SelectValue placeholder="Select championship" /></SelectTrigger>
            <SelectContent>
              {championships.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {championshipId && (
          <>
            <Card className="p-4 space-y-3">
              <p className="font-medium">Add / update range</p>
              <div className="grid md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-sm">Team</label>
                  <Select value={draft.school_id} onValueChange={(v) => setDraft(d => ({ ...d, school_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                    <SelectContent>
                      {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm">Range start</label>
                  <Input type="number" min="1" value={draft.range_start} onChange={(e) => setDraft(d => ({ ...d, range_start: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm">Range end</label>
                  <Input type="number" min="1" value={draft.range_end} onChange={(e) => setDraft(d => ({ ...d, range_end: e.target.value }))} />
                </div>
                <Button onClick={handleSave}><Save className="w-4 h-4 mr-1" /> Save</Button>
              </div>
            </Card>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranges.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No ranges defined yet</TableCell></TableRow>
                  )}
                  {ranges.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{schoolName(r.school_id)}</TableCell>
                      <TableCell className="font-mono">{r.range_start}</TableCell>
                      <TableCell className="font-mono">{r.range_end}</TableCell>
                      <TableCell>{r.range_end - r.range_start + 1}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
