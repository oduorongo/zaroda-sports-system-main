import { useParticipants } from '@/hooks/useParticipants';
import { useChampionships } from '@/hooks/useChampionships';
import { useMatchPools } from '@/hooks/useMatchPools';
import { Navbar } from '@/components/Navbar';
import {
  CompetitionLevel,
  Gender,
  SchoolLevel,
} from '@/types/database';
import { Loader2, Trophy, Medal, BarChart3, Printer, Download } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { devWarn, devDebug } from '@/lib/dev';

interface TeamScore {
  schoolId: string;
  schoolName: string;
  grandTotal: number;
  primaryScore: number;
  juniorSecondaryScore: number;
  gamesPlayed: number;
  boysScore: number;
  girlsScore: number;
}

type RankingSchoolLevelFilter = 'all' | 'base' | 'primary' | 'junior_secondary';

// Per Zaroda scoring rules, team rankings are calculated STRICTLY from the
// finishing position of each participant: 1st=7, 2nd=5, 3rd=4, 4th=3, 5th=2, 6th=1.
// The `score` column on a participant stores the raw event metric (goals,
// distance, height, points scored in a music adjudication, etc.) and must
// NEVER be summed into the aggregate team total — doing so caused unstable
// rankings because raw values vary wildly per event type.
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

const getParticipantPoints = (_score?: number | null, position?: number | null) => {
  return getPointsFromPosition(position);
};

const hasScoredResult = (_score?: number | null, position?: number | null) => {
  return typeof position === 'number' && position > 0;
};

const OverallRankings = () => {
  const { data: championships = [] } = useChampionships();
  const { data: allMatches = [], isLoading: matchesLoading } = useMatchPools();

  const [championshipFilter, setChampionshipFilter] = useState<string>('');
  const [schoolLevelFilter, setSchoolLevelFilter] = useState<RankingSchoolLevelFilter>('all');
  const [levelFilter, setLevelFilter] = useState<CompetitionLevel | 'all'>('all');
  const [genderFilter, setGenderFilter] = useState<Gender | 'all'>('all');
  const [locationSearch, setLocationSearch] = useState('');

  const selectedChampionship = championshipFilter
    ? championships.find(c => c.id === championshipFilter)
    : null;
  const selectedChampionshipId = selectedChampionship?.id ?? null;
  const { data: participants = [], isLoading: participantsLoading } = useParticipants(
    undefined,
    true,
    selectedChampionshipId ?? undefined,
  );

  const isLoading = participantsLoading || matchesLoading;

  useEffect(() => {
    if (championshipFilter && !championships.some((c) => c.id === championshipFilter)) {
      setChampionshipFilter('');
    }
  }, [championshipFilter, championships]);

  const teamScores = useMemo(() => {
    if (!selectedChampionshipId) return [];

    type Bucket = {
      schoolId: string;
      schoolName: string;
      primaryScore: number;
      juniorSecondaryScore: number;
      combinedScore: number; // points from 'primary_junior' events (counted ONCE in grand total)
      boysScore: number;
      girlsScore: number;
      games: Set<string>;
    };
    const scoreMap = new Map<string, Bucket>();

    const ensure = (schoolId: string, schoolName: string): Bucket => {
      let entry = scoreMap.get(schoolId);
      if (!entry) {
        entry = {
          schoolId,
          schoolName,
          primaryScore: 0,
          juniorSecondaryScore: 0,
          combinedScore: 0,
          boysScore: 0,
          girlsScore: 0,
          games: new Set(),
        };
        scoreMap.set(schoolId, entry);
      }
      return entry;
    };

    const passesGameFilters = (game: {
      championship_id?: string | null;
      school_level?: string | null;
      level?: string | null;
    }) => {
      if (game.championship_id !== selectedChampionshipId) return false;
      // 'primary_junior' is a combined category used by championships that mix
      // primary and junior-secondary events into a single competition. It must
      // pass through whichever single-level filter the user picks so its
      // results are not silently dropped from sub-county / zone totals.
      if (schoolLevelFilter !== 'all' && game.school_level !== schoolLevelFilter && game.school_level !== 'primary_junior') return false;
      if (levelFilter !== 'all' && game.level !== levelFilter) return false;
      return true;
    };

    // Add points to the correct display column. Combined 'primary_junior'
    // events are credited to BOTH Primary and Jr. Sec columns so they appear
    // under either single-level filter, but tracked separately so the Grand
    // Total only counts each combined event ONCE (not twice).
    const addLevelPoints = (entry: Bucket, schoolLevel: string | null | undefined, points: number) => {
      if (schoolLevel === 'primary') entry.primaryScore += points;
      else if (schoolLevel === 'junior_secondary') entry.juniorSecondaryScore += points;
      else if (schoolLevel === 'primary_junior') {
        entry.primaryScore += points;
        entry.juniorSecondaryScore += points;
        entry.combinedScore += points;
      }
    };

    // ============================================================
    // DEDUPLICATION GUARDS
    // ============================================================
    // 1. seenParticipantIds — skip the SAME participant row appearing twice
    //    (defensive guard against any duplicate rows from the API).
    // 2. seenSlot — skip duplicate result entries for the SAME school+game+
    //    gender+position combo (data-entry error: e.g. two athletes both
    //    recorded as "1st" for the same school in the same race). The first
    //    valid entry wins; subsequent duplicates are ignored.
    const seenParticipantIds = new Set<string>();
    const seenSlot = new Set<string>();

    // ============================================================
    // 1) ATHLETICS / INDIVIDUAL EVENTS — every placing athlete (positions 1-6)
    //    earns points for their school. A school with athletes finishing 1st,
    //    2nd, and 4th in the same race earns 7 + 5 + 3 = 15 points for that
    //    race. This matches standard athletics championship scoring.
    // ============================================================
    for (const p of participants) {
      if (seenParticipantIds.has(p.id)) {
        devWarn(`[Rankings] Duplicate participant ID skipped: ${p.id}`);
        continue;
      }
      seenParticipantIds.add(p.id);

      if (!p.game) continue;
      if (!passesGameFilters(p.game)) continue;
      if (genderFilter !== 'all' && p.gender !== genderFilter) continue;
      if (!p.position || p.position < 1 || p.position > 6) continue;

      // Prevent the same scoring slot (school + game + gender + position) from
      // being awarded twice when results are accidentally entered twice.
      const slotKey = `${p.game_id}|${p.gender}|${p.school_id}|${p.position}`;
      if (seenSlot.has(slotKey)) {
        devWarn(
          `[Rankings] Duplicate slot skipped: school=${p.school_id} game=${p.game.name ?? p.game_id} gender=${p.gender} position=${p.position}`,
        );
        continue;
      }
      seenSlot.add(slotKey);

      const points = getPointsFromPosition(p.position);
      if (points === 0) continue;

      const schoolName = p.school?.name || p.school_name || 'Unknown Team';
      const entry = ensure(p.school_id, schoolName);
      entry.games.add(p.game_id);
      addLevelPoints(entry, p.game.school_level, points);
      if (p.gender === 'boys') entry.boysScore += points;
      else if (p.gender === 'girls') entry.girlsScore += points;
    }

    // ============================================================
    // 2) BALL GAMES — derive a per-game ranking from match_pools by
    //    counting wins per school, then award the standard 7/5/4/3/2/1
    //    to the top finishers.
    // ============================================================
    const matchesByGame = new Map<string, any[]>();
    for (const m of allMatches as any[]) {
      if (!m.game) continue;
      if (!passesGameFilters(m.game)) continue;
      if (genderFilter !== 'all' && m.game.gender !== genderFilter) continue;
      const arr = matchesByGame.get(m.game_id) ?? [];
      arr.push(m);
      matchesByGame.set(m.game_id, arr);
    }

    for (const [gameId, matches] of matchesByGame) {
      const game = matches[0].game as { school_level: string; gender: Gender };
      // Tally wins per school across all rounds for this game.
      const wins = new Map<string, { schoolId: string; schoolName: string; wins: number }>();
      const seedSchool = (
        schoolId?: string | null,
        schoolObj?: { id: string; name: string } | null,
      ) => {
        if (!schoolId) return;
        if (!wins.has(schoolId)) {
          wins.set(schoolId, {
            schoolId,
            schoolName: schoolObj?.name ?? 'Unknown Team',
            wins: 0,
          });
        }
      };
      for (const m of matches) {
        seedSchool(m.team_a_school_id, m.team_a_school as any);
        seedSchool(m.team_b_school_id, m.team_b_school as any);
        if (m.winner_school_id) {
          seedSchool(m.winner_school_id, m.winner_school as any);
          const w = wins.get(m.winner_school_id);
          if (w) w.wins += 1;
        }
      }

      const ranked = Array.from(wins.values())
        .filter(w => w.wins > 0)
        .sort((a, b) => b.wins - a.wins);

      // Resolve ties by giving the same position to teams with equal wins.
      let lastWins = -1;
      let lastPos = 0;
      ranked.forEach((team, idx) => {
        const position = team.wins === lastWins ? lastPos : idx + 1;
        lastWins = team.wins;
        lastPos = position;
        const points = getPointsFromPosition(position);
        if (points === 0) return;
        const entry = ensure(team.schoolId, team.schoolName);
        entry.games.add(gameId);
        addLevelPoints(entry, game.school_level, points);
        if (game.gender === 'boys') entry.boysScore += points;
        else if (game.gender === 'girls') entry.girlsScore += points;
      });
    }

    // ============================================================
    // 3) Build final rows + grand total AFTER both category buckets are finalized.
    // ============================================================
    let results = Array.from(scoreMap.values()).map((entry) => {
      // Grand Total = Primary + Jr.Sec, MINUS the combined-event points which
      // were intentionally credited to BOTH columns (so they show under either
      // school-level filter) but must only count ONCE in the overall total.
      const grandTotal = entry.primaryScore + entry.juniorSecondaryScore - entry.combinedScore;

      return {
        schoolId: entry.schoolId,
        schoolName: entry.schoolName,
        primaryScore: entry.primaryScore,
        juniorSecondaryScore: entry.juniorSecondaryScore,
        boysScore: entry.boysScore,
        girlsScore: entry.girlsScore,
        gamesPlayed: entry.games.size,
        grandTotal,
      };
    }).filter(t => !(t.grandTotal === 0 && t.gamesPlayed === 0));

    if (locationSearch.trim()) {
      const search = locationSearch.toLowerCase();
      results = results.filter(t => t.schoolName.toLowerCase().includes(search));
    }

    // Stable sort: grand total desc, then name asc for deterministic ranking.
    results.sort((a, b) => {
      if (b.grandTotal !== a.grandTotal) return b.grandTotal - a.grandTotal;
      return a.schoolName.localeCompare(b.schoolName);
    });

    devDebug(`[Rankings Debug] Final team count: ${results.length}, Championship ID: ${selectedChampionshipId}`);

    return results;
  }, [
    selectedChampionshipId,
    participants,
    allMatches,
    schoolLevelFilter,
    levelFilter,
    genderFilter,
    locationSearch,
  ]);

  const getPositionIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-700" />;
    return <span className="text-muted-foreground font-medium">{index + 1}</span>;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    if (teamScores.length === 0) return;
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      const championshipName = selectedChampionship?.name ?? 'selected championship';
      const downloadDate = new Date().toLocaleString('en-GB');

      // Build filter description
      const filterDescriptions: string[] = [];
      if (schoolLevelFilter && schoolLevelFilter !== 'all') {
        const levelLabels: Record<string, string> = {
          'base': 'Base',
          'primary': 'Primary',
          'junior_secondary': 'Junior Secondary',
        };
        filterDescriptions.push(`School Level: ${levelLabels[schoolLevelFilter] || schoolLevelFilter}`);
      }
      if (levelFilter && levelFilter !== 'all') {
        filterDescriptions.push(`Competition Level: ${levelFilter.charAt(0).toUpperCase() + levelFilter.slice(1)}`);
      }
      if (genderFilter && genderFilter !== 'all') {
        const genderLabels: Record<string, string> = {
          'boys': 'Boys',
          'girls': 'Girls',
          'mixed': 'Mixed',
          'male': 'Male',
          'female': 'Female',
        };
        filterDescriptions.push(`Gender: ${genderLabels[genderFilter] || genderFilter}`);
      }
      if (locationSearch.trim()) {
        filterDescriptions.push(`Team Search: ${locationSearch.trim()}`);
      }

      autoTable(pdf, {
        startY: filterDescriptions.length > 0 ? 44 : 38,
        margin: { top: 38, left: 8, right: 8, bottom: 12 },
        head: [[
          'Rank',
          'Team',
          'Location',
          'Games',
          'Primary',
          'Jr. Sec',
          'Boys',
          'Girls',
          'Grand Total',
        ]],
        body: teamScores.map((team, index) => [
          String(index + 1),
          team.schoolName,
          team.schoolName,
          String(team.gamesPlayed),
          String(team.primaryScore || 0),
          String(team.juniorSecondaryScore || 0),
          String(team.boysScore || 0),
          String(team.girlsScore || 0),
          String(team.grandTotal),
        ]),
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak',
          valign: 'middle',
          textColor: [20, 20, 20],
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 14, halign: 'center' },
          1: { cellWidth: 44 },
          2: { cellWidth: 66 },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 18, halign: 'right' },
          5: { cellWidth: 18, halign: 'right' },
          6: { cellWidth: 18, halign: 'right' },
          7: { cellWidth: 18, halign: 'right' },
          8: { cellWidth: 24, halign: 'right' },
        },
        didDrawPage: () => {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(14);
          pdf.text('ZARODA SPORTS MANAGEMENT SYSTEM', 8, 10);
          pdf.setFontSize(11);
          pdf.text(`Report: Overall Rankings`, 8, 16);
          pdf.text(`Championship: ${championshipName}`, 8, 22);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          
          // Add filter information if any filters are applied
          let yPos = 28;
          if (filterDescriptions.length > 0) {
            pdf.text('Applied Filters:', 8, yPos);
            yPos += 4;
            filterDescriptions.forEach(desc => {
              pdf.text(`• ${desc}`, 12, yPos);
              yPos += 4;
            });
          }
          
          pdf.text(`Downloaded: ${downloadDate}`, 8, yPos + 2);
        },
      });

      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i += 1) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.text(
          `Page ${i} of ${totalPages}`,
          pdf.internal.pageSize.getWidth() - 8,
          pdf.internal.pageSize.getHeight() - 5,
          { align: 'right' },
        );
      }

      const safeChampionship = championshipName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      pdf.save(`zaroda-rankings-${safeChampionship || 'report'}.pdf`);
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="bg-gradient-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8" />
            <h1 className="font-display text-4xl md:text-5xl tracking-wider">OVERALL RANKINGS</h1>
          </div>
          {selectedChampionship && (
            <p className="text-white/90 text-lg font-display mt-2">{selectedChampionship.name}</p>
          )}
          {!championshipFilter && (
            <p className="text-white/90 text-lg font-display mt-2">Select a Championship</p>
          )}
          <p className="text-white/70 mt-1">Team rankings based on awarded points</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Select value={championshipFilter} onValueChange={(value) => setChampionshipFilter(value)}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Championship" />
            </SelectTrigger>
            <SelectContent>
              {championships.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select
            value={schoolLevelFilter}
            onValueChange={(value) => setSchoolLevelFilter(value as RankingSchoolLevelFilter)}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="School level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All (Primary + Jr. Sec)</SelectItem>
              <SelectItem value="base">Base</SelectItem>
              <SelectItem value="primary">Primary</SelectItem>
              <SelectItem value="junior_secondary">Junior Secondary</SelectItem>
            </SelectContent>
          </Select>

          <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as CompetitionLevel | 'all')}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="base">Base</SelectItem>
              <SelectItem value="zone">Zone</SelectItem>
              <SelectItem value="subcounty">Sub-County</SelectItem>
              <SelectItem value="county">County</SelectItem>
              <SelectItem value="region">Region</SelectItem>
              <SelectItem value="national">National</SelectItem>
            </SelectContent>
          </Select>

          <Select value={genderFilter} onValueChange={(v) => setGenderFilter(v as Gender | 'all')}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Gender</SelectItem>
              <SelectItem value="boys">Boys</SelectItem>
              <SelectItem value="girls">Girls</SelectItem><SelectItem value="mixed">Mixed</SelectItem><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Search team..."
            value={locationSearch}
            onChange={e => setLocationSearch(e.target.value)}
            className="w-64"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-secondary" /></div>
        ) : !selectedChampionshipId ? (
          <div className="text-center py-16 text-muted-foreground"><p className="text-lg">Please select a championship to view rankings</p></div>
        ) : teamScores.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground"><p className="text-lg">No scored results found for selected filters</p></div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-1" />Print</Button>
              <Button variant="secondary" onClick={handleDownloadPdf}><Download className="w-4 h-4 mr-1" />Download PDF</Button>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Games</TableHead>
                    <TableHead className="text-right">Primary</TableHead>
                    <TableHead className="text-right">Jr. Sec</TableHead>
                    <TableHead className="text-right">Boys</TableHead>
                    <TableHead className="text-right">Girls</TableHead>
                    <TableHead className="text-right font-bold">Grand Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamScores.map((team, index) => (
                    <TableRow key={team.schoolId} className={index < 3 ? 'bg-secondary/5' : ''}>
                      <TableCell className="text-center">{getPositionIcon(index)}</TableCell>
                      <TableCell className="font-bold text-foreground">{team.schoolName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {team.schoolName || '-'}
                      </TableCell>
                      <TableCell className="text-right">{team.gamesPlayed}</TableCell>
                      <TableCell className="text-right">
                        {schoolLevelFilter === 'junior_secondary' ? '-' : (team.primaryScore || '-')}
                      </TableCell>
                      <TableCell className="text-right">
                        {schoolLevelFilter === 'primary' ? '-' : (team.juniorSecondaryScore || '-')}
                      </TableCell>
                      <TableCell className="text-right">{team.boysScore || '-'}</TableCell>
                      <TableCell className="text-right">{team.girlsScore || '-'}</TableCell>
                      <TableCell className="text-right font-bold text-lg text-secondary">{team.grandTotal}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OverallRankings;
