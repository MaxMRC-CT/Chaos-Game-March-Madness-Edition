import { Round } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import * as path from "path";
import * as fs from "fs";
import { prisma } from "@/lib/db";
import { applyRoundGames } from "@/lib/dev/apply-round";

const VALID_ROUNDS = ["R64", "R32", "S16", "E8", "F4", "NCG"] as const;
type RoundArg = (typeof VALID_ROUNDS)[number];

const RESULTS_PATH = path.join(process.cwd(), "data", "2025", "results.json");

type GameInput = {
  winnerName: string;
  loserName: string;
};

function toSchemaRound(r: RoundArg): Round {
  if (r === "NCG") return "FINAL";
  return r as Round;
}

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export async function POST(request: NextRequest) {
  if (process.env.ENV_NAME !== "development") {
    return NextResponse.json(
      { ok: false, error: "Dev panel only available in development" },
      { status: 403 }
    );
  }

  const devKey = process.env.DEV_PANEL_KEY;
  if (!devKey) {
    return NextResponse.json(
      { ok: false, error: "DEV_PANEL_KEY not configured" },
      { status: 500 }
    );
  }

  const xKey = request.headers.get("x-dev-key");
  if (xKey !== devKey) {
    return NextResponse.json(
      { ok: false, error: "Invalid dev panel key" },
      { status: 403 }
    );
  }

  const dbUrl = process.env.DATABASE_URL ?? "";
  if (dbUrl.includes("morning-meadow")) {
    return NextResponse.json(
      { ok: false, error: "Refused: production database detected" },
      { status: 403 }
    );
  }

  let body: { code?: string; round?: string; winnersText?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const code = String(body.code ?? "").trim();
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { ok: false, error: "code must be 6 digits" },
      { status: 400 }
    );
  }

  const roundParam = String(body.round ?? "").toUpperCase();
  if (!VALID_ROUNDS.includes(roundParam as RoundArg)) {
    return NextResponse.json(
      {
        ok: false,
        error: `round must be one of: ${VALID_ROUNDS.join(", ")}`,
      },
      { status: 400 }
    );
  }
  const round = roundParam as RoundArg;

  const winnersText = String(body.winnersText ?? "");
  const winnerLines = winnersText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (!fs.existsSync(RESULTS_PATH)) {
    return NextResponse.json(
      { ok: false, error: "results.json not found" },
      { status: 500 }
    );
  }

  let data: Record<string, GameInput[]>;
  try {
    data = JSON.parse(
      fs.readFileSync(RESULTS_PATH, "utf-8")
    ) as Record<string, GameInput[]>;
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Invalid results.json: ${(e as Error).message}` },
      { status: 500 }
    );
  }

  const roundKey = round === "NCG" ? (data["NCG"] ? "NCG" : "FINAL") : round;
  const games = data[roundKey];
  if (!games || !Array.isArray(games) || games.length === 0) {
    return NextResponse.json({
      ok: true,
      applied: 0,
      skipped: winnerLines.length,
      missingWinners: winnerLines,
      missingTeams: [],
    });
  }

  const winnerToLoser = new Map<string, string>();
  for (const g of games) {
    winnerToLoser.set(normalize(g.winnerName), g.loserName);
  }

  const league = await prisma.league.findUnique({
    where: { code },
    select: { id: true, tournamentYearId: true },
  });

  if (!league) {
    return NextResponse.json(
      { ok: false, error: `League not found for code ${code}` },
      { status: 404 }
    );
  }

  const tournamentYear = await prisma.tournamentYear.findUnique({
    where: { id: league.tournamentYearId },
    select: { id: true, year: true },
  });

  if (!tournamentYear || tournamentYear.year !== 2025) {
    return NextResponse.json(
      { ok: false, error: "League is not for 2025 tournament year" },
      { status: 400 }
    );
  }

  const teams = await prisma.team.findMany({
    where: { tournamentYearId: tournamentYear.id },
    select: { id: true, name: true, shortName: true },
  });

  const teamByName = new Map(teams.map((t) => [t.name, t.id]));
  const teamByShortName = new Map(
    teams.filter((t) => t.shortName).map((t) => [t.shortName!, t.id])
  );
  const teamByNormalized = new Map(
    teams.map((t) => [normalize(t.name), t.id])
  );
  const teamByNormalizedShort = new Map(
    teams
      .filter((t) => t.shortName)
      .map((t) => [normalize(t.shortName!), t.id])
  );

  function findTeamId(name: string): string | null {
    const byName = teamByName.get(name);
    if (byName) return byName;
    const byShort = teamByShortName.get(name);
    if (byShort) return byShort;
    const norm = normalize(name);
    const byNorm = teamByNormalized.get(norm);
    if (byNorm) return byNorm;
    const byNormShort = teamByNormalizedShort.get(norm);
    return byNormShort ?? null;
  }

  const schemaRound = toSchemaRound(round);
  const missingWinners: string[] = [];
  const missingTeams: string[] = [];
  const toApply: { winnerName: string; loserName: string }[] = [];

  for (const winnerName of winnerLines) {
    const loserName = winnerToLoser.get(normalize(winnerName));
    if (!loserName) {
      missingWinners.push(winnerName);
      continue;
    }
    const winnerId = findTeamId(winnerName);
    const loserId = findTeamId(loserName);
    if (!winnerId) {
      missingTeams.push(winnerName);
      continue;
    }
    if (!loserId) {
      missingTeams.push(loserName);
      continue;
    }
    toApply.push({ winnerName, loserName });
  }

  const gamesToApply = toApply.map(({ winnerName, loserName }) => ({
    winnerTeamId: findTeamId(winnerName)!,
    loserTeamId: findTeamId(loserName)!,
  }));

  const applied = await applyRoundGames(league.id, schemaRound, gamesToApply);

  const skipped = winnerLines.length - applied;

  return NextResponse.json({
    ok: true,
    applied,
    skipped,
    missingWinners: [...new Set(missingWinners)],
    missingTeams: [...new Set(missingTeams)],
  });
}
