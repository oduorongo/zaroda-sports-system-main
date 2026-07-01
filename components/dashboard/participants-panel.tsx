"use client";

import * as React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { participantCreateSchema, type ParticipantCreateInput } from "@/lib/validations";
import { apiGet, apiPost } from "@/lib/api-client";

interface GameOption {
  id: string;
  name: string;
  isTimed: boolean;
}

interface SchoolOption {
  id: string;
  name: string;
}

interface ParticipantRow {
  id: string;
  firstName: string;
  lastName: string;
  bibNumber: number;
  gender: string;
  status: string;
  school: { name: string } | null;
  tournamentTeam: { name: string } | null;
}

export function ParticipantsPanel({ championshipId }: { championshipId: string }) {
  const queryClient = useQueryClient();
  const [gameId, setGameId] = React.useState<string>("");
  const [open, setOpen] = React.useState(false);

  const { data: gamesData } = useQuery({
    queryKey: ["games", championshipId],
    queryFn: () => apiGet<{ games: GameOption[] }>(`/api/games?championshipId=${championshipId}`),
  });
  const { data: schoolsData } = useQuery({
    queryKey: ["schools"],
    queryFn: () => apiGet<{ schools: SchoolOption[] }>("/api/schools"),
  });

  const { data: participantsData, isLoading } = useQuery({
    queryKey: ["participants", gameId],
    queryFn: () => apiGet<{ participants: ParticipantRow[] }>(`/api/participants?gameId=${gameId}`),
    enabled: !!gameId,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ParticipantCreateInput>({
    resolver: zodResolver(participantCreateSchema),
    defaultValues: { championshipId, gameId, gender: "BOYS" },
  });

  React.useEffect(() => {
    setValue("gameId", gameId);
  }, [gameId, setValue]);

  const createMutation = useMutation({
    mutationFn: (values: ParticipantCreateInput) => apiPost("/api/participants", values),
    onSuccess: () => {
      toast.success("Participant registered");
      queryClient.invalidateQueries({ queryKey: ["participants", gameId] });
      setOpen(false);
      reset({ championshipId, gameId, gender: "BOYS" });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to register participant"),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <CardTitle className="shrink-0">Participants</CardTitle>
          <Select value={gameId} onValueChange={setGameId}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Select a game" />
            </SelectTrigger>
            <SelectContent>
              {(gamesData?.games ?? []).map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!gameId}>
              <UserPlus className="h-4 w-4" /> Register
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register participant</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" className="mt-1.5" {...register("firstName")} />
                  {errors.firstName && <p className="mt-1 text-sm text-red-400">{errors.firstName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" className="mt-1.5" {...register("lastName")} />
                  {errors.lastName && <p className="mt-1 text-sm text-red-400">{errors.lastName.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Gender</Label>
                  <Select value={watch("gender")} onValueChange={(v) => setValue("gender", v as ParticipantCreateInput["gender"])}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BOYS">Boys</SelectItem>
                      <SelectItem value="GIRLS">Girls</SelectItem>
                      <SelectItem value="MIXED">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>School</Label>
                  <Select value={watch("schoolId") ?? ""} onValueChange={(v) => setValue("schoolId", v)}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select school" /></SelectTrigger>
                    <SelectContent>
                      {(schoolsData?.schools ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="bibNumber">Bib number (optional - auto-assigned from school range)</Label>
                  <Input id="bibNumber" type="number" className="mt-1.5" {...register("bibNumber", { valueAsNumber: true })} />
                </div>
                <div>
                  <Label htmlFor="personalBest">Personal best (e.g. 12.06 or 1:23.45)</Label>
                  <Input id="personalBest" className="mt-1.5" {...register("personalBest")} />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Registering..." : "Register participant"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {!gameId && <p className="text-muted">Select a game to view its participants.</p>}
        {gameId && isLoading && <p className="text-muted">Loading participants...</p>}
        {gameId && !isLoading && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bib</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(participantsData?.participants ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.bibNumber}</TableCell>
                  <TableCell>{p.firstName} {p.lastName}</TableCell>
                  <TableCell>{p.school?.name ?? p.tournamentTeam?.name ?? "-"}</TableCell>
                  <TableCell>{p.gender}</TableCell>
                  <TableCell>{p.status.replace(/_/g, " ")}</TableCell>
                </TableRow>
              ))}
              {(participantsData?.participants ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted">No participants registered yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
