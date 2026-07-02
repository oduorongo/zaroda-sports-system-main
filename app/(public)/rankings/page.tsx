"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PanelErrorBoundary } from "@/components/error-boundary";
import { StandingsPanel } from "@/components/championship/standings-panel";
import { apiGet } from "@/lib/api-client";

interface ChampionshipOption {
  id: string;
  name: string;
}

function RankingsExplorer() {
  const [championshipId, setChampionshipId] = React.useState<string>("");

  const { data: championships } = useQuery({
    queryKey: ["championships-public"],
    queryFn: () => apiGet<{ championships: ChampionshipOption[] }>("/api/championships"),
  });

  return (
    <div className="space-y-6">
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

      {!championshipId && <p className="text-muted">Select a championship to view its standings.</p>}
      {championshipId && <StandingsPanel championshipId={championshipId} />}
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
