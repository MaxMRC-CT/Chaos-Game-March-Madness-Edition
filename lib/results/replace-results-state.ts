import { Round } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revalidateLeagueViews } from "@/lib/league/revalidate";
import { computeLeagueStandings } from "@/lib/scoring/compute";

export type TeamResultInput = {
  teamId: string;
  wins: number;
  eliminatedRound: Round | null;
};

export type TournamentGameInput = {
  round: Round;
  gameNo: number;
  winnerTeamId: string;
  loserTeamId: string;
};

export async function replaceResultsState(
  leagueId: string,
  teamResults: TeamResultInput[],
  games: TournamentGameInput[],
) {
  await prisma.$transaction(async (tx) => {
    await tx.teamResult.deleteMany({ where: { leagueId } });
    if (teamResults.length > 0) {
      await tx.teamResult.createMany({
        data: teamResults.map((result) => ({
          leagueId,
          teamId: result.teamId,
          wins: result.wins,
          eliminatedRound: result.eliminatedRound,
        })),
      });
    }

    await tx.tournamentGame.deleteMany({ where: { leagueId } });
    if (games.length > 0) {
      await tx.tournamentGame.createMany({
        data: games.map((game) => ({
          leagueId,
          round: game.round,
          gameNo: game.gameNo,
          winnerTeamId: game.winnerTeamId,
          loserTeamId: game.loserTeamId,
        })),
      });
    }

    await tx.leagueEvent.deleteMany({
      where: { leagueId, type: "TEAM_ELIMINATED" },
    });

    const eliminationEvents = teamResults
      .filter((result) => result.eliminatedRound && result.eliminatedRound !== "CHAMP")
      .map((result) => ({
        leagueId,
        type: "TEAM_ELIMINATED",
        payload: {
          teamId: result.teamId,
          eliminatedRound: result.eliminatedRound,
        },
      }));

    if (eliminationEvents.length > 0) {
      await tx.leagueEvent.createMany({ data: eliminationEvents });
    }

    const hasChampion = teamResults.some((result) => result.eliminatedRound === "CHAMP");
    if (hasChampion) {
      await tx.league.update({
        where: { id: leagueId },
        data: { status: "COMPLETE" },
      });
    } else {
      const hasLiveResults =
        games.length > 0 ||
        teamResults.some((result) => result.wins > 0 || result.eliminatedRound !== null);

      if (hasLiveResults) {
        await tx.league.updateMany({
          where: {
            id: leagueId,
            status: { in: ["SETUP", "LOCKED", "DRAFT"] },
          },
          data: { status: "LIVE" },
        });
      }
    }
  });

  await computeLeagueStandings(leagueId);
  revalidateLeagueViews(leagueId);
}
