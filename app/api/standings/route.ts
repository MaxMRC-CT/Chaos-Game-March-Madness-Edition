import { prisma } from "@/lib/db";
import { computeLeagueStandings } from "@/lib/scoring/compute";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leagueId = String(searchParams.get("leagueId") || "").trim();

  if (!leagueId) {
    return NextResponse.json({ error: "Missing leagueId" }, { status: 400 });
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true },
  });
  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  let score = await prisma.leagueScore.findUnique({
    where: { leagueId },
    select: { updatedAt: true, totals: true },
  });
  if (!score) {
    const computed = await computeLeagueStandings(leagueId);
    score = {
      updatedAt: new Date(),
      totals: computed,
    };
  }

  const events = await prisma.leagueEvent.findMany({
    where: { leagueId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, type: true, payload: true, createdAt: true },
  });

  return NextResponse.json({
    updatedAt: score.updatedAt,
    standings: score.totals,
    events,
  });
}
