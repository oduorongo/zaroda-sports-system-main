import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy, Medal, Award, ChevronLeft } from "lucide-react";
import { Loader2 } from "lucide-react";

interface Row {
  school_id: string;
  school_name: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
  points: number;
}

const MedalTable = () => {
  const [championshipId, setChampionshipId] = useState<string>("all");

  const { data: championships = [] } = useQuery({
    queryKey: ["championships"],
    queryFn: async () => {
      const { data } = await supabase
        .from("championships")
        .select("id, name")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: schools = [] } = useQuery({
    queryKey: ["schools-medal"],
    queryFn: async () => {
      const { data } = await supabase.from("schools").select("id, name");
      return data ?? [];
    },
  });

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["medal-results", championshipId],
    queryFn: async () => {
      let query = supabase
        .from("participants")
        .select("school_id, position, game_id, games!inner(championship_id)")
        .not("position", "is", null)
        .lte("position", 3);
      if (championshipId !== "all") {
        query = query.eq("games.championship_id", championshipId);
      }
      const { data } = await query;
      return (data ?? []) as Array<{
        school_id: string;
        position: number;
      }>;
    },
  });

  const rows = useMemo<Row[]>(() => {
    const bySchool = new Map<string, Row>();
    const schoolName = new Map(schools.map((s: any) => [s.id, s.name]));

    for (const r of results) {
      if (!r.school_id || !r.position) continue;
      const existing = bySchool.get(r.school_id) || {
        school_id: r.school_id,
        school_name: schoolName.get(r.school_id) || "Unknown",
        gold: 0,
        silver: 0,
        bronze: 0,
        total: 0,
        points: 0,
      };
      if (r.position === 1) existing.gold += 1;
      else if (r.position === 2) existing.silver += 1;
      else if (r.position === 3) existing.bronze += 1;
      existing.total = existing.gold + existing.silver + existing.bronze;
      existing.points = existing.gold * 3 + existing.silver * 2 + existing.bronze;
      bySchool.set(r.school_id, existing);
    }

    return Array.from(bySchool.values()).sort((a, b) => {
      if (b.gold !== a.gold) return b.gold - a.gold;
      if (b.silver !== a.silver) return b.silver - a.silver;
      if (b.bronze !== a.bronze) return b.bronze - a.bronze;
      return a.school_name.localeCompare(b.school_name);
    });
  }, [results, schools]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to home
        </Link>

        <header className="mb-8">
          <h1 className="font-display text-4xl text-foreground flex items-center gap-3">
            <Trophy className="w-9 h-9 text-secondary" />
            MEDAL TABLE
          </h1>
          <p className="text-muted-foreground mt-2">
            Schools ranked by gold, silver, and bronze medals across all events.
          </p>
        </header>

        <div className="mb-6 max-w-sm">
          <Select value={championshipId} onValueChange={setChampionshipId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All championships</SelectItem>
              {championships.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>School</TableHead>
                <TableHead className="text-center">
                  <Medal className="inline w-4 h-4 text-yellow-500" /> Gold
                </TableHead>
                <TableHead className="text-center">
                  <Medal className="inline w-4 h-4 text-gray-400" /> Silver
                </TableHead>
                <TableHead className="text-center">
                  <Medal className="inline w-4 h-4 text-amber-700" /> Bronze
                </TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin inline" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No medal results yet for this championship.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r, idx) => (
                  <TableRow key={r.school_id}>
                    <TableCell className="font-bold">
                      {idx === 0 && <Award className="inline w-4 h-4 text-yellow-500 mr-1" />}
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">{r.school_name}</TableCell>
                    <TableCell className="text-center font-semibold">{r.gold}</TableCell>
                    <TableCell className="text-center">{r.silver}</TableCell>
                    <TableCell className="text-center">{r.bronze}</TableCell>
                    <TableCell className="text-center font-semibold">{r.total}</TableCell>
                    <TableCell className="text-center font-bold text-secondary">
                      {r.points}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
};

export default MedalTable;
