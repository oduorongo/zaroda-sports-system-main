import { useChampionships } from '@/hooks/useChampionships';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import {
  LEVEL_LABELS,
  GENDER_LABELS,
  SCHOOL_LEVEL_LABELS,
  CompetitionLevel,
  Participant,
  Gender,
  GameCategory,
} from '@/types/database';
import { Loader2, Users, CheckCircle2, Printer, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEffect, useMemo, useState } from 'react';
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
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

const QualifiedTeamsPage = () => {
  const { data: allQualifiedParticipants = [], isLoading: pLoading } = useQuery({
    queryKey: ['qualified-participants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('participants')
        .select(`
          id,
          first_name,
          last_name,
          school_id,
          game_id,
          gender,
          time_taken,
          position,
          score,
          bib_number,
          personal_best,
          lane_number,
          is_qualified,
          notes,
          school_name,
          created_at,
          updated_at,
          school:schools(id, name),
          game:games(
            id, name, championship_id, 
            school_level, gender, category, level
          )
        `)
        .eq('is_qualified', true)
        .order('position', { ascending: true, nullsFirst: false });

      if (error) throw error;
      
      return (data ?? []) as unknown as Participant[];
    },
  });
  const { data: championships = [] } = useChampionships();
  const { data: tenants = [] } = useQuery({
    queryKey: ['public-championship-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, county, subcounty, organization_name');

      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: qualifiedTeamWinners = [], isLoading: tLoading } = useQuery({
    queryKey: ['qualified-team-winners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('match_pools')
        .select(`
          id,
          game_id,
          winner_school_id,
          created_at,
          winner_school:schools(id, name),
          game:games(id, name, championship_id, school_level, gender, category, level)
        `)
        .not('winner_school_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const [generalFilter, setGeneralFilter] = useState<'all' | 'open_tournament' | 'schools_institutions'>('all');
  const [levelFilter, setLevelFilter] = useState<CompetitionLevel | 'all'>('all');
  const [gameCategoryFilter, setGameCategoryFilter] = useState<GameCategory | 'all'>('all');
  const [championshipFilter, setChampionshipFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<'all' | string>('all');
  const [countyFilter, setCountyFilter] = useState<'all' | string>('all');
  const [genderFilter, setGenderFilter] = useState<Gender | 'all'>('all');

  const isLoading = pLoading || tLoading;

  const matchesGeneralFilter = (schoolLevel?: string | null) => {
    if (!schoolLevel) return generalFilter === 'all';
    if (generalFilter === 'open_tournament') return schoolLevel === 'open';
    if (generalFilter === 'schools_institutions') return schoolLevel !== 'open';
    return true;
  };

  const championshipMetadata = useMemo(() => {
    const tenantById = new Map(
      tenants.map((tenant: any) => [tenant.id, tenant]),
    );

    return championships.map((championship) => {
      const tenant = tenantById.get(championship.tenant_id || '') as { county?: string | null; subcounty?: string | null } | undefined;
      const year = championship.start_date?.slice(0, 4) || championship.created_at?.slice(0, 4) || 'Unknown';
      const county = (tenant?.county || championship.location || 'Unknown').trim();

      return {
        ...championship,
        year,
        county,
      };
    });
  }, [championships, tenants]);

  const championshipMetaById = useMemo(() => {
    return new Map(championshipMetadata.map((championship) => [championship.id, championship]));
  }, [championshipMetadata]);

  const availableChampionships = useMemo(() => {
    return championshipMetadata.filter((championship) => {
      if (!matchesGeneralFilter(championship.school_level)) return false;
      if (levelFilter !== 'all' && championship.level !== levelFilter) return false;
      if (yearFilter !== 'all' && championship.year !== yearFilter) return false;
      if (countyFilter !== 'all' && championship.county.toLowerCase() !== countyFilter.toLowerCase()) return false;
      if (gameCategoryFilter !== 'all') {
        const hasMatchingParticipants = allQualifiedParticipants.some(
          (participant) =>
            participant.game?.championship_id === championship.id &&
            participant.game?.category === gameCategoryFilter,
        );
        const hasMatchingTeams = qualifiedTeamWinners.some(
          (winner: any) =>
            winner.game?.championship_id === championship.id &&
            winner.game?.category === gameCategoryFilter,
        );
        if (!hasMatchingParticipants && !hasMatchingTeams) return false;
      }
      return true;
    });
  }, [
    championships,
    generalFilter,
    levelFilter,
    gameCategoryFilter,
    yearFilter,
    countyFilter,
    allQualifiedParticipants,
    qualifiedTeamWinners,
    championshipMetadata,
  ]);

  const availableYears = useMemo(() => {
    return Array.from(new Set(championshipMetadata.map((championship) => championship.year)))
      .filter((year) => year && year !== 'Unknown')
      .sort((a, b) => b.localeCompare(a));
  }, [championshipMetadata]);

  const availableCounties = useMemo(() => {
    return Array.from(new Set(championshipMetadata.map((championship) => championship.county)))
      .filter((county) => county && county !== 'Unknown')
      .sort((a, b) => a.localeCompare(b));
  }, [championshipMetadata]);

  useEffect(() => {
    if (championshipFilter && !availableChampionships.some((championship) => championship.id === championshipFilter)) {
      setChampionshipFilter('');
    }
  }, [championshipFilter, availableChampionships]);

  useEffect(() => {
    if (yearFilter !== 'all' && !availableYears.includes(yearFilter)) {
      setYearFilter('all');
    }
  }, [yearFilter, availableYears]);

  useEffect(() => {
    if (countyFilter !== 'all' && !availableCounties.includes(countyFilter)) {
      setCountyFilter('all');
    }
  }, [countyFilter, availableCounties]);

  const qualifiedParticipants = useMemo(() => {
    return allQualifiedParticipants.filter((participant) => {
      const championshipMeta = participant.game?.championship_id ? championshipMetaById.get(participant.game.championship_id) : null;
      if (!matchesGeneralFilter(participant.game?.school_level)) return false;
      if (levelFilter !== 'all' && participant.game?.level !== levelFilter) return false;
      if (gameCategoryFilter !== 'all' && participant.game?.category !== gameCategoryFilter) return false;
      if (yearFilter !== 'all' && championshipMeta?.year !== yearFilter) return false;
      if (countyFilter !== 'all' && championshipMeta?.county.toLowerCase() !== countyFilter.toLowerCase()) return false;
      if (championshipFilter && participant.game?.championship_id !== championshipFilter) return false;
      if (genderFilter !== 'all' && participant.gender !== genderFilter) return false;
      return true;
    });
  }, [
    allQualifiedParticipants,
    championshipFilter,
    generalFilter,
    levelFilter,
    gameCategoryFilter,
    yearFilter,
    countyFilter,
    genderFilter,
    championshipMetaById,
  ]);

  const qualifiedTeams = useMemo(() => {
    return qualifiedTeamWinners.filter((winner: any) => {
      if (!winner?.game) return false;
      const championshipMeta = winner.game.championship_id ? championshipMetaById.get(winner.game.championship_id) : null;
      if (!matchesGeneralFilter(winner.game.school_level)) return false;
      if (levelFilter !== 'all' && winner.game.level !== levelFilter) return false;
      if (gameCategoryFilter !== 'all' && winner.game.category !== gameCategoryFilter) return false;
      if (yearFilter !== 'all' && championshipMeta?.year !== yearFilter) return false;
      if (countyFilter !== 'all' && championshipMeta?.county.toLowerCase() !== countyFilter.toLowerCase()) return false;
      if (championshipFilter && winner.game.championship_id !== championshipFilter) return false;
      if (genderFilter !== 'all' && winner.game.gender !== genderFilter) return false;
      return true;
    });
  }, [qualifiedTeamWinners, championshipFilter, generalFilter, levelFilter, gameCategoryFilter, yearFilter, countyFilter, genderFilter, championshipMetaById]);

  const groupedByGame = useMemo(() => {
    const map = new Map<string, typeof qualifiedParticipants>();
    for (const p of qualifiedParticipants) {
      if (!p.game_id) continue;
      const key = p.game_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(p);
    }
    return map;
  }, [qualifiedParticipants]);

  const groupedTeamsByGame = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const row of qualifiedTeams as any[]) {
      if (!row.game_id) continue;
      if (!map.has(row.game_id)) map.set(row.game_id, []);
      map.get(row.game_id)?.push(row);
    }
    return map;
  }, [qualifiedTeams]);

  const nextLevel = (level: CompetitionLevel): string => {
    const order: CompetitionLevel[] = ['zone', 'subcounty', 'county', 'region', 'national'];
    const idx = order.indexOf(level);
    if (idx < order.length - 1) return LEVEL_LABELS[order[idx + 1]];
    return 'Champions';
  };

  const selectedChampionship = championshipFilter
    ? championshipMetadata.find(c => c.id === championshipFilter)
    : null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    if (groupedByGame.size === 0) return;
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      const championshipName = selectedChampionship?.name ?? 'Selected Championship';
      const downloadDate = new Date().toLocaleString('en-GB');

      // Build filter description
      const filterDescriptions: string[] = [];
      if (yearFilter && yearFilter !== 'all') {
        filterDescriptions.push(`Year: ${yearFilter}`);
      }
      if (countyFilter && countyFilter !== 'all') {
        filterDescriptions.push(`County: ${countyFilter}`);
      }
      if (generalFilter && generalFilter !== 'all') {
        const generalLabels: Record<string, string> = {
          'open_tournament': 'Open Tournaments',
          'schools_institutions': 'Schools & Institutions',
        };
        filterDescriptions.push(`Category: ${generalLabels[generalFilter] || generalFilter}`);
      }
      if (levelFilter && levelFilter !== 'all') {
        filterDescriptions.push(`Level: ${levelFilter}`);
      }
      if (genderFilter && genderFilter !== 'all') {
        filterDescriptions.push(`Gender: ${GENDER_LABELS[genderFilter]}`);
      }

      const rows = Array.from(groupedByGame.entries()).flatMap(([gameId, players]) => {
        const game = players[0]?.game;
        if (!game) return [] as string[][];

        return [...players]
          .sort((a, b) => (a.position || 999) - (b.position || 999))
          .map((p, index) => [
            String(index + 1),
            game.name,
            `${p.first_name} ${p.last_name}`,
            p.school?.name || '-',
            p.position ? String(p.position) : '-',
            p.score != null ? String(p.score) : '-',
            LEVEL_LABELS[game.level],
            GENDER_LABELS[game.gender],
            'Qualified',
          ]);
      });

      autoTable(pdf, {
        startY: filterDescriptions.length > 0 ? 44 : 38,
        margin: { top: 38, left: 8, right: 8, bottom: 12 },
        head: [[
          'No.',
          'Game',
          'Name',
          'Team',
          'Position',
          'Score',
          'Level',
          'Gender',
          'Status',
        ]],
        body: rows,
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
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 46 },
          2: { cellWidth: 40 },
          3: { cellWidth: 50 },
          4: { cellWidth: 16, halign: 'center' },
          5: { cellWidth: 18, halign: 'right' },
          6: { cellWidth: 24 },
          7: { cellWidth: 20 },
          8: { cellWidth: 24, halign: 'center' },
        },
        didDrawPage: () => {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(14);
          pdf.text('ZARODA SPORTS MANAGEMENT SYSTEM', 8, 10);
          pdf.setFontSize(11);
          pdf.text('Report: Qualified Teams', 8, 16);
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

      pdf.save(`zaroda-qualified-${safeChampionship || 'report'}.pdf`);
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
            <Users className="w-8 h-8" />
            <h1 className="font-display text-4xl md:text-5xl tracking-wider">QUALIFIED TEAMS</h1>
          </div>
          {selectedChampionship && <p className="text-white/90 text-lg font-display mt-2">{selectedChampionship.name}</p>}
          {!championshipFilter && <p className="text-white/90 text-lg font-display mt-2">All Championships</p>}
          <p className="text-white/70 mt-2">Teams and individuals proceeding to the next level</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Warning about games without championship assignment */}
        {allQualifiedParticipants.some(p => !p.game?.championship_id) && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800 text-sm">
              <strong>Note:</strong> Some results may not appear if their games are not assigned to a championship. 
              Edit the game in Admin to assign it to the correct championship.
            </p>
          </div>
        )}
        
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <Select value={generalFilter} onValueChange={(value) => { setGeneralFilter(value as 'all' | 'open_tournament' | 'schools_institutions'); setChampionshipFilter(''); }}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open_tournament">Open Tournament</SelectItem>
              <SelectItem value="schools_institutions">Schools / Institutions</SelectItem>
            </SelectContent>
          </Select>

          <Select value={yearFilter} onValueChange={(value) => { setYearFilter(value); setChampionshipFilter(''); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={countyFilter} onValueChange={(value) => { setCountyFilter(value); setChampionshipFilter(''); }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="County" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Counties</SelectItem>
              {availableCounties.map((county) => <SelectItem key={county} value={county}>{county}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={levelFilter} onValueChange={(value) => { setLevelFilter(value as CompetitionLevel | 'all'); setChampionshipFilter(''); }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
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

          <Select value={gameCategoryFilter} onValueChange={(value) => { setGameCategoryFilter(value as GameCategory | 'all'); setChampionshipFilter(''); }}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="athletics">Athletics</SelectItem>
              <SelectItem value="ball_games">Ball Games</SelectItem>
              <SelectItem value="music">Music</SelectItem>
              <SelectItem value="other">Other Games</SelectItem>
            </SelectContent>
          </Select>

          <Select value={championshipFilter || 'all'} onValueChange={(value) => setChampionshipFilter(value === 'all' ? '' : value)}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Championship" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Championships</SelectItem>
              {availableChampionships.map(c => <SelectItem key={c.id} value={c.id}>{`${c.name} • ${c.year} • ${c.county}`}</SelectItem>)}
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

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" onClick={handlePrint} disabled={groupedByGame.size === 0}><Printer className="w-4 h-4 mr-1" />Print</Button>
            <Button variant="secondary" onClick={handleDownloadPdf} disabled={groupedByGame.size === 0}><Download className="w-4 h-4 mr-1" />Download PDF</Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-secondary" /></div>
        ) : groupedByGame.size === 0 && groupedTeamsByGame.size === 0 ? (
          <div className="text-center py-16 text-muted-foreground"><p className="text-lg">No qualified participants yet</p></div>
        ) : (
          <div className="space-y-8">
            {Array.from(groupedByGame.entries()).map(([gameId, players]) => {
              const game = players[0]?.game;
              if (!game) return null;

              return (
                <div key={gameId} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="bg-muted/50 px-6 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-xl text-foreground">{game.name}</h3>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary">{LEVEL_LABELS[game.level]}</Badge>
                        <Badge variant="outline" className={game.gender === 'boys' ? 'border-blue-400 text-blue-600' : 'border-pink-400 text-pink-600'}>
                          {GENDER_LABELS[game.gender]}
                        </Badge>
                        <Badge variant="outline">{SCHOOL_LEVEL_LABELS[game.school_level]}</Badge>
                        {championshipMetaById.get(game.championship_id || '') && (
                          <Badge variant="outline">
                            {`${championshipMetaById.get(game.championship_id || '')?.year} • ${championshipMetaById.get(game.championship_id || '')?.county}`}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-success text-success-foreground">Proceeding to {nextLevel(game.level)}</Badge>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bib</TableHead>
                        <TableHead>Athlete Name</TableHead>
                        <TableHead>Team / School</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {players.sort((a, b) => (a.position || 999) - (b.position || 999)).map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono font-bold text-secondary">{p.bib_number || '—'}</TableCell>
                          <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                          <TableCell>{p.school?.name || p.school_name || '-'}</TableCell>
                          <TableCell>{p.position || '-'}</TableCell>
                          <TableCell>{p.time_taken != null ? p.time_taken : (p.score ?? '-')}</TableCell>
                          <TableCell>
                            <Badge className="bg-success text-success-foreground">
                              <CheckCircle2 className="w-3 h-3 mr-1" />Qualified
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })}

            {Array.from(groupedTeamsByGame.entries()).map(([gameId, teams]) => {
              const game = teams[0]?.game;
              if (!game) return null;

              return (
                <div key={`team-${gameId}`} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="bg-muted/50 px-6 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-xl text-foreground">{game.name} (Team Qualification)</h3>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary">{LEVEL_LABELS[game.level]}</Badge>
                        <Badge variant="outline" className={game.gender === 'boys' ? 'border-blue-400 text-blue-600' : 'border-pink-400 text-pink-600'}>
                          {GENDER_LABELS[game.gender]}
                        </Badge>
                        <Badge variant="outline">{SCHOOL_LEVEL_LABELS[game.school_level]}</Badge>
                        {championshipMetaById.get(game.championship_id || '') && (
                          <Badge variant="outline">
                            {`${championshipMetaById.get(game.championship_id || '')?.year} • ${championshipMetaById.get(game.championship_id || '')?.county}`}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-success text-success-foreground">Qualified Teams</Badge>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Team / School</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teams.map((team: any, index: number) => (
                        <TableRow key={team.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{team.winner_school?.name || 'Unknown Team'}</TableCell>
                          <TableCell>
                            <Badge className="bg-success text-success-foreground">
                              <CheckCircle2 className="w-3 h-3 mr-1" />Qualified Team
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default QualifiedTeamsPage;
