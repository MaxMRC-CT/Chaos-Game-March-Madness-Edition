import { Round } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import * as path from "path";
import * as fs from "fs";
import { prisma } from "@/lib/db";
import { applyRoundGames } from "@/lib/dev/apply-round";
import { validateBetaAdmin } from "@/lib/beta-admin/validate-beta-admin";

const ROUNDS = ["R64", "R32", "S16", "E8", "F4", "NCG"] as const;
type RoundArg = (typeof ROUNDS)[number];
const EXPECTED: Record<string, number> = {
  R64: 32,
  R32: 16,
  S16: 8,
  E8: 4,
  F4: 2,
  NCG: 1,
};
const RESULTS_PATH = path.join(process.cwd(), "data", "2025", "results.json");

type GameInput = { winnerName: string; loserName: string };

function toSchemaRound(r: RoundArg): Round {
  return r === "NCG" ? "FINAL" : (r as Round);
}

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** POST /api/beta-admin/apply-round - Apply round(s) from data/2025/results.json (production-safe) */
export async function POST(request: NextRequest) {
  const err = validateBetaAdmin(request);
  if (err) return err;

  let body: { leagueId?: string; code?: string; round?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const leagueIdParam = body.leagueId?.trim();
  const codeParam = body.code?.trim();
  const roundParam = (body.round ?? "").toUpperCase();
  const action = (body.action ?? "apply").toLowerCase();

  const league = leagueIdParam
    ? await prisma.league.findUnique({ where: { id: leagueIdParam } })
    : codeParam && /^\d{6}$/.test(codeParam)
      ? await prisma.league.findUnique({ where: { code: codeParam } })
      : null;

  if (!league) {
    return NextResponse.json(
      { ok: false, error: "League not found. Provide leagueId or code." },
      { status: 404 },
    );
  }

  const tournamentYear = await prisma.tournamentYear.findUnique({
    where: { id: league.tournamentYearId },
    select: { id: true, year: true },
  });
  if (!tournamentYear || tournamentYear.year !== 2025) {
    return NextResponse.json(
      { ok: false, error: "League must be 2025 for replay." },
      { status: 400 },
    );
  }

  if (!fs.existsSync(RESULTS_PATH)) {
    return NextResponse.json(
      { ok: false, error: "results.json not found" },
      { status: 500 },
    );
  }

  let data: Record<string, GameInput[]>;
  try {
    data = JSON.parse(fs.readFileSync(RESULTS_PATH, "utf-8"));
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Invalid results.json: ${(e as Error).message}` },
      { status: 500 },
    );
  }

  const games = await prisma.tournamentGame.findMany({
    where: { leagueId: league.id },
    select: { round: true },
  });
  const counts: Record<string, number> = {
    R64: 0,
    R32: 0,
    S16: 0,
    E8: 0,
    F4: 0,
    NCG: 0,
  };
  for (const g of games) {
    const key = g.round === "FINAL" ? "NCG" : g.round;
    if (key in counts) counts[key]++;
  }

  if (action === "reset") {
    await prisma.leagueEvent.deleteMany({
      where: { leagueId: league.id, type: "GAME_RESULT_IMPORTED" },
    });
    await prisma.teamResult.deleteMany({ where: { leagueId: league.id } });
    await prisma.tournamentGame.deleteMany({ where: { leagueId: league.id } });
    await prisma.leagueScore.deleteMany({ where: { leagueId: league.id } });
    await prisma.leagueScoreSnapshot.deleteMany({
      where: { leagueId: league.id },
    });
    await prisma.league.update({
      where: { id: league.id },
      data: { status: "LIVE" },
    });
    return NextResponse.json({
      ok: true,
      action: "reset",
      message: "Results reset. League is LIVE.",
    });
  }

  if (action === "apply_next") {
    let nextRound: RoundArg | null = null;
    for (const r of ROUNDS) {
      const expected = EXPECTED[r];
      const current = counts[r] ?? 0;
      if (current < expected) {
        nextRound = r;
        break;
      }
    }
    if (!nextRound) {
      return NextResponse.json({
        ok: true,
        action: "apply_next",
        applied: [],
        message: "All rounds already applied.",
      });
    }
    const roundKey =
      nextRound === "NCG" ? (data["NCG"] ? "NCG" : "FINAL") : nextRound;
    const roundGames = data[roundKey];
    if (!roundGames || !Array.isArray(roundGames) || roundGames.length === 0) {
      return NextResponse.json({
        ok: false,
        error: `No games for ${nextRound} in results.json`,
      });
    }

    const teams = await prisma.team.findMany({
      where: { tournamentYearId: tournamentYear.id },
      select: { id: true, name: true, shortName: true },
    });
    const teamByName = new Map(teams.map((t) => [t.name, t.id]));
    const teamByShort = new Map(
      teams.filter((t) => t.shortName).map((t) => [t.shortName!, t.id]),
    );
    const teamByNorm = new Map(teams.map((t) => [normalize(t.name), t.id]));
    const teamByNormShort = new Map(
      teams
        .filter((t) => t.shortName)
        .map((t) => [normalize(t.shortName!), t.id]),
    );
    function findTeamId(name: string): string | null {
      return (
        teamByName.get(name) ??
        teamByShort.get(name) ??
        teamByNorm.get(normalize(name)) ??
        teamByNormShort.get(normalize(name)) ??
        null
      );
    }

    const gamesToApply: { winnerTeamId: string; loserTeamId: string }[] = [];
    for (const g of roundGames) {
      const wid = findTeamId(g.winnerName);
      const lid = findTeamId(g.loserName);
      if (wid && lid) gamesToApply.push({ winnerTeamId: wid, loserTeamId: lid });
    }
    const schemaRound = toSchemaRound(nextRound);
    const n = await applyRoundGames(league.id, schemaRound, gamesToApply);
    return NextResponse.json({
      ok: true,
      action: "apply_next",
      applied: [{ round: nextRound, gamesApplied: n }],
      message: `Applied ${nextRound} (${n} games).`,
    });
  }

  if (!roundParam || !ROUNDS.includes(roundParam as RoundArg)) {
    return NextResponse.json(
      {
        ok: false,
        error: `round must be one of: ${ROUNDS.join(", ")}`,
      },
      { status: 400 },
    );
  }

  const round = roundParam as RoundArg;
  const roundKey = round === "NCG" ? (data["NCG"] ? "NCG" : "FINAL") : round;
  const roundGames = data[roundKey];
  if (!roundGames || !Array.isArray(roundGames) || roundGames.length === 0) {
    return NextResponse.json({
      ok: true,
      applied: [],
      message: `No games for ${round} in results.json.`,
    });
  }

  const teams = await prisma.team.findMany({
    where: { tournamentYearId: tournamentYear.id },
    select: { id: true, name: true, shortName: true },
  });
  const teamByName = new Map(teams.map((t) => [t.name, t.id]));
  const teamByShort = new Map(
    teams.filter((t) => t.shortName).map((t) => [t.shortName!, t.id]),
  );
  const teamByNorm = new Map(teams.map((t) => [normalize(t.name), t.id]));
  const teamByNormShort = new Map(
    teams
      .filter((t) => t.shortName)
      .map((t) => [normalize(t.shortName!), t.id]),
  );
  function findTeamId(name: string): string | null {
    return (
      teamByName.get(name) ??
      teamByShort.get(name) ??
      teamByNorm.get(normalize(name)) ??
      teamByNormShort.get(normalize(name)) ??
      null
    );
  }

  const gamesToApply: { winnerTeamId: string; loserTeamId: string }[] = [];
  for (const g of roundGames) {
    const wid = findTeamId(g.winnerName);
    const lid = findTeamId(g.loserName);
    if (wid && lid) gamesToApply.push({ winnerTeamId: wid, loserTeamId: lid });
  }
  const schemaRound = toSchemaRound(round);
  const n = await applyRoundGames(league.id, schemaRound, gamesToApply);
  return NextResponse.json({
    ok: true,
    action: "apply",
    applied: [{ round, gamesApplied: n }],
    message: `Applied ${round} (${n} games).`,
  });
}
