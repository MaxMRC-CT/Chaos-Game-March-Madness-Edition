import { Round } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getBracketConfig } from "@/lib/bracket/config";
import { NCAA_R64_MATCHUPS, R64_REGION_GAME_RANGES, REGION_GAME_RANGES, REGIONS } from "@/lib/bracket/espnLayout";
import { ROUND_LABELS } from "@/lib/bracket/shape";
import { replaceResultsState, TeamResultInput, TournamentGameInput } from "@/lib/results/replace-results-state";
import { getRoundHealth } from "@/lib/tournament/roundHealth";
import { evaluateStatusTransitions } from "@/lib/league/lifecycle";
import type { Region } from "@/lib/bracket/espnLayout";

type TeamLite = {
  id: string;
  name: string;
  shortName: string | null;
  seed: number;
  region: string;
};

type ExistingGameMeta = {
  winnerTeamId: string;
  loserTeamId: string;
  createdAt: Date;
};

export type LiveAdminGameCard = {
  slotId: string;
  round: Round;
  roundLabel: string;
  gameNo: number;
  region: string;
  bracketLabel: string;
  status: "pending" | "completed";
  isPlayInRelated: boolean;
  teamA: TeamLite;
  teamB: TeamLite;
  winnerTeamId: string | null;
  updatedAt: string | null;
};

export type LiveAdminRoundGroup = {
  round: Round;
  roundLabel: string;
  games: LiveAdminGameCard[];
};

export type LiveAdminConsoleData = {
  league: {
    id: string;
    code: string;
    name: string;
    status: string;
    year: number;
  };
  summary: {
    currentRound: Round;
    currentRoundLabel: string;
    pendingCount: number;
    completedCount: number;
    lastUpdatedAt: string | null;
    standingsUpdatedAt: string | null;
  };
  queue: LiveAdminRoundGroup[];
  recentlyUpdated: Array<{
    slotId: string;
    matchup: string;
    winnerName: string;
    updatedAt: string | null;
    roundLabel: string;
  }>;
  audit: {
    totalCompletedGames: number;
    totalPendingGames: number;
    lastUpdatedGame: string | null;
    roundHealthOk: boolean;
    roundHealthError: string | null;
    standingsUpToDate: boolean;
  };
};

const REGION_ORDER: Region[] = [...REGIONS];
const ROUND_ORDER: Round[] = ["R64", "R32", "S16", "E8", "F4", "FINAL"];

function slotKey(round: Round, gameNo: number) {
  return `${round}-${gameNo}`;
}

function roundLabel(round: Round) {
  return ROUND_LABELS[round];
}

function formatMatchup(teamA: TeamLite, teamB: TeamLite) {
  return `[${teamA.seed}] ${teamA.shortName || teamA.name} vs [${teamB.seed}] ${teamB.shortName || teamB.name}`;
}

function isPlayInRelatedSlot(teamA: TeamLite, teamB: TeamLite) {
  return teamA.name.includes("/") || teamB.name.includes("/");
}

function isRegion(value: string): value is Region {
  return REGIONS.includes(value as Region);
}

function pushSlot(
  slots: LiveAdminGameCard[],
  params: {
    round: Round;
    gameNo: number;
    bracketLabel: string;
    teamA: TeamLite | null;
    teamB: TeamLite | null;
    selectedWinnerId: string | undefined;
    existingMeta?: ExistingGameMeta;
  },
) {
  const { round, gameNo, bracketLabel, teamA, teamB, selectedWinnerId, existingMeta } = params;
  if (!teamA || !teamB) return null;

  const validWinnerId =
    selectedWinnerId === teamA.id || selectedWinnerId === teamB.id ? selectedWinnerId : null;

  const slot: LiveAdminGameCard = {
    slotId: slotKey(round, gameNo),
    round,
    roundLabel: roundLabel(round),
    gameNo,
    region: teamA.region,
    bracketLabel,
    status: validWinnerId ? "completed" : "pending",
    isPlayInRelated: isPlayInRelatedSlot(teamA, teamB),
    teamA,
    teamB,
    winnerTeamId: validWinnerId,
    updatedAt: existingMeta?.createdAt?.toISOString?.() ?? null,
  };

  slots.push(slot);
  return validWinnerId
    ? teamA.id === validWinnerId
      ? teamA
      : teamB
    : null;
}

function buildTournamentSlots(
  teams: TeamLite[],
  year: number,
  selectedWinners: Map<string, string>,
  existingMetaMap: Map<string, ExistingGameMeta>,
) {
  const teamsByRegion = new Map<Region, TeamLite[]>();
  for (const region of REGION_ORDER) {
    teamsByRegion.set(
      region,
      teams
        .filter((team) => team.region === region)
        .sort((a, b) => a.seed - b.seed || a.name.localeCompare(b.name)),
    );
  }

  const slots: LiveAdminGameCard[] = [];
  const regionalChampions = new Map<Region, TeamLite | null>();

  for (const region of REGION_ORDER) {
    const regionTeams = teamsByRegion.get(region) ?? [];
    const bySeed = new Map(regionTeams.map((team) => [team.seed, team]));
    const [r64Start] = R64_REGION_GAME_RANGES[region];
    const [r32Start] = REGION_GAME_RANGES.R32[region];
    const [s16Start] = REGION_GAME_RANGES.S16[region];
    const [e8Start] = REGION_GAME_RANGES.E8[region];

    const r64Winners: Array<TeamLite | null> = [];
    NCAA_R64_MATCHUPS.forEach(([seedA, seedB], index) => {
      const gameNo = r64Start + index;
      const teamA = bySeed.get(seedA) ?? null;
      const teamB = bySeed.get(seedB) ?? null;
      const winner = pushSlot(slots, {
        round: "R64",
        gameNo,
        bracketLabel: region,
        teamA,
        teamB,
        selectedWinnerId: selectedWinners.get(slotKey("R64", gameNo)),
        existingMeta: existingMetaMap.get(slotKey("R64", gameNo)),
      });
      r64Winners.push(winner);
    });

    const r32Pairs = [
      [0, 1],
      [2, 3],
      [4, 5],
      [6, 7],
    ] as const;
    const r32Winners: Array<TeamLite | null> = [];
    r32Pairs.forEach(([leftIndex, rightIndex], index) => {
      const gameNo = r32Start + index;
      const winner = pushSlot(slots, {
        round: "R32",
        gameNo,
        bracketLabel: region,
        teamA: r64Winners[leftIndex],
        teamB: r64Winners[rightIndex],
        selectedWinnerId: selectedWinners.get(slotKey("R32", gameNo)),
        existingMeta: existingMetaMap.get(slotKey("R32", gameNo)),
      });
      r32Winners.push(winner);
    });

    const s16Pairs = [
      [0, 1],
      [2, 3],
    ] as const;
    const s16Winners: Array<TeamLite | null> = [];
    s16Pairs.forEach(([leftIndex, rightIndex], index) => {
      const gameNo = s16Start + index;
      const winner = pushSlot(slots, {
        round: "S16",
        gameNo,
        bracketLabel: region,
        teamA: r32Winners[leftIndex],
        teamB: r32Winners[rightIndex],
        selectedWinnerId: selectedWinners.get(slotKey("S16", gameNo)),
        existingMeta: existingMetaMap.get(slotKey("S16", gameNo)),
      });
      s16Winners.push(winner);
    });

    const regionalChampion = pushSlot(slots, {
      round: "E8",
      gameNo: e8Start,
      bracketLabel: region,
      teamA: s16Winners[0],
      teamB: s16Winners[1],
      selectedWinnerId: selectedWinners.get(slotKey("E8", e8Start)),
      existingMeta: existingMetaMap.get(slotKey("E8", e8Start)),
    });

    regionalChampions.set(region, regionalChampion);
  }

  const pairings = getBracketConfig(year).finalFourPairings;
  const finalFourWinners: Array<TeamLite | null> = [];
  pairings.forEach(([leftRegion, rightRegion], index) => {
    if (!isRegion(leftRegion) || !isRegion(rightRegion)) {
      return;
    }

    const gameNo = index + 1;
    const winner = pushSlot(slots, {
      round: "F4",
      gameNo,
      bracketLabel: `${leftRegion} vs ${rightRegion}`,
      teamA: regionalChampions.get(leftRegion) ?? null,
      teamB: regionalChampions.get(rightRegion) ?? null,
      selectedWinnerId: selectedWinners.get(slotKey("F4", gameNo)),
      existingMeta: existingMetaMap.get(slotKey("F4", gameNo)),
    });
    finalFourWinners.push(winner);
  });

  pushSlot(slots, {
    round: "FINAL",
    gameNo: 1,
    bracketLabel: "National Championship",
    teamA: finalFourWinners[0] ?? null,
    teamB: finalFourWinners[1] ?? null,
    selectedWinnerId: selectedWinners.get(slotKey("FINAL", 1)),
    existingMeta: existingMetaMap.get(slotKey("FINAL", 1)),
  });

  return slots;
}

function deriveTeamResults(teams: TeamLite[], completedGames: LiveAdminGameCard[]): TeamResultInput[] {
  const resultMap = new Map<string, { wins: number; eliminatedRound: Round | null }>();
  for (const team of teams) {
    resultMap.set(team.id, { wins: 0, eliminatedRound: null });
  }

  for (const game of completedGames) {
    if (!game.winnerTeamId) continue;
    const loserId = game.teamA.id === game.winnerTeamId ? game.teamB.id : game.teamA.id;

    const winner = resultMap.get(game.winnerTeamId);
    if (winner) winner.wins += 1;

    const loser = resultMap.get(loserId);
    if (loser) loser.eliminatedRound = game.round;
  }

  const finalWinnerId =
    completedGames.find((game) => game.round === "FINAL")?.winnerTeamId ?? null;
  if (finalWinnerId) {
    const champion = resultMap.get(finalWinnerId);
    if (champion) champion.eliminatedRound = "CHAMP";
  }

  return teams.map((team) => ({
    teamId: team.id,
    wins: resultMap.get(team.id)?.wins ?? 0,
    eliminatedRound: resultMap.get(team.id)?.eliminatedRound ?? null,
  }));
}

function toTournamentGames(completedGames: LiveAdminGameCard[]): TournamentGameInput[] {
  return completedGames.map((game) => ({
    round: game.round,
    gameNo: game.gameNo,
    winnerTeamId: game.winnerTeamId!,
    loserTeamId: game.teamA.id === game.winnerTeamId ? game.teamB.id : game.teamA.id,
  }));
}

function findRegionForGame(round: Round, gameNo: number): Region | null {
  if (round === "R64") {
    for (const region of REGION_ORDER) {
      const [start, end] = R64_REGION_GAME_RANGES[region];
      if (gameNo >= start && gameNo <= end) return region;
    }
    return null;
  }

  if (round === "R32" || round === "S16" || round === "E8") {
    const ranges = REGION_GAME_RANGES[round];
    for (const region of REGION_ORDER) {
      const [start, end] = ranges[region];
      if (gameNo >= start && gameNo <= end) return region;
    }
    return null;
  }

  return null;
}

function getNextSlot(round: Round, gameNo: number, year: number): { round: Round; gameNo: number } | null {
  const region = findRegionForGame(round, gameNo);

  if (round === "R64" && region) {
    const [r64Start] = R64_REGION_GAME_RANGES[region];
    const [r32Start] = REGION_GAME_RANGES.R32[region];
    return { round: "R32", gameNo: r32Start + Math.floor((gameNo - r64Start) / 2) };
  }

  if (round === "R32" && region) {
    const [r32Start] = REGION_GAME_RANGES.R32[region];
    const [s16Start] = REGION_GAME_RANGES.S16[region];
    return { round: "S16", gameNo: s16Start + Math.floor((gameNo - r32Start) / 2) };
  }

  if (round === "S16" && region) {
    const [e8GameNo] = REGION_GAME_RANGES.E8[region];
    return { round: "E8", gameNo: e8GameNo };
  }

  if (round === "E8" && region) {
    const pairings = getBracketConfig(year).finalFourPairings;
    const pairingIndex = pairings.findIndex(
      ([leftRegion, rightRegion]) => leftRegion === region || rightRegion === region,
    );
    return pairingIndex >= 0 ? { round: "F4", gameNo: pairingIndex + 1 } : null;
  }

  if (round === "F4") {
    return { round: "FINAL", gameNo: 1 };
  }

  return null;
}

function getDependentSlotKeys(round: Round, gameNo: number, year: number) {
  const keys: string[] = [];
  let cursor = getNextSlot(round, gameNo, year);

  while (cursor) {
    keys.push(slotKey(cursor.round, cursor.gameNo));
    cursor = getNextSlot(cursor.round, cursor.gameNo, year);
  }

  return keys;
}

async function loadLeagueCore(leagueIdOrCode: { leagueId?: string; code?: string }) {
  const league = leagueIdOrCode.leagueId
    ? await prisma.league.findUnique({
        where: { id: leagueIdOrCode.leagueId },
        select: {
          id: true,
          code: true,
          status: true,
          name: true,
          tournamentYearId: true,
          tournamentYear: { select: { year: true } },
        },
      })
    : leagueIdOrCode.code
      ? await prisma.league.findUnique({
          where: { code: leagueIdOrCode.code },
          select: {
            id: true,
            code: true,
            status: true,
            name: true,
            tournamentYearId: true,
            tournamentYear: { select: { year: true } },
          },
        })
      : null;

  if (!league) return null;

  await evaluateStatusTransitions(league.id);

  const [teams, games, score] = await Promise.all([
    prisma.team.findMany({
      where: { tournamentYearId: league.tournamentYearId },
      select: { id: true, name: true, shortName: true, seed: true, region: true },
      orderBy: [{ region: "asc" }, { seed: "asc" }, { name: "asc" }],
    }),
    prisma.tournamentGame.findMany({
      where: { leagueId: league.id },
      select: {
        round: true,
        gameNo: true,
        winnerTeamId: true,
        loserTeamId: true,
        createdAt: true,
      },
      orderBy: [{ round: "asc" }, { gameNo: "asc" }],
    }),
    prisma.leagueScore.findUnique({
      where: { leagueId: league.id },
      select: { updatedAt: true },
    }),
  ]);

  return {
    league,
    teams,
    games,
    scoreUpdatedAt: score?.updatedAt ?? null,
  };
}

export async function getLiveAdminConsoleData(params: { leagueId?: string; code?: string }) {
  const core = await loadLeagueCore(params);
  if (!core) return null;

  const { league, teams, games, scoreUpdatedAt } = core;
  const selectedWinners = new Map<string, string>();
  const existingMetaMap = new Map<string, ExistingGameMeta>();

  for (const game of games) {
    const key = slotKey(game.round, game.gameNo);
    selectedWinners.set(key, game.winnerTeamId);
    existingMetaMap.set(key, {
      winnerTeamId: game.winnerTeamId,
      loserTeamId: game.loserTeamId,
      createdAt: game.createdAt,
    });
  }

  const slots = buildTournamentSlots(teams, league.tournamentYear.year, selectedWinners, existingMetaMap);
  const queueSlots = slots.filter((slot) => slot.status === "pending" || slot.status === "completed");
  const queue = ROUND_ORDER.map((round) => ({
    round,
    roundLabel: roundLabel(round),
    games: queueSlots.filter((slot) => slot.round === round),
  })).filter((group) => group.games.length > 0);

  const pendingGames = queueSlots.filter((slot) => slot.status === "pending");
  const completedGames = queueSlots.filter((slot) => slot.status === "completed");
  const sortedUpdated = [...completedGames].sort((a, b) => {
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bTime - aTime;
  });

  const currentRound =
    pendingGames[0]?.round ??
    completedGames[completedGames.length - 1]?.round ??
    "R64";
  const roundHealth = await getRoundHealth(league.id);
  const lastUpdated = sortedUpdated[0] ?? null;
  const standingsUpToDate = Boolean(scoreUpdatedAt) && Boolean(lastUpdated?.updatedAt)
    ? new Date(scoreUpdatedAt!).getTime() >= new Date(lastUpdated.updatedAt!).getTime()
    : Boolean(scoreUpdatedAt);

  return {
    league: {
      id: league.id,
      code: league.code,
      name: league.name,
      status: league.status,
      year: league.tournamentYear.year,
    },
    summary: {
      currentRound,
      currentRoundLabel: roundLabel(currentRound),
      pendingCount: pendingGames.length,
      completedCount: completedGames.length,
      lastUpdatedAt: lastUpdated?.updatedAt ?? null,
      standingsUpdatedAt: scoreUpdatedAt?.toISOString?.() ?? null,
    },
    queue,
    recentlyUpdated: sortedUpdated.slice(0, 10).map((game) => ({
      slotId: game.slotId,
      matchup: formatMatchup(game.teamA, game.teamB),
      winnerName:
        game.winnerTeamId === game.teamA.id ? game.teamA.shortName || game.teamA.name : game.teamB.shortName || game.teamB.name,
      loserName:
        game.winnerTeamId === game.teamA.id ? game.teamB.shortName || game.teamB.name : game.teamA.shortName || game.teamA.name,
      updatedAt: game.updatedAt,
      roundLabel: game.roundLabel,
    })),
    audit: {
      totalCompletedGames: completedGames.length,
      totalPendingGames: pendingGames.length,
      lastUpdatedGame: lastUpdated ? formatMatchup(lastUpdated.teamA, lastUpdated.teamB) : null,
      roundHealthOk: roundHealth.ok,
      roundHealthError: roundHealth.error ?? null,
      standingsUpToDate,
    },
  } satisfies LiveAdminConsoleData;
}

export async function applyLiveAdminResult(input: {
  leagueId: string;
  round: Round;
  gameNo: number;
  winnerTeamId: string;
  allowOverwrite?: boolean;
}) {
  const core = await loadLeagueCore({ leagueId: input.leagueId });
  if (!core) {
    throw new Error("League not found");
  }

  const { league, teams, games } = core;
  const selectedWinners = new Map<string, string>();
  const existingMetaMap = new Map<string, ExistingGameMeta>();

  for (const game of games) {
    const key = slotKey(game.round, game.gameNo);
    selectedWinners.set(key, game.winnerTeamId);
    existingMetaMap.set(key, {
      winnerTeamId: game.winnerTeamId,
      loserTeamId: game.loserTeamId,
      createdAt: game.createdAt,
    });
  }

  selectedWinners.set(slotKey(input.round, input.gameNo), input.winnerTeamId);

  const slots = buildTournamentSlots(teams, league.tournamentYear.year, selectedWinners, existingMetaMap);
  const target = slots.find((slot) => slot.round === input.round && slot.gameNo === input.gameNo);

  if (!target) {
    throw new Error("Game not available yet");
  }

  if (target.teamA.id !== input.winnerTeamId && target.teamB.id !== input.winnerTeamId) {
    throw new Error("Selected winner is not part of this matchup");
  }

  const existingWinnerId = existingMetaMap.get(slotKey(input.round, input.gameNo))?.winnerTeamId ?? null;
  if (existingWinnerId) {
    if (existingWinnerId === input.winnerTeamId) {
      throw new Error("This matchup is already finalized with that winner.");
    }

    if (!input.allowOverwrite) {
      throw new Error("This matchup is already finalized. Confirm overwrite to change the winner.");
    }

    const dependentKeys = getDependentSlotKeys(input.round, input.gameNo, league.tournamentYear.year);
    const blockedDependent = dependentKeys.find((key) => existingMetaMap.has(key));
    if (blockedDependent) {
      throw new Error("Later-round results depend on this matchup. Clear those downstream games before overwriting.");
    }
  }

  const completedGames = slots.filter((slot) => slot.status === "completed");
  const teamResults = deriveTeamResults(teams, completedGames);
  const tournamentGames = toTournamentGames(completedGames);

  await replaceResultsState(input.leagueId, teamResults, tournamentGames);
  return getLiveAdminConsoleData({ leagueId: input.leagueId });
}
