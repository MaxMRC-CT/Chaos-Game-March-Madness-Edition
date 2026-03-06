import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRoundHealth } from "@/lib/tournament/roundHealth";

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

/** GET /api/dev/round-health?leagueCode=123456 - DEV only, returns per-round health diagnostic */
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
    select: { id: true },
  });

  if (!league) {
    return NextResponse.json(
      { ok: false, error: `League not found for code ${leagueCode}` },
      { status: 404 }
    );
  }

  const result = await getRoundHealth(league.id);
  return NextResponse.json(result);
}
