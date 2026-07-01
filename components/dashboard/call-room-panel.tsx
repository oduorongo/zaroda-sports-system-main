"use client";

import * as React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, CheckCircle2, Ban, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiGet, apiPatch } from "@/lib/api-client";

interface GameOption {
  id: string;
  name: string;
  isTimed: boolean;
}

interface ParticipantRow {
  id: string;
  firstName: string;
  lastName: string;
  bibNumber: number;
  status: string;
  timeTaken: string | null;
  score: string | null;
  position: number | null;
}

function ParticipantRowEditor({ participant, gameId, isTimed }: { participant: ParticipantRow; gameId: string; isTimed: boolean }) {
  const queryClient = useQueryClient();
  const [resultValue, setResultValue] = React.useState("");
  const [position, setPosition] = React.useState("");

  const patchMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPatch(`/api/participants/${participant.id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-room-participants", gameId] });
      toast.success("Updated");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Update failed"),
  });

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-foreground">
          #{participant.bibNumber} - {participant.firstName} {participant.lastName}
        </p>
        <Badge variant={participant.status === "DISQUALIFIED" ? "destructive" : participant.status === "CONFIRMED_IN_CALL_ROOM" ? "success" : "outline"}>
          {participant.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={isTimed ? "Time (12.06 or 1:23.45)" : "Score"}
          value={resultValue}
          onChange={(e) => setResultValue(e.target.value)}
          className="w-40"
        />
        <Input placeholder="Position" value={position} onChange={(e) => setPosition(e.target.value)} className="w-24" />
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            patchMutation.mutate({
              timeInput: isTimed && resultValue ? resultValue : undefined,
              score: !isTimed && resultValue ? Number(resultValue) : undefined,
              position: position ? Number(position) : undefined,
            })
          }
        >
          <Save className="h-4 w-4" /> Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => patchMutation.mutate({ status: "CONFIRMED_IN_CALL_ROOM" })}
        >
          <CheckCircle2 className="h-4 w-4" /> Check in
        </Button>
        <Button size="sm" variant="destructive" onClick={() => patchMutation.mutate({ status: "DISQUALIFIED" })}>
          <Ban className="h-4 w-4" /> DQ
        </Button>
      </div>
    </div>
  );
}

export function CallRoomPanel({ championshipId }: { championshipId: string }) {
  const [gameId, setGameId] = React.useState("");
  const [search, setSearch] = React.useState("");

  const { data: gamesData } = useQuery({
    queryKey: ["games", championshipId],
    queryFn: () => apiGet<{ games: GameOption[] }>(`/api/games?championshipId=${championshipId}`),
  });

  const { data: participantsData } = useQuery({
    queryKey: ["call-room-participants", gameId],
    queryFn: () => apiGet<{ participants: ParticipantRow[] }>(`/api/participants?gameId=${gameId}`),
    enabled: !!gameId,
  });

  const filtered = (participantsData?.participants ?? []).filter(
    (p) => !search || p.bibNumber.toString().includes(search) || `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()),
  );
  const selectedGame = (gamesData?.games ?? []).find((g) => g.id === gameId);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Call Room</CardTitle>
        <div className="flex flex-1 flex-wrap items-center gap-3 sm:justify-end">
          <Select value={gameId} onValueChange={setGameId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a game" />
            </SelectTrigger>
            <SelectContent>
              {(gamesData?.games ?? []).map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              placeholder="Search bib or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!gameId && <p className="text-muted">Select a game to open its call room.</p>}
        {gameId && filtered.length === 0 && <p className="text-muted">No matching participants.</p>}
        {gameId &&
          filtered.map((p) => (
            <ParticipantRowEditor key={p.id} participant={p} gameId={gameId} isTimed={selectedGame?.isTimed ?? true} />
          ))}
      </CardContent>
    </Card>
  );
}
