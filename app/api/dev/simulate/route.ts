import { Round } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import * as path from "path";
import * as fs from "fs";
import { prisma } from "@/lib/db";
import { applyRoundGames } from "@/lib/dev/apply-round";
import { getRoundHealth, logRoundHealth } from "@/lib/tournament/roundHealth";

const ROUNDS = ["R64", "R32", "S16", "E8", "F4", "NCG"] as const;
type RoundArg = (typeof ROUNDS)[number];

const MODES = [
  "REAL_RESULTS",
  "RANDOM",
  "HERO_ALWAYS_WINS",
  "CINDERELLA_CHAOS",
] as const;
type SimulateMode = (typeof MODES)[number];

const REGIONS = ["East", "West", "South", "Midwest"] as const;

function validateFull64Bracket(teams: { id: string; seed: number; region: string }[]) {
  if (teams.length !== 64) {
    throw new Error(`Expected 64 teams for full bracket simulation, found ${teams.length}.`);
  }

  const regions = ["East", "West", "South", "Midwest"] as const;

  for (const region of regions) {
    const regionTeams = teams.filter((t) => t.region === region);
    if (regionTeams.length !== 16) {
      throw new Error(`Region "${region}" must contain exactly 16 teams. Found ${regionTeams.length}.`);
    }

    const seeds = regionTeams.map((t) => t.seed).sort((a, b) => a - b);
    const expectedSeeds = Array.from({ length: 16 }, (_, i) => i + 1);

    const ok = seeds.every((s, i) => s === expectedSeeds[i]);
    if (!ok) {
      throw new Error(
        `Region "${region}" must contain seeds 1 through 16 exactly once. Found: ${seeds.join(", ")}`
      );
    }
  }
}

function toSchemaRound(r: RoundArg): Round {
  return r === "NCG" ? "FINAL" : (r as Round);
}

function validateDevPanel(request: NextRequest): NextResponse | null {
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

  return null;
}

type TeamRow = { id: string; name: string; shortName: string | null; seed: number; region: string };

/** Build R64 matchups: region order, then seed matchup (1v16, 2v15, etc) within each region */
function buildR64Matchups(teams: TeamRow[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (const region of REGIONS) {
    const regionTeams = teams
      .filter((t) => t.region === region)
      .sort((a, b) => a.seed - b.seed || a.name.localeCompare(b.name));
    let left = 0;
    let right = regionTeams.length - 1;
    while (left < right) {
      pairs.push([regionTeams[left].id, regionTeams[right].id]);
      left++;
      right--;
    }
  }
  return pairs;
}

/** Get next-round matchups from prior-round winners (by gameNo order) */
function buildNextRoundMatchups(
  priorGames: { winnerTeamId: string }[]
): [string, string][] {
  const winners = priorGames.map((g) => g.winnerTeamId);
  const pairs: [string, string][] = [];
  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 < winners.length) {
      pairs.push([winners[i], winners[i + 1]]);
    }
  }
  return pairs;
}

function pickWinner(
  teamAId: string,
  teamBId: string,
  mode: SimulateMode,
  teamById: Map<string, TeamRow>,
  heroTeamIds: Set<string>
): string {
  if (mode === "RANDOM") {
    return Math.random() < 0.5 ? teamAId : teamBId;
  }
  if (mode === "HERO_ALWAYS_WINS") {
    const aIsHero = heroTeamIds.has(teamAId);
    const bIsHero = heroTeamIds.has(teamBId);
    if (aIsHero && !bIsHero) return teamAId;
    if (bIsHero && !aIsHero) return teamBId;
    return Math.random() < 0.5 ? teamAId : teamBId;
  }
  if (mode === "CINDERELLA_CHAOS") {
    const teamA = teamById.get(teamAId);
    const teamB = teamById.get(teamBId);
    const seedA = teamA?.seed ?? 16;
    const seedB = teamB?.seed ?? 16;
    if (seedA < seedB) return teamAId; // lower seed = better
    if (seedB < seedA) return teamBId;
    return Math.random() < 0.5 ? teamAId : teamBId;
  }
  return Math.random() < 0.5 ? teamAId : teamBId;
}

export async function POST(request: NextRequest) {
  const err = validateDevPanel(request);
  if (err) return err;

  let body: { leagueCode?: string; year?: number; mode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const leagueCode = String(body.leagueCode ?? "").trim();
  if (!/^\d{6}$/.test(leagueCode)) {
    return NextResponse.json(
      { ok: false, error: "leagueCode must be 6 digits" },
      { status: 400 }
    );
  }

  const year = typeof body.year === "number" ? body.year : 2025;
  const modeParam = String(body.mode ?? "").toUpperCase();
  if (!MODES.includes(modeParam as SimulateMode)) {
    return NextResponse.json(
      { ok: false, error: `mode must be one of: ${MODES.join(", ")}` },
      { status: 400 }
    );
  }
  const mode = modeParam as SimulateMode;

  const league = await prisma.league.findUnique({
    where: { code: leagueCode },
    select: { id: true, tournamentYearId: true },
  });

  if (!league) {
    return NextResponse.json(
      { ok: false, error: `League not found for code ${leagueCode}` },
      { status: 404 }
    );
  }

  const tournamentYear = await prisma.tournamentYear.findUnique({
    where: { id: league.tournamentYearId },
    select: { id: true, year: true },
  });

  if (!tournamentYear || tournamentYear.year !== year) {
    return NextResponse.json(
      { ok: false, error: `League is not for year ${year}` },
      { status: 400 }
    );
  }

  const teams = await prisma.team.findMany({
    where: { tournamentYearId: tournamentYear.id },
    select: { id: true, name: true, shortName: true, seed: true, region: true },
  });

  console.log("TEAM COUNT", teams.length);
  for (const r of ["East", "West", "South", "Midwest"]) {
    console.log("REGION", r, teams.filter((t) => t.region === r).length);
  }

  try {
    validateFull64Bracket(teams);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 400 }
    );
  }

  const r64MatchupsForLog = buildR64Matchups(teams);
  console.log("R64 MATCHUPS", r64MatchupsForLog.length);

  const teamById = new Map(teams.map((t) => [t.id, t]));

  let heroTeamIds = new Set<string>();
  if (mode === "HERO_ALWAYS_WINS") {
    const picks = await prisma.draftPick.findMany({
      where: { leagueId: league.id, role: "HERO" },
      select: { teamId: true },
    });
    heroTeamIds = new Set(picks.map((p) => p.teamId));
  }

  const resultsPath = path.join(process.cwd(), "data", String(year), "results.json");
  let realResults: Record<string, Array<{ winnerName: string; loserName: string }>> | null = null;
  if (mode === "REAL_RESULTS") {
    if (!fs.existsSync(resultsPath)) {
      return NextResponse.json(
        { ok: false, error: `results.json not found at data/${year}/results.json` },
        { status: 500 }
      );
    }
    try {
      realResults = JSON.parse(
        fs.readFileSync(resultsPath, "utf-8")
      ) as Record<string, Array<{ winnerName: string; loserName: string }>>;
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: `Invalid results.json: ${(e as Error).message}` },
        { status: 500 }
      );
    }
  }

  const teamByName = new Map(teams.map((t) => [t.name.toLowerCase().replace(/\s+/g, " "), t.id]));
  const teamByShort = new Map(
    teams.filter((t) => t.shortName).map((t) => [t.shortName!.toLowerCase(), t.id])
  );

  function findTeamId(name: string): string | null {
    const n = name.trim().toLowerCase().replace(/\s+/g, " ");
    return teamByName.get(n) ?? teamByShort.get(n) ?? null;
  }

  const applied: Array<{ round: string; gamesApplied: number }> = [];

  for (const roundArg of ROUNDS) {
    const schemaRound = toSchemaRound(roundArg);
    let expected: number;

    if (roundArg === "R64") {
      expected = buildR64Matchups(teams).length; // should be 32
    } else {
      const priorRound = ROUNDS[ROUNDS.indexOf(roundArg) - 1];
      const priorSchemaRound = toSchemaRound(priorRound);

      const priorGamesForExpected = await prisma.tournamentGame.findMany({
        where: { leagueId: league.id, round: priorSchemaRound },
        select: { winnerTeamId: true, gameNo: true },
        orderBy: { gameNo: "asc" },
      });

      expected = Math.floor(priorGamesForExpected.length / 2);
    }
    let games: { winnerTeamId: string; loserTeamId: string }[] = [];

    if (roundArg === "R64") {
      if (mode === "REAL_RESULTS" && realResults?.R64?.length) {
        for (const g of realResults.R64) {
          const winnerId = findTeamId(g.winnerName);
          const loserId = findTeamId(g.loserName);
          if (winnerId && loserId) games.push({ winnerTeamId: winnerId, loserTeamId: loserId });
        }
      }
      if (games.length === 0) {
        const matchups = buildR64Matchups(teams);
        for (const [teamAId, teamBId] of matchups) {
          const winnerId = pickWinner(teamAId, teamBId, mode, teamById, heroTeamIds);
          const loserId = winnerId === teamAId ? teamBId : teamAId;
          games.push({ winnerTeamId: winnerId, loserTeamId: loserId });
        }
      }
    } else {
      const roundKey = roundArg === "NCG" ? (realResults?.["NCG"] ? "NCG" : "FINAL") : roundArg;
      if (mode === "REAL_RESULTS" && realResults?.[roundKey]?.length) {
        for (const g of realResults[roundKey]) {
          const winnerId = findTeamId(g.winnerName);
          const loserId = findTeamId(g.loserName);
          if (winnerId && loserId) games.push({ winnerTeamId: winnerId, loserTeamId: loserId });
        }
      }
      if (games.length === 0) {
        const priorRound = ROUNDS[ROUNDS.indexOf(roundArg) - 1];
        const priorSchemaRound = toSchemaRound(priorRound);
        const priorGames = await prisma.tournamentGame.findMany({
          where: { leagueId: league.id, round: priorSchemaRound },
          select: { winnerTeamId: true, gameNo: true },
          orderBy: { gameNo: "asc" },
        });
        const matchups = buildNextRoundMatchups(priorGames);
        for (const [teamAId, teamBId] of matchups) {
          const winnerId = pickWinner(teamAId, teamBId, mode, teamById, heroTeamIds);
          const loserId = winnerId === teamAId ? teamBId : teamAId;
          games.push({ winnerTeamId: winnerId, loserTeamId: loserId });
        }
      }
    }

    if (games.length === 0 && expected > 0) {
      const priorRound = roundArg === "R64" ? "teams" : ROUNDS[ROUNDS.indexOf(roundArg) - 1];
      return NextResponse.json(
        {
          ok: false,
          error: `Round ${roundArg}: expected ${expected} games but none produced. Prior source: ${priorRound}. Ensure prior round has games (orderBy gameNo asc).`,
        },
        { status: 500 }
      );
    }

    console.log(`[SIM] ${roundArg}: expected=${expected} produced=${games.length}`);

    const count = await applyRoundGames(league.id, schemaRound, games);
    applied.push({ round: roundArg, gamesApplied: count });
  }

  const roundHealth = await getRoundHealth(league.id);
  logRoundHealth(roundHealth);

  if (!roundHealth.ok) {
    return NextResponse.json(
      { ok: false, error: roundHealth.error, applied, roundHealth },
      { status: 500 }
    );
  }
  if (!roundHealth.championTeamId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Simulation complete but FINAL round has no champion (winnerTeamId).",
        applied,
        roundHealth,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    applied,
    mode,
    roundHealth,
    championTeamId: roundHealth.championTeamId,
  });
}
