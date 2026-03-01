import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leagueId = String(searchParams.get("leagueId") || "").trim();

  if (!leagueId) {
    return NextResponse.json({ error: "Missing leagueId" }, { status: 400 });
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      id: true,
      name: true,
      status: true,
      code: true,
      tournamentYearId: true,
    },
  });

  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  const [members, picks, teams, score, events, teamResults, games] = await Promise.all([
    prisma.leagueMember.findMany({
      where: { leagueId },
      select: {
        id: true,
        displayName: true,
        isAdmin: true,
        draftPosition: true,
      },
      orderBy: [{ draftPosition: "asc" }, { createdAt: "asc" }],
    }),
    prisma.draftPick.findMany({
      where: { leagueId },
      select: {
        id: true,
        role: true,
        pickNumber: true,
        memberId: true,
        createdAt: true,
        teamId: true,
        member: { select: { displayName: true } },
        team: { select: { id: true, name: true, shortName: true, seed: true, region: true } },
      },
      orderBy: [{ pickNumber: "asc" }, { createdAt: "asc" }],
    }),
    prisma.team.findMany({
      where: { tournamentYearId: league.tournamentYearId },
      select: { id: true, name: true, shortName: true, seed: true, region: true },
      orderBy: [{ region: "asc" }, { seed: "asc" }, { name: "asc" }],
    }),
    prisma.leagueScore.findUnique({
      where: { leagueId },
      select: { updatedAt: true, totals: true },
    }),
    prisma.leagueEvent.findMany({
      where: { leagueId },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { id: true, type: true, payload: true, createdAt: true },
    }),
    prisma.teamResult.findMany({
      where: { leagueId },
      select: {
        id: true,
        teamId: true,
        wins: true,
        eliminatedRound: true,
        updatedAt: true,
      },
    }),
    prisma.tournamentGame.findMany({
      where: { leagueId },
      select: {
        id: true,
        round: true,
        gameNo: true,
        winnerTeamId: true,
        loserTeamId: true,
        createdAt: true,
      },
      orderBy: [{ round: "asc" }, { gameNo: "asc" }],
    }),
  ]);

  const cookieStore = await cookies();
  const memberId = cookieStore.get(`cl_member_${leagueId}`)?.value ?? null;
  const me = memberId ? members.find((member) => member.id === memberId) ?? null : null;
  const myPicks = me ? picks.filter((pick) => pick.memberId === me.id) : [];

  return NextResponse.json({
    league,
    me: me
      ? {
          memberId: me.id,
          displayName: me.displayName,
          isAdmin: me.isAdmin,
          draftPosition: me.draftPosition,
        }
      : null,
    members,
    picks,
    myPicks,
    teams,
    standingsSummary: Array.isArray(score?.totals) ? score.totals : [],
    standingsUpdatedAt: score?.updatedAt ?? null,
    events,
    teamResults,
    games,
  });
}
