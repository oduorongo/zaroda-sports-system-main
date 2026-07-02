"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PanelErrorBoundary } from "@/components/error-boundary";
import { apiGet } from "@/lib/api-client";
import { SCHOOL_LEVELS } from "@/lib/school-levels";

interface ChampionshipOption {
  id: string;
  name: string;
}

interface RankingRow {
  schoolId: string;
  schoolName: string;
  boysTrack: number;
  boysField: number;
  boysTotal: number;
  girlsTrack: number;
  girlsField: number;
  girlsTotal: number;
  mixedTotal: number;
  grandTotal: number;
  position: number;
}

const SCHOOL_LEVEL_FILTERS = [{ value: "OVERALL", label: "Overall" }, ...SCHOOL_LEVELS];

function RankingsExplorer() {
  const [championshipId, setChampionshipId] = React.useState<string>("");
  const [schoolLevel, setSchoolLevel] = React.useState("OVERALL");

  const { data: championships } = useQuery({
    queryKey: ["championships-public"],
    queryFn: () => apiGet<{ championships: ChampionshipOption[] }>("/api/championships"),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["rankings", championshipId, schoolLevel],
    queryFn: () => apiGet<{ standings: RankingRow[] }>(`/api/rankings?championshipId=${championshipId}&schoolLevel=${schoolLevel}`),
    enabled: !!championshipId,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <Select value={championshipId} onValueChange={setChampionshipId}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Choose a championship" />
          </SelectTrigger>
          <SelectContent>
            {(championships?.championships ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={schoolLevel} onValueChange={setSchoolLevel}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCHOOL_LEVEL_FILTERS.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!championshipId && <p className="text-muted">Select a championship to view its standings.</p>}
      {championshipId && isLoading && <p className="text-muted">Loading standings...</p>}

      {championshipId && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Standings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Boys Track</TableHead>
                  <TableHead>Boys Field</TableHead>
                  <TableHead>Boys Total</TableHead>
                  <TableHead>Girls Track</TableHead>
                  <TableHead>Girls Field</TableHead>
                  <TableHead>Girls Total</TableHead>
                  <TableHead>Grand Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.standings ?? []).map((row) => (
                  <TableRow key={row.schoolId}>
                    <TableCell>{row.position}</TableCell>
                    <TableCell className="font-medium">{row.schoolName}</TableCell>
                    <TableCell>{row.boysTrack}</TableCell>
                    <TableCell>{row.boysField}</TableCell>
                    <TableCell>{row.boysTotal}</TableCell>
                    <TableCell>{row.girlsTrack}</TableCell>
                    <TableCell>{row.girlsField}</TableCell>
                    <TableCell>{row.girlsTotal}</TableCell>
                    <TableCell className="font-semibold text-gold">{row.grandTotal}</TableCell>
                  </TableRow>
                ))}
                {(data?.standings ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted">
                      No final results yet for this championship.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function RankingsPage() {
  return (
    <div className="container py-16">
      <h1 className="text-3xl font-bold text-foreground">Rankings</h1>
      <p className="mt-2 text-muted">County/regional-style standings, filterable by school level.</p>
      <div className="mt-8">
        <PanelErrorBoundary fallbackTitle="Rankings failed to load">
          <RankingsExplorer />
        </PanelErrorBoundary>
      </div>
    </div>
  );
}
