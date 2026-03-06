import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

/** GET /api/dev/round-counts?code=123456 - DEV only, returns game counts per round */
export async function GET(request: NextRequest) {
  const envCheck = validateDevPanel();
  if (envCheck) return envCheck;

  const xKey = request.headers.get("x-dev-key");
  if (xKey !== process.env.DEV_PANEL_KEY) {
    return NextResponse.json({ error: "Invalid dev panel key" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const codeParam = searchParams.get("code")?.trim();
  const leagueIdParam = searchParams.get("leagueId")?.trim();

  const league = leagueIdParam
    ? await prisma.league.findUnique({
        where: { id: leagueIdParam },
        select: { id: true, code: true },
      })
    : await prisma.league.findUnique({
        where: { code: codeParam || DEV_LEAGUE_CODE },
        select: { id: true, code: true },
      });

  if (!league) {
    return NextResponse.json(
      { error: `League not found (code=${codeParam ?? DEV_LEAGUE_CODE}, leagueId=${leagueIdParam ?? "—"})` },
      { status: 404 },
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
    if (key in counts) {
      counts[key]++;
    }
  }

  return NextResponse.json({
    leagueId: league.id,
    code: league.code,
    counts,
  });
}
