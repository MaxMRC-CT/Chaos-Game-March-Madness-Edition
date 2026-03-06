import { Round } from "@prisma/client";
import { prisma } from "@/lib/db";
import { computeLeagueStandings } from "@/lib/scoring/compute";

/**
 * Apply round results for a league. Overwrites any existing games for that round.
 * @returns Number of games applied
 */
export async function applyRoundGames(
  leagueId: string,
  round: Round,
  games: { winnerTeamId: string; loserTeamId: string }[]
): Promise<number> {
  if (games.length === 0) return 0;

  const existingGames = await prisma.tournamentGame.findMany({
    where: { leagueId, round },
    select: { gameNo: true, winnerTeamId: true, loserTeamId: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const g of existingGames) {
      await tx.teamResult.update({
        where: {
          leagueId_teamId: { leagueId, teamId: g.winnerTeamId },
        },
        data: { wins: { decrement: 1 } },
      });
      await tx.teamResult.update({
        where: {
          leagueId_teamId: { leagueId, teamId: g.loserTeamId },
        },
        data: { eliminatedRound: null },
      });
    }

    await tx.tournamentGame.deleteMany({
      where: { leagueId, round },
    });

    let gameNo = 1;
    for (const { winnerTeamId, loserTeamId } of games) {
      const loserEliminatedRound: Round =
        round === "FINAL" ? "FINAL" : round;

      await tx.tournamentGame.create({
        data: {
          leagueId,
          round,
          gameNo,
          winnerTeamId,
          loserTeamId,
        },
      });

      await tx.teamResult.upsert({
        where: {
          leagueId_teamId: { leagueId, teamId: winnerTeamId },
        },
        create: { leagueId, teamId: winnerTeamId, wins: 1 },
        update: { wins: { increment: 1 } },
      });

      await tx.teamResult.upsert({
        where: {
          leagueId_teamId: { leagueId, teamId: loserTeamId },
        },
        create: {
          leagueId,
          teamId: loserTeamId,
          wins: 0,
          eliminatedRound: loserEliminatedRound,
        },
        update: { eliminatedRound: loserEliminatedRound },
      });

      await tx.leagueEvent.create({
        data: {
          leagueId,
          type: "GAME_RESULT_IMPORTED",
          payload: {
            round,
            gameNo,
            winnerTeamId,
            loserTeamId,
          },
        },
      });

      gameNo++;
    }
  });

  if (round === "FINAL" && games.length > 0) {
    const championTeamId = games[games.length - 1].winnerTeamId;
    await prisma.teamResult.update({
      where: {
        leagueId_teamId: { leagueId, teamId: championTeamId },
      },
      data: { eliminatedRound: "CHAMP" as Round },
    });

    await prisma.league.update({
      where: { id: leagueId },
      data: { status: "COMPLETE" },
    });
  }

  await computeLeagueStandings(leagueId);
  return games.length;
}
