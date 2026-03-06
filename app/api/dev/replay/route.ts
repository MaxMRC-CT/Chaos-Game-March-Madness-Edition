import { Round } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import * as path from "path";
import * as fs from "fs";
import { prisma } from "@/lib/db";
import { computeLeagueStandings } from "@/lib/scoring/compute";

const VALID_ROUNDS = ["R64", "R32", "S16", "E8", "F4", "NCG", "FINAL"] as const;
type RoundArg = (typeof VALID_ROUNDS)[number];
const RESULTS_PATH = path.join(process.cwd(), "data", "2025", "results.json");
const DEV_LEAGUE_CODE = "123456";

function validateDevPanel() {
  if (process.env.ENV_NAME !== "development") {
    return NextResponse.json(
      { error: "Dev panel only available in development" },
      { status: 403 },
    );
  }

  const key = process.env.DEV_PANEL_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "DEV_PANEL_KEY not configured" },
      { status: 500 },
    );
  }

  return null;
}

type GameInput = {
  winnerName: string;
  loserName: string;
};

function toSchemaRound(r: RoundArg): Round {
  if (r === "NCG") return "FINAL";
  return r as Round;
}

export async function POST(request: NextRequest) {
  const envCheck = validateDevPanel();
  if (envCheck) return envCheck;

  const xKey = request.headers.get("x-dev-key");
  if (xKey !== process.env.DEV_PANEL_KEY) {
    return NextResponse.json({ error: "Invalid dev panel key" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const roundParam = searchParams.get("round")?.toUpperCase();
  const code = searchParams.get("code")?.trim() || DEV_LEAGUE_CODE;

  if (!roundParam || !VALID_ROUNDS.includes(roundParam as RoundArg)) {
    return NextResponse.json(
      { error: `Invalid round. Use one of: ${VALID_ROUNDS.join(", ")}` },
      { status: 400 },
    );
  }

  const round = roundParam as RoundArg;

  if (!fs.existsSync(RESULTS_PATH)) {
    return NextResponse.json(
      { error: `results.json not found at ${RESULTS_PATH}` },
      { status: 500 },
    );
  }

  const raw = fs.readFileSync(RESULTS_PATH, "utf-8");
  let data: Record<string, GameInput[]>;
  try {
    data = JSON.parse(raw) as Record<string, GameInput[]>;
  } catch (e) {
    return NextResponse.json(
      { error: `Invalid JSON: ${(e as Error).message}` },
      { status: 500 },
    );
  }

  const roundKey = round === "NCG" ? (data["NCG"] ? "NCG" : "FINAL") : round;
  const games = data[roundKey];

  if (!games || !Array.isArray(games) || games.length === 0) {
    return NextResponse.json({
      round,
      gamesInserted: 0,
      leagueId: null,
      message: `No games for round ${round}. Skipping.`,
    });
  }

  const league = await prisma.league.findUnique({
    where: { code },
    select: { id: true, tournamentYearId: true },
  });

  if (!league) {
    return NextResponse.json(
      {
        error: `League not found for code ${code}. Create test league first.`,
      },
      { status: 400 },
    );
  }

  const tournamentYear = await prisma.tournamentYear.findUnique({
    where: { id: league.tournamentYearId },
    select: { id: true, year: true },
  });

  if (!tournamentYear || tournamentYear.year !== 2025) {
    return NextResponse.json(
      { error: "League is not for 2025 tournament year." },
      { status: 400 },
    );
  }

  const teams = await prisma.team.findMany({
    where: { tournamentYearId: tournamentYear.id },
    select: { id: true, name: true, shortName: true },
  });

  const teamByName = new Map(teams.map((t) => [t.name, t.id]));
  const teamByShortName = new Map(
    teams.filter((t) => t.shortName).map((t) => [t.shortName!, t.id]),
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
    return NextResponse.json(
      {
        error: `Teams not found: ${uniqueMissing.join(", ")}. Check data/2025/teams.csv and results.json.`,
      },
      { status: 400 },
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

      const loserEliminatedRound =
        schemaRound === "FINAL" ? ("FINAL" as Round) : schemaRound;
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

  return NextResponse.json({
    round,
    gamesInserted: games.length,
    leagueId: league.id,
  });
}
