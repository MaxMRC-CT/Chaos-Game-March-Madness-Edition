import { DraftRole, Round } from "@prisma/client";
import { prisma } from "@/lib/db";

type PickByRole = {
  memberId: string;
  role: DraftRole;
  teamId: string;
};

type RivalryGame = {
  id: string;
  winnerTeamId: string;
  loserTeamId: string;
  round: Round;
  gameNo: number;
};

type RivalryEvent = {
  type: "RIVALRY_BONUS";
  gameId: string;
  winnerTeamId: string;
  loserTeamId: string;
  memberId: string;
  delta: number;
  rule: "HERO_OVER_VILLAIN" | "CINDERELLA_OVER_HERO" | "VILLAIN_OVER_HERO";
};

type MemberTotals = {
  memberId: string;
  displayName: string;
  HERO: number;
  VILLAIN: number;
  CINDERELLA: number;
  rivalry: number;
  total: number;
};

export function computeHeroPoints(
  wins: number,
  reachedS16: boolean,
  reachedF4: boolean,
  isChampion: boolean,
) {
  let points = wins * 4;
  if (reachedS16) points += 8;
  if (reachedF4) points += 12;
  if (isChampion) points += 20;
  return points;
}

export function computeVillainPoints(eliminatedRound: Round | null | undefined) {
  switch (eliminatedRound) {
    case "R64":
      return 15;
    case "R32":
      return 10;
    case "S16":
      return 7;
    case "E8":
      return 4;
    case "F4":
      return 2;
    case "CHAMP":
      return 0;
    default:
      return 0;
  }
}

export function computeCinderellaPoints(
  wins: number,
  reachedS16: boolean,
  reachedE8: boolean,
  reachedF4: boolean,
) {
  let points = 0;
  if (wins >= 1) points += 10;
  if (wins >= 2) points += 15;
  if (reachedS16) points += 25;
  if (reachedE8) points += 35;
  if (reachedF4) points += 50;
  return points;
}

export function computeRivalryBonuses(
  games: RivalryGame[],
  picksByRole: PickByRole[],
): { events: RivalryEvent[]; memberDeltas: Record<string, number> } {
  const teamRoleIndex = new Map<string, PickByRole>();
  for (const pick of picksByRole) {
    teamRoleIndex.set(pick.teamId, pick);
  }

  const events: RivalryEvent[] = [];
  const memberDeltas: Record<string, number> = {};

  for (const game of games) {
    const winnerPick = teamRoleIndex.get(game.winnerTeamId);
    const loserPick = teamRoleIndex.get(game.loserTeamId);
    if (!winnerPick || !loserPick) continue;

    if (
      winnerPick.role === "HERO" &&
      loserPick.role === "VILLAIN" &&
      winnerPick.memberId !== loserPick.memberId
    ) {
      events.push({
        type: "RIVALRY_BONUS",
        gameId: game.id,
        winnerTeamId: game.winnerTeamId,
        loserTeamId: game.loserTeamId,
        memberId: winnerPick.memberId,
        delta: 5,
        rule: "HERO_OVER_VILLAIN",
      });
      memberDeltas[winnerPick.memberId] = (memberDeltas[winnerPick.memberId] || 0) + 5;
    }

    if (
      winnerPick.role === "CINDERELLA" &&
      loserPick.role === "HERO" &&
      winnerPick.memberId !== loserPick.memberId
    ) {
      events.push({
        type: "RIVALRY_BONUS",
        gameId: game.id,
        winnerTeamId: game.winnerTeamId,
        loserTeamId: game.loserTeamId,
        memberId: winnerPick.memberId,
        delta: 10,
        rule: "CINDERELLA_OVER_HERO",
      });
      memberDeltas[winnerPick.memberId] = (memberDeltas[winnerPick.memberId] || 0) + 10;
    }

    if (winnerPick.role === "VILLAIN" && loserPick.role === "HERO") {
      events.push({
        type: "RIVALRY_BONUS",
        gameId: game.id,
        winnerTeamId: game.winnerTeamId,
        loserTeamId: game.loserTeamId,
        memberId: loserPick.memberId,
        delta: -5,
        rule: "VILLAIN_OVER_HERO",
      });
      memberDeltas[loserPick.memberId] = (memberDeltas[loserPick.memberId] || 0) - 5;
    }
  }

  return { events, memberDeltas };
}

function isChampion(result: { wins: number; eliminatedRound: Round | null }) {
  return result.eliminatedRound === "CHAMP" || result.wins >= 6;
}

export async function computeLeagueStandings(leagueId: string) {
  const [members, picks, results, games] = await Promise.all([
    prisma.leagueMember.findMany({
      where: { leagueId },
      select: { id: true, displayName: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.draftPick.findMany({
      where: { leagueId },
      select: { memberId: true, teamId: true, role: true },
    }),
    prisma.teamResult.findMany({
      where: { leagueId },
      select: { teamId: true, wins: true, eliminatedRound: true },
    }),
    prisma.tournamentGame.findMany({
      where: { leagueId },
      select: {
        id: true,
        winnerTeamId: true,
        loserTeamId: true,
        round: true,
        gameNo: true,
      },
      orderBy: [{ round: "asc" }, { gameNo: "asc" }],
    }),
  ]);

  const resultByTeamId = new Map(results.map((result) => [result.teamId, result]));
  const base: Record<string, MemberTotals> = {};

  for (const member of members) {
    base[member.id] = {
      memberId: member.id,
      displayName: member.displayName,
      HERO: 0,
      VILLAIN: 0,
      CINDERELLA: 0,
      rivalry: 0,
      total: 0,
    };
  }

  for (const pick of picks) {
    const member = base[pick.memberId];
    if (!member) continue;
    const result = resultByTeamId.get(pick.teamId);
    if (!result) continue;

    const reachedS16 = result.wins >= 2;
    const reachedE8 = result.wins >= 3;
    const reachedF4 = result.wins >= 4;
    const champion = isChampion(result);

    if (pick.role === "HERO") {
      member.HERO += computeHeroPoints(result.wins, reachedS16, reachedF4, champion);
    } else if (pick.role === "VILLAIN") {
      member.VILLAIN += computeVillainPoints(result.eliminatedRound);
    } else if (pick.role === "CINDERELLA") {
      member.CINDERELLA += computeCinderellaPoints(
        result.wins,
        reachedS16,
        reachedE8,
        reachedF4,
      );
    }
  }

  const { events: rivalryEvents, memberDeltas } = computeRivalryBonuses(games, picks);
  for (const [memberId, delta] of Object.entries(memberDeltas)) {
    if (base[memberId]) {
      base[memberId].rivalry += delta;
    }
  }

  const standings = Object.values(base)
    .map((row) => ({
      ...row,
      total: row.HERO + row.VILLAIN + row.CINDERELLA + row.rivalry,
    }))
    .sort((a, b) => b.total - a.total || a.displayName.localeCompare(b.displayName));

  await prisma.$transaction(async (tx) => {
    await tx.leagueScore.upsert({
      where: { leagueId },
      create: { leagueId, totals: standings },
      update: { totals: standings },
    });

    await tx.leagueScoreSnapshot.create({
      data: {
        leagueId,
        totals: standings,
      },
    });

    const oldSnapshots = await tx.leagueScoreSnapshot.findMany({
      where: { leagueId },
      orderBy: { createdAt: "desc" },
      skip: 30,
      select: { id: true },
    });

    if (oldSnapshots.length > 0) {
      await tx.leagueScoreSnapshot.deleteMany({
        where: {
          id: { in: oldSnapshots.map((snapshot) => snapshot.id) },
        },
      });
    }

    await tx.leagueEvent.deleteMany({
      where: {
        leagueId,
        type: "RIVALRY_BONUS",
      },
    });

    if (rivalryEvents.length > 0) {
      await tx.leagueEvent.createMany({
        data: rivalryEvents.map((event) => ({
          leagueId,
          type: event.type,
          payload: event,
        })),
      });
    }

    await tx.leagueEvent.create({
      data: {
        leagueId,
        type: "SCORE_RECALCULATED",
        payload: {
          standingsCount: standings.length,
          at: new Date().toISOString(),
        },
      },
    });
  });

  return standings;
}
