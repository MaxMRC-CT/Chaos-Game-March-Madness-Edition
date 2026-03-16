import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  FIRST_FOUR_2026,
  FIRST_ROUND_MATCHUPS_2026,
  TEAMS_2026,
  type TournamentTeamInput,
} from "./data/tournament-2026";

const prisma = new PrismaClient();

const TOURNAMENT_YEAR = 2026;
const TOURNAMENT_NAME = "2026 NCAA Division I Men's Basketball Championship";
const LEGACY_TOURNAMENT_YEARS = [2025, 2026] as const;

async function removeLeaguesForYear(tournamentYearId: string) {
  const leagues = await prisma.league.findMany({
    where: { tournamentYearId },
    select: { id: true },
  });

  if (leagues.length === 0) return;

  const leagueIds = leagues.map((league) => league.id);

  await prisma.portfolioPick.deleteMany({ where: { leagueId: { in: leagueIds } } });
  await prisma.draftPick.deleteMany({ where: { leagueId: { in: leagueIds } } });
  await prisma.leagueEvent.deleteMany({ where: { leagueId: { in: leagueIds } } });
  await prisma.leagueScoreSnapshot.deleteMany({ where: { leagueId: { in: leagueIds } } });
  await prisma.leagueScore.deleteMany({ where: { leagueId: { in: leagueIds } } });
  await prisma.teamResult.deleteMany({ where: { leagueId: { in: leagueIds } } });
  await prisma.tournamentGame.deleteMany({ where: { leagueId: { in: leagueIds } } });
  await prisma.leagueMember.deleteMany({ where: { leagueId: { in: leagueIds } } });
  await prisma.league.deleteMany({ where: { id: { in: leagueIds } } });
}

async function resetTournamentYear(year: number) {
  const existing = await prisma.tournamentYear.findUnique({
    where: { year },
    select: { id: true },
  });

  if (!existing) return;

  await removeLeaguesForYear(existing.id);
  await prisma.team.deleteMany({ where: { tournamentYearId: existing.id } });
  await prisma.tournamentYear.delete({ where: { id: existing.id } });
}

function validateBracketSlots(teams: TournamentTeamInput[]) {
  const teamNames = new Set(teams.map((team) => team.name));

  for (const matchup of FIRST_ROUND_MATCHUPS_2026) {
    if (!teamNames.has(matchup.teamA) || !teamNames.has(matchup.teamB)) {
      throw new Error(
        `Missing team for first-round matchup ${matchup.region}: ${matchup.teamA} vs ${matchup.teamB}`,
      );
    }
  }
}

async function seedTournamentYear() {
  validateBracketSlots(TEAMS_2026);

  const year = await prisma.tournamentYear.create({
    data: {
      year: TOURNAMENT_YEAR,
      name: TOURNAMENT_NAME,
    },
    select: { id: true },
  });

  await prisma.team.createMany({
    data: TEAMS_2026.map((team) => ({
      tournamentYearId: year.id,
      name: team.name,
      seed: team.seed,
      region: team.region,
      shortName: team.shortName ?? null,
      logoUrl: null,
    })),
  });

  const totalTeams = await prisma.team.count({
    where: { tournamentYearId: year.id },
  });

  if (totalTeams !== TEAMS_2026.length) {
    throw new Error(`Expected ${TEAMS_2026.length} teams for ${TOURNAMENT_YEAR}, found ${totalTeams}.`);
  }

  console.log(`✅ Seeded ${TOURNAMENT_YEAR} tournament year with ${totalTeams} bracket slots.`);
  console.log(
    `ℹ️ First Four is represented as 4 composite bracket slots: ${FIRST_FOUR_2026.map((slot) => slot.slotName).join(", ")}.`,
  );
}

async function main() {
  for (const year of LEGACY_TOURNAMENT_YEARS) {
    await resetTournamentYear(year);
  }

  await seedTournamentYear();
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
