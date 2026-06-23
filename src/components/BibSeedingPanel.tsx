import { useEffect, useMemo, useState } from 'react';
import { useChampionships } from '@/hooks/useChampionships';
import { useGames } from '@/hooks/useGames';
import { useParticipants, useUpdateParticipant } from '@/hooks/useParticipants';
import { useAdmin } from '@/contexts/AdminContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Hash, Sparkles, Printer, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Participant } from '@/types/database';
import { devError } from '@/lib/dev';

/**
 * SRS §4.4 (Bib Numbers) + §4.6 (Seeding)
 *
 * Auto-generates a unique bib number per athlete within a championship,
 * lets admins enter personal best times, and seeds athletes by personal
 * best (fastest first) for IAAF-style heat ordering. Also exports a
 * printable bib sheet PDF.
 */
export const BibSeedingPanel = () => {
  const { championshipId: adminChampionshipId } = useAdmin();
  const { data: championships = [] } = useChampionships(true, adminChampionshipId ?? undefined);
  const { data: games = [] } = useGames(undefined, true, adminChampionshipId ?? undefined);
  const { data: participants = [], isLoading } = useParticipants(undefined, true, adminChampionshipId ?? undefined);
  const updateParticipant = useUpdateParticipant();

  const [championshipId, setChampionshipId] = useState<string>(adminChampionshipId ?? '');
  const [gameId, setGameId] = useState<string>('');
  const [working, setWorking] = useState(false);
  const [pbDraft, setPbDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (adminChampionshipId) {
      setChampionshipId(adminChampionshipId);
    }
  }, [adminChampionshipId]);

  const championshipGames = useMemo(
    () => games.filter((g) => g.championship_id === championshipId),
    [games, championshipId],
  );

  const championshipParticipants = useMemo(() => {
    if (!championshipId) return [];
    const gameIds = new Set(championshipGames.map((g) => g.id));
    return participants.filter((p) => gameIds.has(p.game_id));
  }, [participants, championshipGames, championshipId]);

  const visibleParticipants = useMemo(() => {
    if (!gameId) return championshipParticipants;
    return championshipParticipants.filter((p) => p.game_id === gameId);
  }, [championshipParticipants, gameId]);

  const handleAutoBib = async () => {
    if (!championshipId) {
      toast.error('Pick a championship first');
      return;
    }
    setWorking(true);
    try {
      // Determine starting bib number: existing max + 1, or 1
      const existingNumbers = championshipParticipants
        .map((p) => Number(p.bib_number))
        .filter((n) => Number.isFinite(n) && n > 0);
      let next = existingNumbers.length ? Math.max(...existingNumbers) + 1 : 1;

      const targets = championshipParticipants.filter((p) => !p.bib_number);
      if (targets.length === 0) {
        toast.info('All athletes already have bib numbers');
        return;
      }

      // Sort by school then name for stable assignment
      const ordered = [...targets].sort((a, b) => {
        const s = (a.school?.name || '').localeCompare(b.school?.name || '');
        if (s !== 0) return s;
        return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      });

      for (const p of ordered) {
        const padded = String(next).padStart(4, '0');
        await updateParticipant.mutateAsync({
          id: p.id,
          bib_number: padded,
        } as Partial<Participant> & { id: string });
        next += 1;
      }
      toast.success(`Assigned bib numbers to ${ordered.length} athletes`);
    } catch (err) {
      devError(err);
      toast.error('Failed to assign bib numbers');
    } finally {
      setWorking(false);
    }
  };

  const handleSeedByPB = async () => {
    if (!gameId) {
      toast.error('Pick a specific event to seed');
      return;
    }
    setWorking(true);
    try {
      // Sort by personal best ascending (fastest first); athletes without PB go last
      const sorted = [...visibleParticipants].sort((a, b) => {
        const pa = a.personal_best ?? Number.POSITIVE_INFINITY;
        const pb = b.personal_best ?? Number.POSITIVE_INFINITY;
        return pa - pb;
      });
      for (let i = 0; i < sorted.length; i += 1) {
        await updateParticipant.mutateAsync({
          id: sorted[i].id,
          position: i + 1,
        } as Partial<Participant> & { id: string });
      }
      toast.success(`Seeded ${sorted.length} athletes by personal best`);
    } catch (err) {
      devError(err);
      toast.error('Failed to seed athletes');
    } finally {
      setWorking(false);
    }
  };

  const handleSavePb = async (id: string) => {
    const raw = pbDraft[id];
    if (raw === undefined) return;
    const value = raw.trim() === '' ? null : Number(raw);
    if (value !== null && !Number.isFinite(value)) {
      toast.error('Personal best must be a number');
      return;
    }
    try {
      await updateParticipant.mutateAsync({
        id,
        personal_best: value,
      } as Partial<Participant> & { id: string });
      toast.success('Personal best saved');
      setPbDraft((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } catch {
      toast.error('Failed to save personal best');
    }
  };

  const handlePrintBibSheet = () => {
    if (visibleParticipants.length === 0) return;
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const champ = championships.find((c) => c.id === championshipId);
      const selectedGame = games.find((g) => g.id === gameId);

      const rows = visibleParticipants
        .slice()
        .sort((a, b) => {
          const an = Number(a.bib_number) || 0;
          const bn = Number(b.bib_number) || 0;
          return an - bn;
        })
        .map((p) => [
          p.bib_number || '—',
          `${p.first_name} ${p.last_name}`,
          p.game?.name || '—',
          p.school?.name || p.school_name || '—',
          p.gender,
        ]);

      autoTable(pdf, {
        startY: selectedGame ? 44 : 38,
        head: [['Bib', 'Athlete', 'Event', 'Team / School', 'Gender']],
        body: rows,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        },
        didDrawPage: () => {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(13);
          pdf.text('ZARODA SPORTS — BIB SHEET', 14, 14);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.text(`Championship: ${champ?.name || '—'}`, 14, 22);
          if (selectedGame) {
            pdf.text(`Event: ${selectedGame.name}`, 14, 30);
          }
        },
      });

      pdf.save('zaroda-bib-sheet.pdf');
    } catch (err) {
      devError(err);
      toast.error('Failed to generate bib sheet');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={championshipId || 'none'} onValueChange={(v) => setChampionshipId(v === 'none' ? '' : v)}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Select championship" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select championship</SelectItem>
            {championships.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={gameId || 'all'} onValueChange={(v) => setGameId(v === 'all' ? '' : v)} disabled={!championshipId}>
          <SelectTrigger className="w-72"><SelectValue placeholder="All events" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            {championshipGames.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex flex-wrap gap-2">
          <Button onClick={handleAutoBib} disabled={!championshipId || working}>
            <Hash className="w-4 h-4 mr-1" />
            Auto-assign Bibs
          </Button>
          <Button variant="secondary" onClick={handleSeedByPB} disabled={!gameId || working}>
            <Sparkles className="w-4 h-4 mr-1" />
            Seed by Personal Best
          </Button>
          <Button variant="outline" onClick={handlePrintBibSheet} disabled={visibleParticipants.length === 0}>
            <Printer className="w-4 h-4 mr-1" />
            Print Bib Sheet
          </Button>
        </div>
      </div>

      {!championshipId ? (
        <div className="text-center py-16 text-muted-foreground">
          Select a championship to manage bib numbers and seeding.
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : visibleParticipants.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No athletes registered for this selection yet.</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Bib</TableHead>
                <TableHead>Athlete</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Team / School</TableHead>
                <TableHead className="w-44">Personal Best</TableHead>
                <TableHead className="w-20 text-center">Seed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleParticipants.map((p) => {
                const pbValue =
                  pbDraft[p.id] !== undefined
                    ? pbDraft[p.id]
                    : p.personal_best != null
                    ? String(p.personal_best)
                    : '';
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono font-bold">
                      {p.bib_number || <Badge variant="outline">unassigned</Badge>}
                    </TableCell>
                    <TableCell>{p.first_name} {p.last_name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.game?.name || '—'}</TableCell>
                    <TableCell>{p.school?.name || p.school_name || '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={pbValue}
                          onChange={(e) => setPbDraft((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          placeholder="e.g. 11.42"
                          className="h-8"
                        />
                        {pbDraft[p.id] !== undefined && (
                          <Button size="sm" variant="secondary" onClick={() => handleSavePb(p.id)}>
                            Save
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold">{p.position || '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
