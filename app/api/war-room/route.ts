export const runtime = "nodejs";

import { Round } from "@prisma/client";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  computeCinderellaPoints,
  computeHeroPoints,
  computeVillainPoints,
} from "@/lib/scoring/compute";
import { getBracketConfig } from "@/lib/bracket/config";

const ROUND_ORDER: Round[] = ["R64", "R32", "S16", "E8", "F4", "FINAL"];
const HIGHLIGHT_TYPES = new Set(["RIVALRY_BONUS", "TEAM_ELIMINATED", "SCORE_RECALCULATED"]);

type StandingRow = {
  memberId: string;
  displayName: string;
  total: number;
  HERO?: number;
  VILLAIN?: number;
  CINDERELLA?: number;
  rivalry?: number;
  championshipPrediction?: number | null;
};

type Ownership = {
  role: "HERO" | "VILLAIN" | "CINDERELLA";
  ownerDisplayName: string;
  ownerMemberId: string;
};

type TeamLite = {
  id: string;
  name: string;
  shortName: string | null;
  seed: number;
  region: string;
};

type TeamResultLite = {
  teamId: string;
  wins: number;
  eliminatedRound: Round | null;
};

function isMissingTableError(error: unknown, tableName: string) {
  if (typeof error !== "object" || error === null) return false;
  const e = error as { code?: string; meta?: { table?: string } };
  return e.code === "P2021" && e.meta?.table?.includes(tableName);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = String(searchParams.get("leagueId") || "").trim();
    const mode = String(searchParams.get("mode") || "all").trim() as "all" | "highlights";
    const limitRaw = Number(searchParams.get("limit") || 15);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 30) : 15;

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
        currentPick: true,
        tournamentYear: { select: { year: true } },
      },
    });

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    const [members, picks, teams, teamResults, games, score, allRecentEvents] = await Promise.all([
      prisma.leagueMember.findMany({
        where: { leagueId },
        select: {
          id: true,
          displayName: true,
          isAdmin: true,
          draftPosition: true,
          deviceToken: true,
          championshipPrediction: true,
        },
        orderBy: [{ draftPosition: "asc" }, { createdAt: "asc" }],
      }),
      prisma.portfolioPick.findMany({
        where: { leagueId },
        select: {
          id: true,
          role: true,
          memberId: true,
          teamId: true,
          createdAt: true,
          member: { select: { displayName: true } },
          team: { select: { id: true, name: true, shortName: true, seed: true, region: true } },
        },
        orderBy: [{ createdAt: "asc" }],
      }),
      prisma.team.findMany({
        where: { tournamentYearId: league.tournamentYearId },
        select: { id: true, name: true, shortName: true, seed: true, region: true },
        orderBy: [{ region: "asc" }, { seed: "asc" }, { name: "asc" }],
      }),
      prisma.teamResult.findMany({
        where: { leagueId },
        select: { id: true, teamId: true, wins: true, eliminatedRound: true, updatedAt: true },
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
          winner: { select: { id: true, name: true, seed: true, region: true } },
          loser: { select: { id: true, name: true, seed: true, region: true } },
        },
        orderBy: [{ round: "asc" }, { gameNo: "asc" }],
      }),
      prisma.leagueScore.findUnique({
        where: { leagueId },
        select: { totals: true, updatedAt: true },
      }),
      prisma.leagueEvent.findMany({
        where: { leagueId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, type: true, payload: true, createdAt: true },
      }),
    ]);

    let snapshots: Array<{ totals: unknown; createdAt: Date }> = [];
    try {
      snapshots = await prisma.leagueScoreSnapshot.findMany({
        where: { leagueId },
        orderBy: { createdAt: "desc" },
        take: 2,
        select: { totals: true, createdAt: true },
      });
    } catch (error) {
      if (!isMissingTableError(error, "LeagueScoreSnapshot")) {
        throw error;
      }
      snapshots = [];
    }

    const cookieStore = await cookies();
    const memberId = cookieStore.get(`cl_member_${leagueId}`)?.value ?? null;
    const me = memberId ? members.find((member) => member.id === memberId) ?? null : null;

    const ownershipMap = picks.reduce<Record<string, Ownership[]>>((acc, pick) => {
      const o: Ownership = {
        role: pick.role,
        ownerDisplayName: pick.member.displayName,
        ownerMemberId: pick.memberId,
      };
      if (!acc[pick.teamId]) acc[pick.teamId] = [];
      acc[pick.teamId].push(o);
      return acc;
    }, {});

    const standings = normalizeStandings(score?.totals, members.map((m) => ({ id: m.id, displayName: m.displayName, championshipPrediction: m.championshipPrediction })));
    const standingsDelta = computeStandingsDelta(snapshots, members);

    const highlightEvents = allRecentEvents
      .filter((event) => HIGHLIGHT_TYPES.has(event.type))
      .slice(0, limit);
    const recentEvents = (mode === "highlights" ? highlightEvents : allRecentEvents).slice(0, limit);

    const resultByTeamId = new Map(teamResults.map((result) => [result.teamId, result]));
    const currentRound = deriveCurrentRound(games);

    const hotSeatMatchups = buildHotSeatMatchups({
      games,
      teams,
      ownershipMap,
      resultByTeamId,
      currentRound,
    });

    const picksWithPickNumber = picks.map((p, i) => ({ ...p, pickNumber: i + 1 }));
    const myPicks = me ? picksWithPickNumber.filter((pick) => pick.memberId === me.id) : [];

    const roundCounts =
      process.env.ENV_NAME === "development"
        ? (() => {
            const c: Record<string, number> = { R64: 0, R32: 0, S16: 0, E8: 0, F4: 0, NCG: 0 };
            for (const g of games) {
              const key = g.round === "FINAL" ? "NCG" : g.round;
              if (key in c) c[key]++;
            }
            return c;
          })()
        : undefined;

    const year = league.tournamentYear?.year ?? new Date().getFullYear();
    const bracketConfig = getBracketConfig(year);

    return NextResponse.json({
      league: {
        id: league.id,
        name: league.name,
        status: league.status,
        code: league.code,
        currentPick: league.currentPick,
        currentRound,
        tournamentYear: league.tournamentYear ? { year: league.tournamentYear.year } : undefined,
      },
      bracketConfig,
      me: me
        ? {
            memberId: me.id,
            displayName: me.displayName,
            isAdmin: me.isAdmin,
            draftPosition: me.draftPosition,
            hasReconnectToken: Boolean(me.deviceToken),
            championshipPrediction: me.championshipPrediction,
          }
        : null,
      members: members.map((member) => ({
        id: member.id,
        displayName: member.displayName,
        isAdmin: member.isAdmin,
        draftPosition: member.draftPosition,
      })),
      picks: picksWithPickNumber,
      myPicks,
      teams,
      teamResults,
      games,
      standings,
      standingsDelta,
      standingsUpdatedAt: score?.updatedAt ?? null,
      recentEvents,
      highlightEvents,
      hotSeatMatchups,
      ownershipMap,
      ...(roundCounts != null && { roundCounts }),
    });
  } catch (error: unknown) {
    console.error("WAR ROOM API ERROR:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not load war room state",
      },
      { status: 500 },
    );
  }
}

function normalizeStandings(
  rawTotals: unknown,
  members: Array<{ id: string; displayName: string; championshipPrediction: number | null }>,
) {
  const predictionByMemberId = new Map(members.map((m) => [m.id, m.championshipPrediction]));

  if (!Array.isArray(rawTotals)) {
    return members
      .map((member) => ({
        memberId: member.id,
        displayName: member.displayName,
        total: 0,
        HERO: 0,
        VILLAIN: 0,
        CINDERELLA: 0,
        rivalry: 0,
        championshipPrediction: member.championshipPrediction,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  const rows = rawTotals as StandingRow[];
  return rows.map((row) => ({
    ...row,
    championshipPrediction: row.championshipPrediction ?? predictionByMemberId.get(row.memberId) ?? null,
  }));
}

function computeStandingsDelta(
  snapshots: Array<{ totals: unknown }>,
  members: Array<{ id: string }>,
): Record<string, number> {
  const delta: Record<string, number> = {};
  for (const member of members) delta[member.id] = 0;

  if (snapshots.length < 2) return delta;

  const latest = extractTotalsMap(snapshots[0].totals);
  const previous = extractTotalsMap(snapshots[1].totals);

  for (const member of members) {
    const curr = latest.get(member.id) ?? 0;
    const prev = previous.get(member.id) ?? 0;
    delta[member.id] = curr - prev;
  }

  return delta;
}

function extractTotalsMap(totals: unknown) {
  const map = new Map<string, number>();
  if (!Array.isArray(totals)) return map;

  for (const row of totals as Array<{ memberId?: unknown; total?: unknown }>) {
    const memberId = typeof row.memberId === "string" ? row.memberId : null;
    const total = typeof row.total === "number" ? row.total : 0;
    if (memberId) map.set(memberId, total);
  }

  return map;
}

function deriveCurrentRound(games: Array<{ round: Round }>) {
  const roundsPresent = new Set(games.map((game) => game.round));
  for (let i = ROUND_ORDER.length - 1; i >= 0; i -= 1) {
    if (roundsPresent.has(ROUND_ORDER[i])) {
      return ROUND_ORDER[i];
    }
  }
  return "R64";
}

function buildHotSeatMatchups({
  games,
  teams,
  ownershipMap,
  resultByTeamId,
  currentRound,
}: {
  games: Array<{ round: Round; gameNo: number; winnerTeamId: string; loserTeamId: string }>;
  teams: TeamLite[];
  ownershipMap: Record<string, Ownership[]>;
  resultByTeamId: Map<string, TeamResultLite>;
  currentRound: Round;
}) {
  const teamById = new Map(teams.map((team) => [team.id, team]));

  const fromGames = games
    .filter((game) => game.round === currentRound)
    .sort((a, b) => a.gameNo - b.gameNo)
    .slice(0, 2)
    .map((game, index) => {
      const teamA = teamById.get(game.winnerTeamId);
      const teamB = teamById.get(game.loserTeamId);
      if (!teamA || !teamB) return null;

      return createMatchup({
        id: `game-${currentRound}-${game.gameNo}-${index}`,
        round: currentRound,
        region: teamA.region,
        teamA,
        teamB,
        ownershipMap,
        resultByTeamId,
      });
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  if (fromGames.length >= 2) return fromGames;

  const ownedTeams = teams.filter((team) => (ownershipMap[team.id]?.length ?? 0) > 0);
  const pool = (ownedTeams.length > 0 ? ownedTeams : teams)
    .slice()
    .sort((a, b) => a.seed - b.seed || a.name.localeCompare(b.name));

  const mocked: ReturnType<typeof createMatchup>[] = [];
  for (let i = 0; i + 1 < pool.length && mocked.length < 2; i += 2) {
    const teamA = pool[i];
    const teamB = pool[i + 1];
    mocked.push(
      createMatchup({
        id: `mock-${i}`,
        round: currentRound,
        region: teamA.region,
        teamA,
        teamB,
        ownershipMap,
        resultByTeamId,
      }),
    );
  }

  return mocked;
}

function createMatchup({
  id,
  round,
  region,
  teamA,
  teamB,
  ownershipMap,
  resultByTeamId,
}: {
  id: string;
  round: Round;
  region: string;
  teamA: TeamLite;
  teamB: TeamLite;
  ownershipMap: Record<string, Ownership[]>;
  resultByTeamId: Map<string, TeamResultLite>;
}) {
  const ownersA = ownershipMap[teamA.id] ?? [];
  const ownersB = ownershipMap[teamB.id] ?? [];
  const allOwners = [...ownersA, ...ownersB];

  const impact = {
    heroOwners: allOwners.filter((o) => o.role === "HERO").map((o) => o.ownerDisplayName),
    villainOwners: allOwners.filter((o) => o.role === "VILLAIN").map((o) => o.ownerDisplayName),
    cinderellaOwners: allOwners.filter((o) => o.role === "CINDERELLA").map((o) => o.ownerDisplayName),
  };

  const teamAWin = simulateMatchupDelta(teamA.id, teamB.id, round, ownershipMap, resultByTeamId);
  const teamBWin = simulateMatchupDelta(teamB.id, teamA.id, round, ownershipMap, resultByTeamId);

  return {
    id,
    round,
    region,
    label: `${teamA.shortName || teamA.name} vs ${teamB.shortName || teamB.name}`,
    teamA,
    teamB,
    impact,
    potentialSwing: {
      ifTeamAWins: summarizeScenario(teamA.shortName || teamA.name, teamAWin, ownershipMap),
      ifTeamBWins: summarizeScenario(teamB.shortName || teamB.name, teamBWin, ownershipMap),
    },
  };
}

function simulateMatchupDelta(
  winnerTeamId: string,
  loserTeamId: string,
  round: Round,
  ownershipMap: Record<string, Ownership[]>,
  resultByTeamId: Map<string, TeamResultLite>,
) {
  const delta: Record<string, number> = {};
  const winnerOwners = ownershipMap[winnerTeamId] ?? [];
  const loserOwners = ownershipMap[loserTeamId] ?? [];
  const winnerResult = resultByTeamId.get(winnerTeamId) ?? { wins: 0, eliminatedRound: null };

  for (const winnerOwner of winnerOwners) {
    if (winnerOwner.role === "HERO") {
      const before = computeHeroPoints(winnerResult.wins);
      const afterWins = winnerResult.wins + 1;
      const after = computeHeroPoints(afterWins);
      delta[winnerOwner.ownerMemberId] = (delta[winnerOwner.ownerMemberId] || 0) + (after - before);
    } else if (winnerOwner.role === "CINDERELLA") {
      const before = computeCinderellaPoints(
        winnerResult.wins,
        winnerResult.wins >= 2,
        winnerResult.wins >= 3,
        winnerResult.wins >= 4,
      );
      const afterWins = winnerResult.wins + 1;
      const after = computeCinderellaPoints(afterWins, afterWins >= 2, afterWins >= 3, afterWins >= 4);
      delta[winnerOwner.ownerMemberId] = (delta[winnerOwner.ownerMemberId] || 0) + (after - before);
    }
  }

  for (const loserOwner of loserOwners) {
    if (loserOwner.role === "VILLAIN") {
      const villainPoints = computeVillainPoints(round);
      delta[loserOwner.ownerMemberId] = (delta[loserOwner.ownerMemberId] || 0) + villainPoints;
    }
  }

  for (const winnerOwner of winnerOwners) {
    for (const loserOwner of loserOwners) {
      if (winnerOwner.ownerMemberId === loserOwner.ownerMemberId) continue;
      if (winnerOwner.role === "HERO" && loserOwner.role === "VILLAIN") {
        delta[winnerOwner.ownerMemberId] = (delta[winnerOwner.ownerMemberId] || 0) + 5;
      }
      if (winnerOwner.role === "CINDERELLA" && loserOwner.role === "HERO") {
        delta[winnerOwner.ownerMemberId] = (delta[winnerOwner.ownerMemberId] || 0) + 10;
      }
      if (winnerOwner.role === "VILLAIN" && loserOwner.role === "HERO") {
        delta[loserOwner.ownerMemberId] = (delta[loserOwner.ownerMemberId] || 0) - 5;
      }
    }
  }

  return delta;
}

function summarizeScenario(
  winnerName: string,
  delta: Record<string, number>,
  ownershipMap: Record<string, Ownership[]>,
) {
  const nameByMemberId = new Map<string, string>();
  for (const list of Object.values(ownershipMap)) {
    for (const ownership of list) {
      nameByMemberId.set(ownership.ownerMemberId, ownership.ownerDisplayName);
    }
  }

  const entries = Object.entries(delta)
    .filter(([, value]) => value !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 2)
    .map(([memberId, value]) => {
      const name = nameByMemberId.get(memberId) || memberId.slice(0, 4);
      return `${name} ${value > 0 ? "+" : ""}${value}`;
    });

  if (entries.length === 0) {
    return `${winnerName} win: low immediate swing`;
  }

  return `${winnerName} win: ${entries.join(" • ")}`;
}
