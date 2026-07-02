"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PanelErrorBoundary } from "@/components/error-boundary";
import { apiGet } from "@/lib/api-client";
import { GAME_SCHOOL_LEVELS } from "@/lib/school-levels";

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

const SCHOOL_LEVEL_FILTERS = [{ value: "OVERALL", label: "Overall" }, ...GAME_SCHOOL_LEVELS];

function StandingsTable({ championshipId }: { championshipId: string }) {
  const [schoolLevel, setSchoolLevel] = React.useState("OVERALL");

  const { data, isLoading } = useQuery({
    queryKey: ["rankings", championshipId, schoolLevel],
    queryFn: () =>
      apiGet<{ standings: RankingRow[] }>(
        `/api/rankings?championshipId=${championshipId}&schoolLevel=${schoolLevel}`,
      ),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
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

      {isLoading && <p className="text-muted">Loading standings...</p>}

      {!isLoading && (
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
                  No final results yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export function StandingsPanel({ championshipId }: { championshipId: string }) {
  return (
    <PanelErrorBoundary fallbackTitle="Standings failed to load">
      <StandingsTable championshipId={championshipId} />
    </PanelErrorBoundary>
  );
}
