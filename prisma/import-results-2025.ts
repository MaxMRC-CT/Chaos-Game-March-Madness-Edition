/**
 * Import 2025 tournament results round-by-round.
 * Usage: tsx prisma/import-results-2025.ts --round R64|R32|S16|E8|F4|FINAL [--code 123456]
 */
import "dotenv/config";
import { Round } from "@prisma/client";
import * as path from "path";
import * as fs from "fs";
import { computeLeagueStandings } from "../lib/scoring/compute";
import { prisma } from "../lib/db";

const VALID_ROUNDS = ["R64", "R32", "S16", "E8", "F4", "FINAL"] as const;
type RoundArg = (typeof VALID_ROUNDS)[number];

const DEV_LEAGUE_CODE = "123456";

function parseArgs(): { round: RoundArg; code: string } {
  const args = process.argv.slice(2);
  let round: RoundArg | null = null;
  let code = DEV_LEAGUE_CODE;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--round" && args[i + 1]) {
      const r = args[i + 1].toUpperCase();
      if (VALID_ROUNDS.includes(r as RoundArg)) {
        round = r as RoundArg;
      }
      i++;
    } else if (args[i] === "--code" && args[i + 1]) {
      code = args[i + 1].trim();
      i++;
    }
  }

  if (!round) {
    console.error("Usage: tsx prisma/import-results-2025.ts --round R64|R32|S16|E8|F4|FINAL [--code 123456]");
    process.exit(1);
  }

  return { round, code };
}

type GameInput = {
  winnerName: string;
  loserName: string;
  winnerScore?: number;
  loserScore?: number;
  round?: string;
};

function roundToFile(round: RoundArg): string {
  const map: Record<RoundArg, string> = {
    R64: "r64.json",
    R32: "r32.json",
    S16: "s16.json",
    E8: "e8.json",
    F4: "f4.json",
    FINAL: "final.json",
  };
  return map[round];
}

async function main() {
  const { round, code } = parseArgs();

  const dataPath = path.join(__dirname, "data", "results_2025", roundToFile(round));
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Results file not found: ${dataPath}`);
  }

  const raw = fs.readFileSync(dataPath, "utf-8");
  let games: GameInput[];
  try {
    games = JSON.parse(raw) as GameInput[];
  } catch (e) {
    throw new Error(`Invalid JSON in ${dataPath}: ${(e as Error).message}`);
  }

  if (!Array.isArray(games)) {
    throw new Error(`Expected array of games in ${dataPath}`);
  }

  const league = await prisma.league.findUnique({
    where: { code },
    select: { id: true, tournamentYearId: true },
  });

  if (!league) {
    throw new Error(`League not found for code: ${code}. Run seed:dev2025 first.`);
  }

  const tournamentYear = await prisma.tournamentYear.findUnique({
    where: { id: league.tournamentYearId },
    select: { id: true, year: true },
  });

  if (!tournamentYear || tournamentYear.year !== 2025) {
    throw new Error(`League is not for 2025 tournament year.`);
  }

  const teams = await prisma.team.findMany({
    where: { tournamentYearId: tournamentYear.id },
    select: { id: true, name: true },
  });
  const teamByName = new Map(teams.map((t) => [t.name, t.id]));

  const missing: string[] = [];
  for (const g of games) {
    if (!teamByName.has(g.winnerName)) missing.push(g.winnerName);
    if (!teamByName.has(g.loserName)) missing.push(g.loserName);
  }
  const uniqueMissing = [...new Set(missing)];
  if (uniqueMissing.length > 0) {
    throw new Error(
      `Teams not found in 2025 roster: ${uniqueMissing.join(", ")}. Check team names match prisma/data/teams_2025.json.`
    );
  }

  const roundEnum = round as Round;

  await prisma.$transaction(async (tx) => {
    let gameNo = 1;
    for (const g of games) {
      const winnerTeamId = teamByName.get(g.winnerName)!;
      const loserTeamId = teamByName.get(g.loserName)!;

      await tx.tournamentGame.upsert({
        where: {
          leagueId_round_gameNo: {
            leagueId: league.id,
            round: roundEnum,
            gameNo,
          },
        },
        create: {
          leagueId: league.id,
          round: roundEnum,
          gameNo,
          winnerTeamId,
          loserTeamId,
        },
        update: {
          winnerTeamId,
          loserTeamId,
        },
      });

      await tx.teamResult.upsert({
        where: {
          leagueId_teamId: {
            leagueId: league.id,
            teamId: winnerTeamId,
          },
        },
        create: { leagueId: league.id, teamId: winnerTeamId, wins: 1 },
        update: { wins: { increment: 1 } },
      });

      const loserEliminatedRound = round === "FINAL" ? ("FINAL" as Round) : roundEnum;
      await tx.teamResult.upsert({
        where: {
          leagueId_teamId: {
            leagueId: league.id,
            teamId: loserTeamId,
          },
        },
        create: {
          leagueId: league.id,
          teamId: loserTeamId,
          wins: 0,
          eliminatedRound: loserEliminatedRound,
        },
        update: { eliminatedRound: loserEliminatedRound },
      });

      gameNo++;
    }
  });

  if (round === "FINAL" && games.length > 0) {
    const championName = games[games.length - 1].winnerName;
    const championTeamId = teamByName.get(championName)!;
    await prisma.teamResult.update({
      where: {
        leagueId_teamId: {
          leagueId: league.id,
          teamId: championTeamId,
        },
      },
      data: { eliminatedRound: "CHAMP" as Round },
    });

    await prisma.league.update({
      where: { id: league.id },
      data: { status: "COMPLETE" },
    });
  }

  await computeLeagueStandings(league.id);

  console.log(`✅ Imported ${games.length} games for round ${round}`);
}

main()
  .catch((e) => {
    console.error("❌ Import failed:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
