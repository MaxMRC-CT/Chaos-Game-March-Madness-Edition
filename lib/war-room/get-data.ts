/**
 * Shared War Room data loader. Used by the war-room API route and league server pages.
 * Avoids server-to-server fetch (relative URLs fail in Vercel SSR).
 */

import { Round } from "@prisma/client";
import { prisma } from "@/lib/db";
import { computeOwnershipByRole } from "@/lib/league/ownership";
import {
  computeCinderellaPoints,
  computeHeroPoints,
  computeVillainPoints,
} from "@/lib/scoring/compute";
import { getBracketConfig } from "@/lib/bracket/config";
import {
  computeChaosIndex,
  computePortfolioLeverage,
  getHighestLeverageHit,
  getMostValuableContrarianHit,
  getPickLeverageV23,
  getTopLeveragePicksLeagueWide,
} from "@/lib/analytics/leverage";
import { computeIdentityMetrics, getIdentityArchetype } from "@/lib/analytics/identity";
import { buildMomentumSummaries } from "@/lib/analytics/momentum";
import { computeProjectionForActiveTeam } from "@/lib/analytics/projection";
import { computeUpsetExposure } from "@/lib/analytics/upset-exposure";
import {
  buildRivalryPanel,
  getContrarianLabel,
} from "@/lib/analytics/rivalry";
import { evaluateStatusTransitions } from "@/lib/league/lifecycle";

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

export type GetWarRoomDataOptions = {
  mode?: "all" | "highlights";
  limit?: number;
  memberId?: string | null;
};

export type WarRoomData = Awaited<ReturnType<typeof getWarRoomData>>;

/**
 * Load War Room data for a league. Returns null if league not found.
 * Use from API route or server components — no HTTP fetch.
 */
export async function getWarRoomData(
  leagueId: string,
  options: GetWarRoomDataOptions = {},
): Promise<Record<string, unknown> | null> {
  const mode = options.mode ?? "all";
  const limitRaw = options.limit ?? 15;
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 30) : 15;
  const memberIdFromOptions = options.memberId ?? null;

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      id: true,
      name: true,
      status: true,
      code: true,
      tournamentYearId: true,
      currentPick: true,
      lockDeadline: true,
      firstTipOff: true,
      tournamentYear: { select: { year: true } },
    },
  });

  if (!league) {
    return null;
  }

  await evaluateStatusTransitions(leagueId);

  const leagueRefreshed = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      id: true,
      name: true,
      status: true,
      code: true,
      tournamentYearId: true,
      currentPick: true,
      lockDeadline: true,
      firstTipOff: true,
      tournamentYear: { select: { year: true } },
    },
  });
  const leagueForResponse = leagueRefreshed ?? league;

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

  const me = memberIdFromOptions
    ? members.find((member) => member.id === memberIdFromOptions) ?? null
    : null;

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

  const memberCount = members.length;
  const ownershipByRole = computeOwnershipByRole(
    picks.map((p) => ({ teamId: p.teamId, role: p.role, memberId: p.memberId })),
    memberCount,
  );

  const standings = normalizeStandings(
    score?.totals,
    members.map((m) => ({ id: m.id, displayName: m.displayName, championshipPrediction: m.championshipPrediction })),
  );
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
    ownershipByRole,
    resultByTeamId,
    currentRound,
  });

  const picksWithPickNumber = picks.map((p, i) => ({ ...p, pickNumber: i + 1 }));
  const myPicks = me ? picksWithPickNumber.filter((pick) => pick.memberId === me.id) : [];

  const myLeagueAnalytics =
    me && myPicks.length > 0
      ? buildMyLeagueAnalytics({
          myPicks,
          teams,
          teamResults,
          ownershipByRole,
          standingsRow: standings.find((s) => s.memberId === me.id) ?? null,
          currentRound,
          allPicks: picksWithPickNumber,
          memberId: me.id,
        })
      : undefined;

  const picksWithOwnershipForTop5 = picksWithPickNumber.map((p) => {
    const obr = ownershipByRole[p.teamId] ?? { heroPct: 0, villainPct: 0, cinderellaPct: 0 };
    const pct =
      p.role === "HERO" ? obr.heroPct : p.role === "VILLAIN" ? obr.villainPct : obr.cinderellaPct;
    return {
      teamId: p.teamId,
      role: p.role,
      teamName: p.team.shortName || p.team.name,
      ownershipPct: pct,
      seed: p.team.seed,
      memberId: p.memberId,
      memberDisplayName: p.member.displayName,
    };
  });
  const top5LeveragePicks = getTopLeveragePicksLeagueWide(
    picksWithOwnershipForTop5,
    resultByTeamId,
    5,
  );

  const teamSeeds = new Map(teams.map((t) => [t.id, t.seed]));
  const upsetExposure = computeUpsetExposure(
    picksWithPickNumber.map((p) => ({
      teamId: p.teamId,
      role: p.role,
      memberId: p.memberId,
      seed: p.team.seed,
    })),
    ownershipByRole,
    memberCount,
    teamSeeds,
  );

  const standingsWithLeverage = standings.map((row) => {
    const memberPicks = picksWithPickNumber.filter((p) => p.memberId === row.memberId);
    const memberPicksWithOwnership = memberPicks.map((p) => {
      const obr = ownershipByRole[p.teamId] ?? { heroPct: 0, villainPct: 0, cinderellaPct: 0 };
      const pct =
        p.role === "HERO" ? obr.heroPct : p.role === "VILLAIN" ? obr.villainPct : obr.cinderellaPct;
      return {
        teamId: p.teamId,
        role: p.role,
        teamName: p.team.shortName || p.team.name,
        ownershipPct: pct,
        seed: p.team.seed,
      };
    });
    const chaosIndex = computeChaosIndex(memberPicksWithOwnership, resultByTeamId);
    const portfolioLeverage =
      memberPicksWithOwnership.length > 0 ? chaosIndex / memberPicksWithOwnership.length : 0;
    return {
      ...row,
      chaosIndex,
      portfolioLeverage: Math.round(portfolioLeverage * 10) / 10,
    };
  });

  const momentumSummaries = buildMomentumSummaries(
    standings,
    snapshots,
    highlightEvents,
    ownershipMap,
  );

  const roundSummary =
    leagueForResponse.status === "LIVE" &&
    snapshots.length >= 2 &&
    (() => {
      const chaosSpike = momentumSummaries.biggestJump
        ? {
            memberId: momentumSummaries.biggestJump.memberId,
            displayName: momentumSummaries.biggestJump.displayName,
            spots: momentumSummaries.biggestJump.spots,
          }
        : null;

      let villainShockwave: { teamName: string; heroPct: number } | null = null;
      let chalkCollapse: { teamName: string; heroPct: number } | null = null;
      const teamById = new Map(teams.map((t) => [t.id, t]));
      for (const event of highlightEvents) {
        if (event.type !== "TEAM_ELIMINATED") continue;
        const teamId = String((event.payload as Record<string, unknown>)?.teamId ?? "");
        const team = teamById.get(teamId);
        const obr = ownershipByRole[teamId] ?? { heroPct: 0, villainPct: 0, cinderellaPct: 0 };
        const owners = ownershipMap[teamId] ?? [];
        const hasVillain = owners.some((o) => o.role === "VILLAIN");

        if (!chalkCollapse || obr.heroPct > chalkCollapse.heroPct) {
          chalkCollapse = {
            teamName: team?.shortName ?? team?.name ?? "Team",
            heroPct: obr.heroPct,
          };
        }
        if (hasVillain && (!villainShockwave || obr.heroPct > villainShockwave.heroPct)) {
          villainShockwave = {
            teamName: team?.shortName ?? team?.name ?? "Team",
            heroPct: obr.heroPct,
          };
        }
      }

      let leverageLeader: { memberId: string; displayName: string; chaosIndex: number } | null = null;
      for (const row of standingsWithLeverage) {
        const ci = row.chaosIndex ?? 0;
        if (!leverageLeader || ci > leverageLeader.chaosIndex) {
          leverageLeader = {
            memberId: row.memberId,
            displayName: row.displayName,
            chaosIndex: ci,
          };
        }
      }

      if (!chaosSpike && !villainShockwave && !chalkCollapse && !leverageLeader) return undefined;
      return { chaosSpike, villainShockwave, chalkCollapse, leverageLeader };
    })();

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

  const picksLite = picks.map((p) => ({
    memberId: p.memberId,
    teamId: p.teamId,
    role: p.role,
  }));
  const ownershipMapForRivalry = Object.fromEntries(
    Object.entries(ownershipMap).map(([teamId, owners]) => [
      teamId,
      owners.map((o) => ({ ownerMemberId: o.ownerMemberId })),
    ]),
  );
  const teamById = Object.fromEntries(
    teams.map((t) => [t.id, { shortName: t.shortName, name: t.name }]),
  );
  const rivalryPanel =
    me && picks.length > 0
      ? buildRivalryPanel(
          me.id,
          picksLite,
          standings.map((s) => ({ memberId: s.memberId, displayName: s.displayName, total: s.total })),
          highlightEvents,
          ownershipMapForRivalry,
          teamById,
        )
      : undefined;

  const contrarianLabels: Record<string, string> = {};
  for (const member of members) {
    const label = getContrarianLabel(
      member.id,
      picksLite,
      ownershipByRole,
      member.id === me?.id && myLeagueAnalytics?.identity
        ? {
            chalkIndex: myLeagueAnalytics.identity.fieldAlignment,
            leverageIndex: myLeagueAnalytics.identity.upsideVsField,
          }
        : null,
    );
    if (label) contrarianLabels[member.id] = label;
  }

  const year = league.tournamentYear?.year ?? new Date().getFullYear();
  const bracketConfig = getBracketConfig(year);

  return {
    league: {
      id: leagueForResponse.id,
      name: leagueForResponse.name,
      status: leagueForResponse.status,
      code: leagueForResponse.code,
      currentPick: leagueForResponse.currentPick,
      lockDeadline: leagueForResponse.lockDeadline?.toISOString() ?? null,
      firstTipOff: leagueForResponse.firstTipOff?.toISOString() ?? null,
      currentRound,
      tournamentYear: leagueForResponse.tournamentYear
        ? { year: leagueForResponse.tournamentYear.year }
        : undefined,
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
    standings,
    standingsDelta,
    standingsUpdatedAt: score?.updatedAt ?? null,
    recentEvents,
    highlightEvents,
    hotSeatMatchups,
    ownershipMap,
    ownershipByRole,
    momentumSummaries,
    ...(roundSummary != null && { roundSummary }),
    ...(myLeagueAnalytics != null && { myLeagueAnalytics }),
    top5LeveragePicks,
    upsetExposure,
    standingsWithLeverage,
    ...(roundCounts != null && { roundCounts }),
    ...(rivalryPanel != null && { rivalryPanel }),
    ...(Object.keys(contrarianLabels).length > 0 && { contrarianLabels }),
  };
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
    championshipPrediction:
      row.championshipPrediction ?? predictionByMemberId.get(row.memberId) ?? null,
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

type MyPickLite = {
  teamId: string;
  role: "HERO" | "VILLAIN" | "CINDERELLA";
  team: { id: string; name: string; shortName: string | null; seed: number; region: string };
};

function buildMyLeagueAnalytics({
  myPicks,
  teams,
  teamResults,
  ownershipByRole,
  standingsRow,
  currentRound,
  allPicks,
  memberId,
}: {
  myPicks: MyPickLite[];
  teams: Array<{ id: string; name: string; shortName: string | null; seed: number; region: string }>;
  teamResults: Array<{ teamId: string; wins: number; eliminatedRound: Round | null }>;
  ownershipByRole: Record<string, { heroPct: number; villainPct: number; cinderellaPct: number }>;
  standingsRow: StandingRow | null;
  currentRound: Round;
  allPicks: Array<{
    teamId: string;
    role: "HERO" | "VILLAIN" | "CINDERELLA";
    memberId: string;
    member: { displayName: string };
    team: { id: string; name: string; shortName: string | null; seed: number; region: string };
  }>;
  memberId: string;
}) {
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const resultByTeamId = new Map(teamResults.map((r) => [r.teamId, r]));

  const hero = standingsRow?.HERO ?? 0;
  const villain = standingsRow?.VILLAIN ?? 0;
  const cinderella = standingsRow?.CINDERELLA ?? 0;
  const total = hero + villain + cinderella + (standingsRow?.rivalry ?? 0);

  const picksWithOwnership = myPicks.map((pick) => {
    const obr = ownershipByRole[pick.teamId] ?? { heroPct: 0, villainPct: 0, cinderellaPct: 0 };
    const pct =
      pick.role === "HERO" ? obr.heroPct : pick.role === "VILLAIN" ? obr.villainPct : obr.cinderellaPct;
    return { ...pick, ownershipPct: pct };
  });

  const sortedByOwnership = [...picksWithOwnership].sort((a, b) => a.ownershipPct - b.ownershipPct);
  const mostUnique =
    sortedByOwnership.length > 0 && sortedByOwnership[0].ownershipPct < 100
      ? {
          teamId: sortedByOwnership[0].teamId,
          teamName: sortedByOwnership[0].team.shortName || sortedByOwnership[0].team.name,
          role: sortedByOwnership[0].role,
          ownershipPct: sortedByOwnership[0].ownershipPct,
        }
      : null;

  const chalkiest =
    sortedByOwnership.length > 0
      ? (() => {
          const c = sortedByOwnership[sortedByOwnership.length - 1];
          return {
            teamId: c.teamId,
            teamName: c.team.shortName || c.team.name,
            role: c.role,
            ownershipPct: c.ownershipPct,
          };
        })()
      : null;

  const villainPicks = myPicks.filter((p) => p.role === "VILLAIN");
  let biggestVillainHit: { teamId: string; teamName: string; points: number } | null = null;
  for (const pick of villainPicks) {
    const result = resultByTeamId.get(pick.teamId);
    const points = result ? computeVillainPoints(result.eliminatedRound) : 0;
    const team = teamById.get(pick.teamId) ?? pick.team;
    if (!biggestVillainHit || points > biggestVillainHit.points) {
      biggestVillainHit = {
        teamId: pick.teamId,
        teamName: team.shortName || team.name,
        points,
      };
    }
  }

  const cinderellaPicks = myPicks.filter((p) => p.role === "CINDERELLA");
  let bestCinderellaPerformer: { teamId: string; teamName: string; points: number } | null = null;
  for (const pick of cinderellaPicks) {
    const result = resultByTeamId.get(pick.teamId);
    const wins = result?.wins ?? 0;
    const reachedS16 = wins >= 2;
    const reachedE8 = wins >= 3;
    const reachedF4 = wins >= 4;
    const points = computeCinderellaPoints(wins, reachedS16, reachedE8, reachedF4);
    if (!bestCinderellaPerformer || points > bestCinderellaPerformer.points) {
      const team = teamById.get(pick.teamId) ?? pick.team;
      bestCinderellaPerformer = {
        teamId: pick.teamId,
        teamName: team.shortName || team.name,
        points,
      };
    }
  }

  const picksWithOwnershipForAnalytics = picksWithOwnership.map((p) => ({
    teamId: p.teamId,
    role: p.role,
    teamName: p.team.shortName || p.team.name,
    ownershipPct: p.ownershipPct,
    seed: p.team.seed,
  }));
  const resultByTeamIdForAnalytics = new Map(
    teamResults.map((r) => [
      r.teamId,
      { teamId: r.teamId, wins: r.wins, eliminatedRound: r.eliminatedRound },
    ]),
  );

  const portfolioLeverage = computePortfolioLeverage(
    picksWithOwnershipForAnalytics,
    resultByTeamIdForAnalytics,
  );
  const highestLeverageHit = getHighestLeverageHit(
    picksWithOwnershipForAnalytics,
    resultByTeamIdForAnalytics,
  );
  const mostValuableContrarianHit = getMostValuableContrarianHit(
    picksWithOwnershipForAnalytics,
    resultByTeamIdForAnalytics,
  );
  const identityMetrics = computeIdentityMetrics(picksWithOwnershipForAnalytics);
  const identityArchetype = getIdentityArchetype(identityMetrics);

  const pickLeveragePerPick = picksWithOwnershipForAnalytics.map((p) => {
    const { points, leverage } = getPickLeverageV23(p, resultByTeamIdForAnalytics);
    return {
      teamId: p.teamId,
      role: p.role,
      teamName: p.teamName,
      points,
      leverage,
      ownershipPct: p.ownershipPct,
    };
  });

  const chaosIndex = computeChaosIndex(
    picksWithOwnershipForAnalytics,
    resultByTeamIdForAnalytics,
  );

  const resultByTeamIdLite = new Map(
    teamResults.map((r) => [
      r.teamId,
      { teamId: r.teamId, wins: r.wins, eliminatedRound: r.eliminatedRound },
    ]),
  );
  const allPicksLite = allPicks.map((p) => ({
    teamId: p.teamId,
    role: p.role,
    memberId: p.memberId,
    teamName: p.team.shortName || p.team.name,
    seed: p.team.seed,
  }));
  const projectionPreviews: Array<{
    teamId: string;
    teamName: string;
    role: string;
    currentPoints: number;
    nextRoundPoints: number;
    pointsDelta: number;
    avgOwnershipPct: number;
    youSwing: number;
    leagueSwing: number;
    netSwing: number;
  }> = [];
  for (const pick of myPicks) {
    const result = resultByTeamIdLite.get(pick.teamId) ?? null;
    const preview = computeProjectionForActiveTeam(
      {
        teamId: pick.teamId,
        role: pick.role,
        memberId,
        teamName: pick.team.shortName || pick.team.name,
        seed: pick.team.seed,
      },
      result,
      currentRound,
      ownershipByRole,
      memberId,
      allPicksLite,
    );
    if (preview) projectionPreviews.push(preview);
  }

  return {
    mostUniquePick: mostUnique,
    chalkiestPick: chalkiest,
    biggestVillainHit,
    bestCinderellaPerformer,
    scoreByRole: { hero, villain, cinderella, total },
    pickLeverage: { portfolioLeverage, highestLeverageHit, mostValuableContrarianHit },
    identity: {
      ...identityMetrics,
      archetype: identityArchetype,
    },
    pickLeveragePerPick,
    chaosIndex,
    projectionPreviews,
  };
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
  ownershipByRole,
  resultByTeamId,
  currentRound,
}: {
  games: Array<{
    round: Round;
    gameNo: number;
    winnerTeamId: string;
    loserTeamId: string;
  }>;
  teams: TeamLite[];
  ownershipMap: Record<string, Ownership[]>;
  ownershipByRole: Record<string, { heroPct: number; villainPct: number; cinderellaPct: number }>;
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
        ownershipByRole,
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
        ownershipByRole,
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
  ownershipByRole,
  resultByTeamId,
}: {
  id: string;
  round: Round;
  region: string;
  teamA: TeamLite;
  teamB: TeamLite;
  ownershipMap: Record<string, Ownership[]>;
  ownershipByRole: Record<string, { heroPct: number; villainPct: number; cinderellaPct: number }>;
  resultByTeamId: Map<string, TeamResultLite>;
}) {
  const ownersA = ownershipMap[teamA.id] ?? [];
  const ownersB = ownershipMap[teamB.id] ?? [];
  const allOwners = [...ownersA, ...ownersB];
  const obrA = ownershipByRole[teamA.id] ?? { heroPct: 0, villainPct: 0, cinderellaPct: 0 };
  const obrB = ownershipByRole[teamB.id] ?? { heroPct: 0, villainPct: 0, cinderellaPct: 0 };

  const impact = {
    heroOwners: allOwners.filter((o) => o.role === "HERO").map((o) => o.ownerDisplayName),
    villainOwners: allOwners.filter((o) => o.role === "VILLAIN").map((o) => o.ownerDisplayName),
    cinderellaOwners: allOwners
      .filter((o) => o.role === "CINDERELLA")
      .map((o) => o.ownerDisplayName),
    teamAOwnership: obrA,
    teamBOwnership: obrB,
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
      delta[winnerOwner.ownerMemberId] =
        (delta[winnerOwner.ownerMemberId] || 0) + (after - before);
    } else if (winnerOwner.role === "CINDERELLA") {
      const before = computeCinderellaPoints(
        winnerResult.wins,
        winnerResult.wins >= 2,
        winnerResult.wins >= 3,
        winnerResult.wins >= 4,
      );
      const afterWins = winnerResult.wins + 1;
      const after = computeCinderellaPoints(
        afterWins,
        afterWins >= 2,
        afterWins >= 3,
        afterWins >= 4,
      );
      delta[winnerOwner.ownerMemberId] =
        (delta[winnerOwner.ownerMemberId] || 0) + (after - before);
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
