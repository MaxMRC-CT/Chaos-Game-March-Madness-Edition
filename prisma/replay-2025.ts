/**
 * Replay 2025 tournament results round-by-round.
 * Idempotent: safe to re-run the same round.
 *
 * Usage: npx dotenv -e .env.development -- tsx prisma/replay-2025.ts --round=R64 [--code=123456]
 */
import "dotenv/config";
import { Round } from "@prisma/client";
import * as path from "path";
import * as fs from "fs";
import { computeLeagueStandings } from "../lib/scoring/compute";
import { prisma } from "../lib/db";

const VALID_ROUNDS = ["R64", "R32", "S16", "E8", "F4", "NCG", "FINAL"] as const;
type RoundArg = (typeof VALID_ROUNDS)[number];

const RESULTS_PATH = path.join(process.cwd(), "data", "2025", "results.json");
const DEV_LEAGUE_CODE = "123456";

const EXPECTED_GAMES_BY_ROUND: Record<string, number> = {
  R64: 32,
  R32: 16,
  S16: 8,
  E8: 4,
  F4: 2,
  NCG: 1,
  FINAL: 1,
};

function parseArgs(): { round: RoundArg; code: string } {
  const args = process.argv.slice(2);
  let round: RoundArg | null = null;
  let code = DEV_LEAGUE_CODE;

  for (const arg of args) {
    if (arg.startsWith("--round=")) {
      const r = arg.split("=")[1]?.toUpperCase();
      if (r && VALID_ROUNDS.includes(r as RoundArg)) {
        round = r as RoundArg;
      }
    } else if (arg.startsWith("--code=")) {
      code = arg.split("=")[1]?.trim() || DEV_LEAGUE_CODE;
    }
  }

  if (!round) {
    console.error(
      "Usage: tsx prisma/replay-2025.ts --round=R64|R32|S16|E8|F4|NCG [--code=123456]"
    );
    process.exit(1);
  }

  return { round, code };
}

type GameInput = {
  winnerName: string;
  loserName: string;
};

/** NCG maps to FINAL in schema */
function toSchemaRound(r: RoundArg): Round {
  if (r === "NCG") return "FINAL";
  return r as Round;
}

async function main() {
  const { round, code } = parseArgs();

  if (!fs.existsSync(RESULTS_PATH)) {
    throw new Error(`results.json not found at ${RESULTS_PATH}`);
  }

  const raw = fs.readFileSync(RESULTS_PATH, "utf-8");
  let data: Record<string, GameInput[]>;
  try {
    data = JSON.parse(raw) as Record<string, GameInput[]>;
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }

  const roundKey = round === "NCG" ? (data["NCG"] ? "NCG" : "FINAL") : round;
  const games = data[roundKey];
  if (!games || !Array.isArray(games) || games.length === 0) {
    console.log(`No games for round ${round}. Skipping.`);
    return;
  }

  const league = await prisma.league.findUnique({
    where: { code },
    select: { id: true, tournamentYearId: true },
  });

  if (!league) {
    throw new Error(`League not found for code ${code}. Run seed:dev2025 to create a dev league.`);
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
    select: { id: true, name: true, shortName: true },
  });

  const teamByName = new Map(teams.map((t) => [t.name, t.id]));
  const teamByShortName = new Map(
    teams.filter((t) => t.shortName).map((t) => [t.shortName!, t.id])
  );

  function findTeamId(name: string): string | null {
    const byName = teamByName.get(name);
    if (byName) return byName;
    const byShort = teamByShortName.get(name);
    return byShort ?? null;
  }

  const missing: string[] = [];
  for (const g of games) {
    if (!findTeamId(g.winnerName)) missing.push(g.winnerName);
    if (!findTeamId(g.loserName)) missing.push(g.loserName);
  }
  const uniqueMissing = [...new Set(missing)];
  if (uniqueMissing.length > 0) {
    throw new Error(
      `Teams not found: ${uniqueMissing.join(", ")}. Check data/2025/teams.csv and results.json.`
    );
  }

  const schemaRound = toSchemaRound(round);

  await prisma.$transaction(async (tx) => {
    let gameNo = 1;
    for (const g of games) {
      const winnerTeamId = findTeamId(g.winnerName)!;
      const loserTeamId = findTeamId(g.loserName)!;

      await tx.tournamentGame.upsert({
        where: {
          leagueId_round_gameNo: {
            leagueId: league.id,
            round: schemaRound,
            gameNo,
          },
        },
        create: {
          leagueId: league.id,
          round: schemaRound,
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

      const loserEliminatedRound = schemaRound === "FINAL" ? ("FINAL" as Round) : schemaRound;
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

      await tx.leagueEvent.create({
        data: {
          leagueId: league.id,
          type: "GAME_RESULT_IMPORTED",
          payload: {
            round: schemaRound,
            gameNo,
            winnerTeamId,
            loserTeamId,
          },
        },
      });
      gameNo++;
    }
  });

  if (schemaRound === "FINAL" && games.length > 0) {
    const championName = games[games.length - 1].winnerName;
    const championTeamId = findTeamId(championName)!;
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

  const expected = EXPECTED_GAMES_BY_ROUND[round] ?? EXPECTED_GAMES_BY_ROUND[toSchemaRound(round)];
  console.log(`✅ Replayed ${games.length} game(s) for round ${round}`);
  if (expected != null && games.length < expected) {
    console.warn(
      `WARNING: Incomplete round data — bracket will only partially update. (${games.length}/${expected} games)`
    );
  }
}

main()
  .catch((e) => {
    console.error("❌ replay-2025 failed:", (e as Error).message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
