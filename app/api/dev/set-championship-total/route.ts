import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

export async function POST(request: Request) {
  const envCheck = validateDevPanel();
  if (envCheck) return envCheck;

  const xKey = request.headers.get("x-dev-key");
  if (xKey !== process.env.DEV_PANEL_KEY) {
    return NextResponse.json({ error: "Invalid dev panel key" }, { status: 403 });
  }

  const dbUrl = process.env.DATABASE_URL ?? "";
  if (dbUrl.includes("morning-meadow")) {
    return NextResponse.json(
      { error: "Refused: DATABASE_URL contains 'morning-meadow' (production DB)" },
      { status: 403 },
    );
  }

  let body: { leagueCode?: string; championshipTotalPoints?: number };
  try {
    body = (await request.json()) as { leagueCode?: string; championshipTotalPoints?: number };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const leagueCode = String(body.leagueCode ?? "").trim();
  const championshipTotalPoints =
    typeof body.championshipTotalPoints === "number" ? body.championshipTotalPoints : null;

  if (!leagueCode) {
    return NextResponse.json({ error: "leagueCode is required" }, { status: 400 });
  }

  const league = await prisma.league.findUnique({
    where: { code: leagueCode },
    select: { id: true },
  });

  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  await prisma.league.update({
    where: { id: league.id },
    data: { championshipTotalPoints },
  });

  return NextResponse.json({
    ok: true,
    leagueCode,
    championshipTotalPoints,
  });
}
