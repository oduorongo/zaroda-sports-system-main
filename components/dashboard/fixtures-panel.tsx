"use client";

import * as React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Shuffle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";
import { computeStandings, type BallSport, type MatchResult, type StandingRow } from "@/lib/scoring";

interface GameOption {
  id: string;
  name: string;
  category: string;
  isTimed: boolean;
  sport: BallSport | null;
}

interface TeamOption {
  id: string;
  name: string;
  gender: string;
  poolId: string | null;
}

interface PoolOption {
  id: string;
  name: string;
  _count: { teams: number };
}

interface MatchPoolRow {
  id: string;
  poolId: string | null;
  roundName: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  teamAScore: number | null;
  teamBScore: number | null;
  winnerId: string | null;
}

const BALL_SPORTS: BallSport[] = [
  "FOOTBALL",
  "BASKETBALL",
  "VOLLEYBALL",
  "HANDBALL",
  "RUGBY",
  "NETBALL",
  "CHESS",
  "TABLE_TENNIS",
  "BADMINTON",
];

const SPORT_LABELS: Record<BallSport, string> = {
  FOOTBALL: "Goals",
  BASKETBALL: "Points",
  VOLLEYBALL: "Sets",
  HANDBALL: "Goals",
  RUGBY: "Points",
  NETBALL: "Goals",
  CHESS: "Boards",
  TABLE_TENNIS: "Games",
  BADMINTON: "Games",
};

const KNOCKOUT_ROUND_PRESETS = ["Semi Final 1", "Semi Final 2", "Final", "3rd Place Playoff"];

function sportLabel(sport: string): string {
  return sport
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function FixtureRow({ fixture, onChanged }: { fixture: MatchPoolRow; onChanged: () => void }) {
  const [scoreA, setScoreA] = React.useState(fixture.teamAScore?.toString() ?? "");
  const [scoreB, setScoreB] = React.useState(fixture.teamBScore?.toString() ?? "");
  const [saving, setSaving] = React.useState(false);

  async function saveScores() {
    setSaving(true);
    try {
      await apiPatch(`/api/match-pools/${fixture.id}`, {
        teamAScore: scoreA === "" ? null : Number(scoreA),
        teamBScore: scoreB === "" ? null : Number(scoreB),
      });
      toast.success("Score saved");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save score");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await apiDelete(`/api/match-pools/${fixture.id}`);
      toast.success("Fixture removed");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove fixture");
    }
  }

  return (
    <TableRow>
      <TableCell className="text-muted">{fixture.roundName}</TableCell>
      <TableCell className={fixture.winnerId === fixture.teamAId ? "font-semibold text-gold" : ""}>{fixture.teamAName}</TableCell>
      <TableCell>
        <Input type="number" min={0} className="h-8 w-16" value={scoreA} onChange={(e) => setScoreA(e.target.value)} />
      </TableCell>
      <TableCell className="text-muted">-</TableCell>
      <TableCell>
        <Input type="number" min={0} className="h-8 w-16" value={scoreB} onChange={(e) => setScoreB(e.target.value)} />
      </TableCell>
      <TableCell className={fixture.winnerId === fixture.teamBId ? "font-semibold text-gold" : ""}>{fixture.teamBName}</TableCell>
      <TableCell>
        {fixture.winnerId === null && fixture.teamAScore !== null && fixture.teamBScore !== null && (
          <span className="text-sm text-muted">Draw</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" variant="secondary" onClick={saveScores} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button size="icon" variant="ghost" onClick={remove} className="ml-2">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function FixturesTable({ fixtures, onChanged, emptyMessage }: { fixtures: MatchPoolRow[]; onChanged: () => void; emptyMessage: string }) {
  if (fixtures.length === 0) return <p className="text-muted">{emptyMessage}</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Round</TableHead>
          <TableHead>Team A</TableHead>
          <TableHead />
          <TableHead />
          <TableHead />
          <TableHead>Team B</TableHead>
          <TableHead />
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {fixtures.map((f) => (
          <FixtureRow key={f.id} fixture={f} onChanged={onChanged} />
        ))}
      </TableBody>
    </Table>
  );
}

function StandingsTable({
  title,
  description,
  standings,
  sport,
  teamNameById,
}: {
  title: string;
  description?: string;
  standings: StandingRow[];
  sport: BallSport;
  teamNameById: Map<string, string>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>P</TableHead>
              <TableHead>W</TableHead>
              <TableHead>D</TableHead>
              <TableHead>L</TableHead>
              <TableHead>{SPORT_LABELS[sport]} For</TableHead>
              <TableHead>{SPORT_LABELS[sport]} Against</TableHead>
              <TableHead>+/-</TableHead>
              <TableHead>Pts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map((row, index) => (
              <TableRow key={row.teamId}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium">{teamNameById.get(row.teamId) ?? "Unknown team"}</TableCell>
                <TableCell>{row.played}</TableCell>
                <TableCell>{row.won}</TableCell>
                <TableCell>{row.drawn}</TableCell>
                <TableCell>{row.lost}</TableCell>
                <TableCell>{row.gf}</TableCell>
                <TableCell>{row.ga}</TableCell>
                <TableCell>{row.gd}</TableCell>
                <TableCell className="font-semibold text-gold">{row.points}</TableCell>
              </TableRow>
            ))}
            {standings.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted">No fixtures played yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function FixturesPanel({ championshipId }: { championshipId: string }) {
  const queryClient = useQueryClient();
  const [gameId, setGameId] = React.useState<string>("");
  const [teamAId, setTeamAId] = React.useState<string>("");
  const [teamBId, setTeamBId] = React.useState<string>("");
  const [roundName, setRoundName] = React.useState("Round 1");
  const [addOpen, setAddOpen] = React.useState(false);
  const [newPoolName, setNewPoolName] = React.useState("");

  const { data: gamesData } = useQuery({
    queryKey: ["games", championshipId],
    queryFn: () => apiGet<{ games: GameOption[] }>(`/api/games?championshipId=${championshipId}`),
  });
  const fixtureGames = (gamesData?.games ?? []).filter((g) => !g.isTimed);
  const selectedGame = fixtureGames.find((g) => g.id === gameId);

  const { data: teamsData } = useQuery({
    queryKey: ["tournament-teams", championshipId, gameId],
    queryFn: () => apiGet<{ teams: TeamOption[] }>(`/api/tournament-teams?championshipId=${championshipId}&gameId=${gameId}`),
    enabled: !!gameId,
  });
  const teams = teamsData?.teams ?? [];

  const { data: poolsData } = useQuery({
    queryKey: ["pools", gameId],
    queryFn: () => apiGet<{ pools: PoolOption[] }>(`/api/pools?gameId=${gameId}`),
    enabled: !!gameId,
  });
  const pools = poolsData?.pools ?? [];

  const { data: fixturesData, isLoading: fixturesLoading } = useQuery({
    queryKey: ["match-pools", gameId],
    queryFn: () => apiGet<{ matchPools: MatchPoolRow[] }>(`/api/match-pools?gameId=${gameId}`),
    enabled: !!gameId,
  });
  const fixtures = fixturesData?.matchPools ?? [];

  function refetchAll() {
    queryClient.invalidateQueries({ queryKey: ["match-pools", gameId] });
    queryClient.invalidateQueries({ queryKey: ["tournament-teams", championshipId, gameId] });
    queryClient.invalidateQueries({ queryKey: ["pools", gameId] });
  }

  const [fixSport, setFixSport] = React.useState<string>("");
  const setSportMutation = useMutation({
    mutationFn: () => apiPatch(`/api/games/${gameId}`, { sport: fixSport }),
    onSuccess: () => {
      toast.success("Sport saved");
      queryClient.invalidateQueries({ queryKey: ["games", championshipId] });
      setFixSport("");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to save sport"),
  });

  const addPoolMutation = useMutation({
    mutationFn: () => apiPost("/api/pools", { gameId, name: newPoolName }),
    onSuccess: () => {
      toast.success("Pool added");
      queryClient.invalidateQueries({ queryKey: ["pools", gameId] });
      setNewPoolName("");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to add pool"),
  });

  const deletePoolMutation = useMutation({
    mutationFn: (poolId: string) => apiDelete(`/api/pools/${poolId}`),
    onSuccess: () => {
      toast.success("Pool removed");
      refetchAll();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to remove pool"),
  });

  const assignPoolMutation = useMutation({
    mutationFn: ({ teamId, poolId }: { teamId: string; poolId: string | null }) =>
      apiPatch(`/api/tournament-teams/${teamId}`, { poolId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament-teams", championshipId, gameId] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to move team"),
  });

  const generateMutation = useMutation({
    mutationFn: (poolId: string | null) =>
      apiPost<{ created: number; rounds: number }>("/api/match-pools/generate", { gameId, poolId }),
    onSuccess: (result) => {
      toast.success(
        result.created > 0
          ? `Generated ${result.created} fixture${result.created === 1 ? "" : "s"} across ${result.rounds} round${result.rounds === 1 ? "" : "s"}`
          : "All fixtures for this group already exist",
      );
      refetchAll();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to generate fixtures"),
  });

  const addMutation = useMutation({
    mutationFn: () => apiPost("/api/match-pools", { gameId, roundName, teamAId, teamBId }),
    onSuccess: () => {
      toast.success("Fixture added");
      refetchAll();
      setAddOpen(false);
      setTeamAId("");
      setTeamBId("");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to add fixture"),
  });

  const teamNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const t of teams) map.set(t.id, t.name);
    for (const f of fixtures) {
      map.set(f.teamAId, f.teamAName);
      map.set(f.teamBId, f.teamBName);
    }
    return map;
  }, [teams, fixtures]);

  function standingsFor(teamIds: string[]): StandingRow[] {
    if (!selectedGame?.sport || teamIds.length === 0) return [];
    const teamIdSet = new Set(teamIds);
    const results: MatchResult[] = fixtures
      .filter((f) => f.teamAScore !== null && f.teamBScore !== null && teamIdSet.has(f.teamAId) && teamIdSet.has(f.teamBId))
      .map((f) => ({ teamAId: f.teamAId, teamBId: f.teamBId, teamAScore: f.teamAScore as number, teamBScore: f.teamBScore as number }));
    return computeStandings(teamIds, results, selectedGame.sport);
  }

  const unpooledTeams = teams.filter((t) => !t.poolId);
  const poolStageFixtures = fixtures.filter((f) => f.poolId !== null);
  const knockoutFixtures = fixtures.filter((f) => f.poolId === null);

  // Combined standings across every team in the game - shown when no pools
  // have been created yet (preserves the original simple flat-pool workflow).
  const combinedStandings = standingsFor(teams.map((t) => t.id));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fixtures &amp; Pooling</CardTitle>
          <CardDescription>Select a ball game/team event to manage its pools, fixtures, scores, and live standings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-64">
              <Label>Game</Label>
              <Select value={gameId} onValueChange={setGameId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select a game" /></SelectTrigger>
                <SelectContent>
                  {fixtureGames.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fixtureGames.length === 0 && (
                <p className="mt-1 text-xs text-muted">No non-timed games yet - add one in the Games tab first.</p>
              )}
            </div>

            {gameId && !selectedGame?.sport && (
              <div className="flex items-end gap-2">
                <div>
                  <Label className="text-red-400">Sport not set - pick one to enable standings</Label>
                  <Select value={fixSport} onValueChange={setFixSport}>
                    <SelectTrigger className="mt-1.5 w-40"><SelectValue placeholder="Sport" /></SelectTrigger>
                    <SelectContent>
                      {BALL_SPORTS.map((s) => (
                        <SelectItem key={s} value={s}>{sportLabel(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" disabled={!fixSport} onClick={() => setSportMutation.mutate()}>
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {gameId && (
        <Card>
          <CardHeader>
            <CardTitle>Pools</CardTitle>
            <CardDescription>
              Group teams into pools, generate a bye-aware round robin within each, then manually add knockout fixtures
              (semis, final) once pool play settles who advances.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-56">
                <Label htmlFor="new-pool-name">New pool name</Label>
                <Input
                  id="new-pool-name"
                  className="mt-1.5"
                  placeholder="Pool A"
                  value={newPoolName}
                  onChange={(e) => setNewPoolName(e.target.value)}
                />
              </div>
              <Button size="sm" disabled={!newPoolName.trim() || addPoolMutation.isPending} onClick={() => addPoolMutation.mutate()}>
                <Plus className="h-4 w-4" /> Add pool
              </Button>
            </div>

            {pools.length > 0 && (
              <div className="space-y-3">
                {pools.map((pool) => (
                  <div key={pool.id} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div>
                      <p className="font-medium text-foreground">{pool.name}</p>
                      <p className="text-sm text-muted">{pool._count.teams} team{pool._count.teams === 1 ? "" : "s"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={pool._count.teams < 2 || generateMutation.isPending}
                        onClick={() => generateMutation.mutate(pool.id)}
                      >
                        <Shuffle className="h-4 w-4" /> Generate round robin
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deletePoolMutation.mutate(pool.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <Label>Assign teams to pools</Label>
              <div className="mt-2 space-y-2">
                {teams.length === 0 && <p className="text-sm text-muted">No teams registered for this game yet.</p>}
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between rounded-md border border-border p-2.5">
                    <span className="text-sm text-foreground">{team.name}</span>
                    <Select
                      value={team.poolId ?? "none"}
                      onValueChange={(v) => assignPoolMutation.mutate({ teamId: team.id, poolId: v === "none" ? null : v })}
                    >
                      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No pool</SelectItem>
                        {pools.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {pools.length > 0 && (
              <Button
                size="sm"
                variant="secondary"
                disabled={unpooledTeams.length < 2 || generateMutation.isPending}
                onClick={() => generateMutation.mutate(null)}
              >
                <Shuffle className="h-4 w-4" /> Generate round robin for unpooled teams ({unpooledTeams.length})
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {gameId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pool Stage Fixtures</CardTitle>
              <CardDescription>Auto-generated round-robin matches within each pool.</CardDescription>
            </div>
            {pools.length === 0 && (
              <Button
                variant="secondary"
                disabled={teams.length < 2 || generateMutation.isPending}
                onClick={() => generateMutation.mutate(null)}
              >
                <Shuffle className="h-4 w-4" /> Generate round robin
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {fixturesLoading && <p className="text-muted">Loading fixtures...</p>}
            {!fixturesLoading && (
              <FixturesTable
                fixtures={poolStageFixtures}
                onChanged={refetchAll}
                emptyMessage="No pool-stage fixtures yet. Create a pool above (or generate directly if you're not using pools) to get started."
              />
            )}
          </CardContent>
        </Card>
      )}

      {gameId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Knockout Stage</CardTitle>
              <CardDescription>Manually pair teams that progress from pool play - semis, final, playoffs.</CardDescription>
            </div>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" /> Add fixture
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add a knockout fixture</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Round name</Label>
                    <Input className="mt-1.5" value={roundName} onChange={(e) => setRoundName(e.target.value)} />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {KNOCKOUT_ROUND_PRESETS.map((preset) => (
                        <Button key={preset} type="button" size="sm" variant="outline" onClick={() => setRoundName(preset)}>
                          {preset}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Team A</Label>
                      <Select value={teamAId} onValueChange={setTeamAId}>
                        <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select team" /></SelectTrigger>
                        <SelectContent>
                          {teams.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Team B</Label>
                      <Select value={teamBId} onValueChange={setTeamBId}>
                        <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select team" /></SelectTrigger>
                        <SelectContent>
                          {teams.filter((t) => t.id !== teamAId).map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!teamAId || !teamBId || addMutation.isPending}
                    onClick={() => addMutation.mutate()}
                  >
                    {addMutation.isPending ? "Adding..." : "Add fixture"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {fixturesLoading && <p className="text-muted">Loading fixtures...</p>}
            {!fixturesLoading && (
              <FixturesTable
                fixtures={knockoutFixtures}
                onChanged={refetchAll}
                emptyMessage="No knockout fixtures yet. Once pool standings show who's progressing, add the semi-final/final pairings here."
              />
            )}
          </CardContent>
        </Card>
      )}

      {gameId && selectedGame?.sport && pools.length > 0 && (
        <div className="space-y-6">
          {pools.map((pool) => (
            <StandingsTable
              key={pool.id}
              title={pool.name}
              standings={standingsFor(teams.filter((t) => t.poolId === pool.id).map((t) => t.id))}
              sport={selectedGame.sport as BallSport}
              teamNameById={teamNameById}
            />
          ))}
          {unpooledTeams.length > 0 && (
            <StandingsTable
              title="Unpooled teams"
              standings={standingsFor(unpooledTeams.map((t) => t.id))}
              sport={selectedGame.sport as BallSport}
              teamNameById={teamNameById}
            />
          )}
        </div>
      )}

      {gameId && selectedGame?.sport && pools.length === 0 && (
        <StandingsTable
          title="Standings"
          description={`Auto-updates from saved fixture scores using ${sportLabel(selectedGame.sport)} rules.`}
          standings={combinedStandings}
          sport={selectedGame.sport as BallSport}
          teamNameById={teamNameById}
        />
      )}
    </div>
  );
}
