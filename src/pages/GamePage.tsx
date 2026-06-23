import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGame } from '@/hooks/useGames';
import { useParticipants } from '@/hooks/useParticipants';
import { useHeats, useAllHeatParticipants } from '@/hooks/useHeats';
import { useMatchPools } from '@/hooks/useMatchPools';
import { useChampionships } from '@/hooks/useChampionships';
import { Navbar } from '@/components/Navbar';
import { ParticipantsTable } from '@/components/ParticipantsTable';
import { LeagueTable } from '@/components/LeagueTable';
import { StatsCard } from '@/components/StatsCard';
import { LEVEL_LABELS, CATEGORY_LABELS, GENDER_LABELS, SCHOOL_LEVEL_LABELS, RACE_TYPE_LABELS } from '@/types/database';
import { Loader2, ChevronLeft, Clock, Trophy, Share2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { CompetitionLevel } from '@/types/database';

const formatTimeDisplay = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  const wholeSecs = Math.floor(remaining);
  const cs = Math.round((remaining - wholeSecs) * 100);
  return `${mins}.${wholeSecs.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
};

const nextLevel = (level: CompetitionLevel): string => {
  const order: CompetitionLevel[] = ['zone', 'subcounty', 'county', 'region', 'national'];
  const idx = order.indexOf(level);
  if (idx < order.length - 1) return LEVEL_LABELS[order[idx + 1]];
  return 'Champions';
};

const GamePage = () => {
  const { gameId } = useParams() as { gameId?: string };
  const { data: game, isLoading: gameLoading } = useGame(gameId || '');
  const { data: participantsRaw = [], isLoading: participantsLoading } = useParticipants(gameId);
  // Exclude no-shows from public results
  const participants = useMemo(
    () => participantsRaw.filter(p => p.status !== 'absent'),
    [participantsRaw]
  );
  const { data: heats = [] } = useHeats(gameId);
  const { data: heatParticipants = [] } = useAllHeatParticipants(gameId);
  const { data: matchPools = [] } = useMatchPools(gameId);
  const { data: championships = [] } = useChampionships();

  const isLoading = gameLoading || participantsLoading;

  const championship = game?.championship_id ? championships.find(c => c.id === game.championship_id) : null;

  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.position && b.position) return a.position - b.position;
    if (a.position) return -1;
    if (b.position) return 1;
    if (game?.is_timed && a.time_taken && b.time_taken) return a.time_taken - b.time_taken;
    return 0;
  });

  const qualifiedCount = participants.filter(p => p.is_qualified).length;
  const winner = sortedParticipants.find(p => p.position === 1);

  const handleShare = async () => {
    const { shareWithMessage } = await import('@/lib/share');
    await shareWithMessage(window.location.href, game?.name || 'Game Results');
  };


  const isAthletics = game?.category === 'athletics';
  const isBallGame = game?.category === 'ball_games';
  const hasHeats = isAthletics && heats.length > 0;

  const nonFinalHeats = heats
    .filter((h) => h.heat_type !== 'final')
    .sort((a, b) => a.heat_number - b.heat_number);
  const finalHeat = heats.find((h) => h.heat_type === 'final');

  const finalHeatParticipants = finalHeat
    ? heatParticipants
      .filter((hp) => hp.heat_id === finalHeat.id)
      .sort((a, b) => (a.position || 999) - (b.position || 999))
    : [];

  const finalHasTopTwo = finalHeatParticipants.some((hp) => hp.position === 1) && finalHeatParticipants.some((hp) => hp.position === 2);
  const finalExists = !!finalHeat;
  const finalCompleted = finalExists && finalHasTopTwo;

  const qualifiedForNextLevel = finalHeatParticipants.filter(
    (hp) => (hp.position === 1 || hp.position === 2) && hp.is_qualified_for_final && hp.participant?.is_qualified
  );

  if (!gameId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="font-display text-4xl text-foreground mb-4">Game Not Found</h1>
          <Link to="/" className="text-secondary hover:underline">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {isLoading ? (
        <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-secondary" /></div>
      ) : !game ? (
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="font-display text-4xl text-foreground mb-4">Game Not Found</h1>
          <Link to="/" className="text-secondary hover:underline">Return Home</Link>
        </div>
      ) : (
        <>
          <div className="bg-gradient-navy text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="flex items-center justify-between mb-4">
                <Link to={`/category/${game.category}`} className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                  <ChevronLeft className="w-4 h-4" />Back to {CATEGORY_LABELS[game.category]}
                </Link>
                <Button variant="ghost" size="sm" onClick={handleShare} className="text-white/70 hover:text-white hover:bg-white/10">
                  <Share2 className="w-4 h-4 mr-1" />Share
                </Button>
              </div>
              {championship && (
                <p className="text-secondary font-display text-lg mb-2">{championship.name}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <Badge className="bg-secondary text-secondary-foreground">{LEVEL_LABELS[game.level]}</Badge>
                <Badge variant="outline" className={`border-white/30 ${game.gender === 'boys' ? 'text-blue-300' : 'text-pink-300'}`}>
                  {GENDER_LABELS[game.gender]}
                </Badge>
                <Badge variant="outline" className="border-white/30 text-white">{SCHOOL_LEVEL_LABELS[game.school_level]}</Badge>
                {game.is_timed && (
                  <Badge variant="outline" className="border-white/30 text-white">
                    <Clock className="w-3 h-3 mr-1" />{game.race_type === 'field_event' ? 'Measurement Taken' : 'Timed Event'}
                  </Badge>
                )}
                {game.race_type && (
                  <Badge variant="outline" className="border-white/30 text-white">{RACE_TYPE_LABELS[game.race_type] || game.race_type}</Badge>
                )}
              </div>
              <h1 className="font-display text-4xl md:text-5xl tracking-wider">{game.name}</h1>
              {game.description && <p className="text-white/70 mt-2 max-w-2xl">{game.description}</p>}
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatsCard title="Participants" value={participants.length} icon="users" />
              <StatsCard title="Qualified" value={`${qualifiedCount}/${game.max_qualifiers}`} icon="trophy" />
              <StatsCard title="Teams" value={new Set(participants.map(p => p.school_id)).size} icon="location" />
              {winner && <StatsCard title="Winner" value={`${winner.first_name} ${winner.last_name}`} icon="trophy" />}
            </div>

            {/* Heats/Finals Section for Athletics */}
            {hasHeats && (
              <div className="mb-8">
                <h2 className="font-display text-2xl text-foreground mb-4">HEATS & FINALS</h2>
                <div className="space-y-4">
                  {!finalExists ? (
                    <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl px-4 py-3 text-sm font-medium">
                      Heats in progress
                    </div>
                  ) : !finalCompleted ? (
                    <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl px-4 py-3 text-sm font-medium">
                      Finals to be held
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-sm font-medium">
                      Proceeding to {nextLevel(game.level)}
                    </div>
                  )}

                  {nonFinalHeats.map(heat => {
                    const hps = heatParticipants.filter(hp => hp.heat_id === heat.id)
                      .sort((a, b) => (a.position || 999) - (b.position || 999));
                    return (
                      <div key={heat.id} className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="bg-muted/50 px-6 py-3 flex items-center justify-between">
                          <h3 className="font-display text-lg">HEAT {heat.heat_number} RESULTS</h3>
                          <Badge variant="outline">Heat {heat.heat_number}</Badge>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-16">Pos</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Team</TableHead>
                              <TableHead className="text-right">Time</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {hps.length === 0 ? (
                              <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No participants in this heat</TableCell></TableRow>
                            ) : hps.map(hp => (
                              <TableRow key={hp.id}>
                                <TableCell className="font-medium">{hp.position ? `Position ${hp.position} (Heat ${heat.heat_number})` : '-'}</TableCell>
                                <TableCell className="font-medium">
                                  {hp.participant?.first_name} {hp.participant?.last_name}
                                </TableCell>
                                <TableCell>{hp.participant?.school?.name || '-'}</TableCell>
                                <TableCell className="text-right font-mono">
                                  {hp.time_taken ? formatTimeDisplay(hp.time_taken) : '-'}
                                </TableCell>
                                <TableCell className="text-center">{hp.is_qualified_for_final ? <Badge className="bg-success text-success-foreground">→ Finals</Badge> : <Badge variant="outline" className="text-muted-foreground">-</Badge>}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}

                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="bg-muted/50 px-6 py-3 flex items-center justify-between">
                      <h3 className="font-display text-lg">FINAL RESULTS</h3>
                      <Badge variant={finalExists ? 'default' : 'outline'}>{finalExists ? 'Final' : 'Pending'}</Badge>
                    </div>
                    {!finalExists ? (
                      <div className="px-6 py-4 text-sm text-muted-foreground">No final heat exists yet.</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Pos</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Team</TableHead>
                            <TableHead className="text-right">Time</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {finalHeatParticipants.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Final participants pending</TableCell></TableRow>
                          ) : finalHeatParticipants.map(hp => (
                            <TableRow key={hp.id}>
                              <TableCell className="font-medium">{hp.position || '-'}</TableCell>
                              <TableCell className="font-medium">{hp.participant?.first_name} {hp.participant?.last_name}</TableCell>
                              <TableCell>{hp.participant?.school?.name || '-'}</TableCell>
                              <TableCell className="text-right font-mono">{hp.time_taken ? formatTimeDisplay(hp.time_taken) : '-'}</TableCell>
                              <TableCell className="text-center">
                                {(hp.position === 1 || hp.position === 2) && hp.is_qualified_for_final && hp.participant?.is_qualified
                                  ? <Badge className="bg-success text-success-foreground">Proceeding</Badge>
                                  : <Badge variant="outline" className="text-muted-foreground">-</Badge>}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="bg-muted/50 px-6 py-3">
                      <h3 className="font-display text-lg">QUALIFIED FOR NEXT LEVEL</h3>
                    </div>
                    {!finalExists ? (
                      <div className="px-6 py-4 text-sm text-muted-foreground">Heats in progress</div>
                    ) : !finalCompleted ? (
                      <div className="px-6 py-4 text-sm text-muted-foreground">Finals to be held</div>
                    ) : qualifiedForNextLevel.length === 0 ? (
                      <div className="px-6 py-4 text-sm text-muted-foreground">No qualifiers recorded from final yet</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Team</TableHead>
                            <TableHead>Final Position</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {qualifiedForNextLevel
                            .sort((a, b) => (a.position || 999) - (b.position || 999))
                            .map((hp) => (
                              <TableRow key={hp.id}>
                                <TableCell className="font-medium">{hp.participant?.first_name} {hp.participant?.last_name}</TableCell>
                                <TableCell>{hp.participant?.school?.name || '-'}</TableCell>
                                <TableCell>{hp.position || '-'}</TableCell>
                                <TableCell><Badge className="bg-success text-success-foreground">Proceeding to {nextLevel(game.level)}</Badge></TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pooling/Matchups for Ball Games */}
            {isBallGame && matchPools.length > 0 && (
              <>
                <LeagueTable
                  matches={matchPools as any}
                  championshipName={championship?.name}
                  zoneName={championship?.location ? `${championship.location} ${LEVEL_LABELS[game.level]}` : undefined}
                  asOfDate={new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                />
              <div className="mb-8">
                <h2 className="font-display text-2xl text-foreground mb-4">MATCH POOLS & RESULTS</h2>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Round</TableHead>
                        <TableHead>Team A</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead>Team B</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead>Winner</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matchPools.map(match => (
                        <TableRow key={match.id}>
                          <TableCell><Badge variant="outline">{match.round_name}</Badge></TableCell>
                          <TableCell className="font-medium">{match.team_a_school?.name || '-'}</TableCell>
                          <TableCell className="text-center font-bold">{match.team_a_score ?? '-'}</TableCell>
                          <TableCell className="font-medium">{match.team_b_school?.name || '-'}</TableCell>
                          <TableCell className="text-center font-bold">{match.team_b_score ?? '-'}</TableCell>
                          <TableCell>
                            {match.winner_school ? (
                              <Badge className="bg-success text-success-foreground">
                                <Trophy className="w-3 h-3 mr-1" />{match.winner_school.name}
                              </Badge>
                            ) : <span className="text-muted-foreground">TBD</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              </>
            )}

            {!hasHeats && (
              <div className="mb-8">
                <h2 className="font-display text-2xl text-foreground mb-4">PARTICIPANTS & RESULTS</h2>
                <ParticipantsTable participants={sortedParticipants} isTimed={game.is_timed} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GamePage;
