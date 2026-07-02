import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAudit } from "@/lib/audit";
import { getAuthContext, requireChampionshipAccess, toErrorResponse } from "@/lib/authorize";
import { tournamentTeamSchema } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const championshipId = searchParams.get("championshipId");
    if (!championshipId) return NextResponse.json({ error: "championshipId is required" }, { status: 400 });

    const teams = await prisma.tournamentTeam.findMany({ where: { championshipId }, orderBy: { name: "asc" } });
    return NextResponse.json({ teams });
  } catch (error) {
    const { body, status } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

/**
 * Open-tournament teams may self-register without authentication (they pay
 * their entry fee directly via /api/payments/initialize with mode
 * "team_fee"). Tenant staff can also add teams from the dashboard.
 */
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const input = tournamentTeamSchema.parse(body);

    const championship = await prisma.championship.findUnique({ where: { id: input.championshipId } });
    if (!championship) return NextResponse.json({ error: "Championship not found" }, { status: 404 });

    const ctx = await getAuthContext();
    if (ctx) {
      await requireChampionshipAccess(input.championshipId, ["TOURNAMENT_ADMIN"]);
    }
    // else: unauthenticated public self-registration (open-tournament teams paying their own entry fee)

    const team = await withAudit({
      actorId: ctx?.userId ?? null,
      operation: "INSERT",
      tableName: "tournament_teams",
      mutate: (tx) =>
        tx.tournamentTeam.create({
          data: {
            championshipId: input.championshipId,
            name: input.name,
            teamCode: input.teamCode,
            gender: input.gender,
            teamColor: input.teamColor ?? null,
            contactName: input.contactName ?? null,
            contactEmail: input.contactEmail ?? null,
            contactPhone: input.contactPhone ?? null,
            notes: input.notes ?? null,
          },
        }),
      recordId: (result) => result.id,
      newData: input,
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "That team code is already used in this championship" }, { status: 409 });
    }
    const { body, status } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
