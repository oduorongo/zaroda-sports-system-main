import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, isSuperAdmin, hasRole, toErrorResponse } from "@/lib/authorize";

interface MedalRow {
  entityId: string;
  entityName: string;
  gold: number;
  silver: number;
  bronze: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const championshipId = searchParams.get("championshipId");
    if (!championshipId) return NextResponse.json({ error: "championshipId is required" }, { status: 400 });

    const championship = await prisma.championship.findUnique({ where: { id: championshipId } });
    if (!championship) return NextResponse.json({ error: "Championship not found" }, { status: 404 });

    if (!championship.isPublished) {
      const ctx = await getAuthContext();
      const owns = ctx && (isSuperAdmin(ctx) || (hasRole(ctx, "TENANT_OWNER") && ctx.tenantId === championship.tenantId));
      if (!owns) return NextResponse.json({ error: "Championship not found" }, { status: 404 });
    }

    const participants = await prisma.participant.findMany({
      where: { championshipId, position: { in: [1, 2, 3] } },
      include: {
        school: { select: { id: true, name: true } },
        tournamentTeam: { select: { id: true, name: true } },
      },
    });

    const rows = new Map<string, MedalRow>();
    for (const p of participants) {
      const entityId = p.schoolId ?? p.tournamentTeamId;
      if (!entityId) continue;
      if (!rows.has(entityId)) {
        rows.set(entityId, {
          entityId,
          entityName: p.school?.name ?? p.tournamentTeam?.name ?? "Unknown",
          gold: 0,
          silver: 0,
          bronze: 0,
        });
      }
      const row = rows.get(entityId) as MedalRow;
      if (p.position === 1) row.gold++;
      else if (p.position === 2) row.silver++;
      else if (p.position === 3) row.bronze++;
    }

    const medalTable = Array.from(rows.values())
      .sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze)
      .map((row, index) => ({ ...row, position: index + 1, total: row.gold + row.silver + row.bronze }));

    return NextResponse.json({ medalTable });
  } catch (error) {
    const { body, status } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
