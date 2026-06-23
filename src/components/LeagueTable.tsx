import { useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

interface MatchPool {
  id: string;
  team_a_school_id: string | null;
  team_b_school_id: string | null;
  team_a_score: number | null;
  team_b_score: number | null;
  team_a_school?: { name: string } | null;
  team_b_school?: { name: string } | null;
}

interface Props {
  matches: MatchPool[];
  championshipName?: string;
  zoneName?: string;
  asOfDate?: string;
}

interface Row {
  team: string;
  P: number; W: number; D: number; L: number;
  F: number; A: number; GD: number; PTS: number;
}

function computeStandings(matches: MatchPool[]): Row[] {
  const map = new Map<string, Row>();
  const ensure = (name: string) => {
    if (!map.has(name)) map.set(name, { team: name, P: 0, W: 0, D: 0, L: 0, F: 0, A: 0, GD: 0, PTS: 0 });
    return map.get(name)!;
  };
  for (const m of matches) {
    if (m.team_a_score == null || m.team_b_score == null) continue;
    const aName = m.team_a_school?.name; const bName = m.team_b_school?.name;
    if (!aName || !bName) continue;
    const a = ensure(aName); const b = ensure(bName);
    a.P++; b.P++;
    a.F += m.team_a_score; a.A += m.team_b_score;
    b.F += m.team_b_score; b.A += m.team_a_score;
    if (m.team_a_score > m.team_b_score) { a.W++; a.PTS += 3; b.L++; }
    else if (m.team_a_score < m.team_b_score) { b.W++; b.PTS += 3; a.L++; }
    else { a.D++; b.D++; a.PTS++; b.PTS++; }
  }
  for (const r of map.values()) r.GD = r.F - r.A;
  return [...map.values()].sort((x, y) => y.PTS - x.PTS || y.GD - x.GD || y.F - x.F || x.team.localeCompare(y.team));
}

export function LeagueTable({ matches, championshipName, zoneName, asOfDate }: Props) {
  const rows = useMemo(() => computeStandings(matches), [matches]);
  const ref = useRef<HTMLDivElement>(null);

  if (rows.length === 0) return null;

  const downloadCSV = () => {
    const header = ["POS","TEAM","P","W","D","L","F","A","GD","PTS"];
    const lines = [header.join(",")];
    rows.forEach((r, i) => lines.push([i+1, `"${r.team}"`, r.P, r.W, r.D, r.L, r.F, r.A, (r.GD>=0?`+${r.GD}`:r.GD), r.PTS].join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(zoneName || championshipName || "league").replace(/\s+/g,"_")}_standings.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  const print = () => {
    const html = ref.current?.outerHTML || "";
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>League Standings</title>
      <style>
        body{font-family:Georgia,serif;padding:24px;background:#ece7f0;}
        .wrap{max-width:900px;margin:auto;background:transparent;}
        h1{text-align:center;font-weight:900;letter-spacing:1px;margin:8px 0;}
        .zone{background:#c0392b;color:#fff;text-align:center;padding:10px;font-weight:800;font-size:20px;border-radius:4px;}
        .as-of{background:#1f4e9d;color:#fff;text-align:center;padding:8px;font-weight:700;margin:6px auto 16px;width:60%;border-radius:4px;}
        table{width:100%;border-collapse:collapse;background:#fff;}
        th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left;font-size:14px;}
        th{background:#f3f3f3;font-weight:800;}
        .num{text-align:center;}
        tr.first td{background:#1e7e34;color:#fff;font-weight:700;}
        tr.second td{background:#a3d9a5;font-weight:700;}
        tr.last td{background:#c0392b;color:#fff;font-weight:700;}
      </style></head><body><div class="wrap">${html}</div>
      <script>window.onload=()=>setTimeout(()=>window.print(),200);</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-2xl text-foreground">LEAGUE STANDINGS</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={downloadCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          <Button size="sm" variant="default" onClick={print}><Printer className="w-4 h-4 mr-1" />Download / Print</Button>
        </div>
      </div>

      <div ref={ref} className="bg-card border border-border rounded-xl overflow-hidden">
        {championshipName && (
          <h1 className="text-center font-display text-2xl py-3">{championshipName}</h1>
        )}
        {zoneName && (
          <div className="zone bg-destructive text-destructive-foreground text-center py-2 font-bold uppercase tracking-wide">
            {zoneName} Table Standing
          </div>
        )}
        {asOfDate && (
          <div className="as-of bg-primary text-primary-foreground text-center py-2 font-semibold mx-auto my-2 w-3/5 rounded">
            League Standings As At {asOfDate}
          </div>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="num p-2">POS</th>
              <th className="text-left p-2">TEAM</th>
              <th className="num p-2">P</th>
              <th className="num p-2">W</th>
              <th className="num p-2">D</th>
              <th className="num p-2">L</th>
              <th className="num p-2">F</th>
              <th className="num p-2">A</th>
              <th className="num p-2">GD</th>
              <th className="num p-2">PTS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const cls = i === 0 ? "first bg-success text-success-foreground font-semibold"
                : i === 1 ? "second bg-success/30 font-semibold"
                : i === rows.length - 1 ? "last bg-destructive text-destructive-foreground font-semibold"
                : "";
              return (
                <tr key={r.team} className={`${cls} border-b border-border`}>
                  <td className="num p-2 text-center">{i+1}</td>
                  <td className="p-2 font-medium">{r.team}</td>
                  <td className="num p-2 text-center">{r.P}</td>
                  <td className="num p-2 text-center">{r.W}</td>
                  <td className="num p-2 text-center">{r.D}</td>
                  <td className="num p-2 text-center">{r.L}</td>
                  <td className="num p-2 text-center">{r.F}</td>
                  <td className="num p-2 text-center">{r.A}</td>
                  <td className="num p-2 text-center">{r.GD >= 0 ? `+${r.GD}` : r.GD}</td>
                  <td className="num p-2 text-center font-bold">{r.PTS}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
