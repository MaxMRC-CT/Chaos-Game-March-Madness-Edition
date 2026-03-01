import { prisma } from "@/lib/db";
import { getRoleForPick } from "@/lib/draft/rules";
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
      status: true,
      currentPick: true, // stored value (we won't trust it for UI)
      code: true,
      tournamentYearId: true,
    },
  });

  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  const [members, picks, teams, score, events] = await Promise.all([
    prisma.leagueMember.findMany({
      where: { leagueId },
      select: {
        id: true,
        displayName: true,
        draftPosition: true,
        isAdmin: true,
        createdAt: true,
      },
      orderBy: [{ draftPosition: "asc" }, { createdAt: "asc" }],
    }),
    prisma.draftPick.findMany({
      where: { leagueId },
      select: {
        id: true,
        pickNumber: true,
        memberId: true,
        role: true,
        createdAt: true,
        team: {
          select: {
            id: true,
            name: true,
            shortName: true,
            seed: true,
            region: true,
          },
        },
      },
      orderBy: [{ pickNumber: "asc" }, { createdAt: "asc" }],
    }),
    prisma.team.findMany({
      where: { tournamentYearId: league.tournamentYearId },
      select: {
        id: true,
        name: true,
        shortName: true,
        seed: true,
        region: true,
      },
      orderBy: [{ seed: "asc" }, { name: "asc" }],
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
  ]);

  // Who is "me"?
  const cookieStore = await cookies();
  const cookieMemberId = cookieStore.get(`cl_member_${leagueId}`)?.value ?? null;
  const me = cookieMemberId
    ? members.find((member) => member.id === cookieMemberId) ?? null
    : null;

  // Draft players = members who have a draft position assigned
  const draftMembers = members.filter((m) => m.draftPosition !== null);
  const players = Math.max(draftMembers.length, 1);

  // Derive "truth" from picks
  const nextPickNumber = picks.length + 1;
  const totalDraftPicks = players * 3; // HERO, VILLAIN, CINDERELLA
  const currentRole = getRoleForPick(nextPickNumber, players);

  // Available teams = all teams minus picked teams
  const pickedTeamIds = new Set(picks.map((p) => p.team.id));
  const availableTeams = teams.filter((t) => !pickedTeamIds.has(t.id));

  // Helpful warning when seed data is insufficient
  let warning: string | null = null;
  if (teams.length < totalDraftPicks) {
    warning = `Not enough teams seeded for this draft: need at least ${totalDraftPicks} teams for ${players} players (3 picks each), but only ${teams.length} teams exist for this tournament year.`;
  }

  return NextResponse.json({
    league: {
      id: league.id,
      status: league.status,
      // IMPORTANT: return computed pick number so UI doesn't show "Pick #1" incorrectly
      currentPick: nextPickNumber,
      code: league.code,
    },
    draftMeta: {
      players,
      nextPickNumber,
      totalDraftPicks,
      remainingPicks: Math.max(totalDraftPicks - picks.length, 0),
      teamsTotal: teams.length,
      teamsAvailable: availableTeams.length,
      warning,
    },
    currentRole,
    me: me
      ? {
          memberId: me.id,
          draftPosition: me.draftPosition,
          displayName: me.displayName,
          isAdmin: me.isAdmin,
        }
      : null,
    members: members.map(({ createdAt, ...rest }) => rest),
    picks,
    availableTeams,
    standingsSummary: score?.totals ?? [],
    standingsUpdatedAt: score?.updatedAt ?? null,
    events,
  });
}