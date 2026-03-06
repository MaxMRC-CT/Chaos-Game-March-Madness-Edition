import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const EXPECTED: Record<string, number> = {
  R64: 32,
  R32: 16,
  S16: 8,
  E8: 4,
  F4: 2,
  NCG: 1,
};

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

/** GET /api/dev/progress?leagueCode=123456 - DEV only, returns tournament progress */
export async function GET(request: NextRequest) {
  const err = validateDevPanel(request);
  if (err) return err;

  const { searchParams } = new URL(request.url);
  const leagueCode = searchParams.get("leagueCode")?.trim();

  if (!leagueCode || !/^\d{6}$/.test(leagueCode)) {
    return NextResponse.json(
      { ok: false, error: "leagueCode must be 6 digits" },
      { status: 400 }
    );
  }

  const league = await prisma.league.findUnique({
    where: { code: leagueCode },
    select: { id: true, code: true, status: true },
  });

  if (!league) {
    return NextResponse.json({
      ok: true,
      leagueId: null,
      code: leagueCode,
      status: null,
      counts: { R64: 0, R32: 0, S16: 0, E8: 0, F4: 0, NCG: 0 },
      expected: EXPECTED,
      updatedAt: new Date().toISOString(),
    });
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

  return NextResponse.json({
    ok: true,
    leagueId: league.id,
    code: league.code,
    status: league.status,
    counts,
    expected: EXPECTED,
    updatedAt: new Date().toISOString(),
  });
}
