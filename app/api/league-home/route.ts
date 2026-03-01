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
      code: true,
      status: true,
      tournamentYearId: true,
    },
  });

  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  const [members, picks, teams, standings, events] = await Promise.all([
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
        createdAt: true,
        memberId: true,
        member: { select: { displayName: true } },
        teamId: true,
        team: {
          select: { id: true, name: true, shortName: true, seed: true, region: true },
        },
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
      take: 40,
      select: { id: true, type: true, payload: true, createdAt: true },
    }),
  ]);

  const cookieStore = await cookies();
  const memberCookie = cookieStore.get(`cl_member_${leagueId}`)?.value ?? null;
  const me = memberCookie ? members.find((member) => member.id === memberCookie) ?? null : null;
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
    myPicks,
    standingsTop: Array.isArray(standings?.totals) ? standings?.totals : [],
    standingsUpdatedAt: standings?.updatedAt ?? null,
    events,
    allPicks: picks,
    teams,
  });
}
