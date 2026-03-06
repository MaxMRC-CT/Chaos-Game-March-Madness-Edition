import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { makeNicknameKey } from "@/lib/league/nickname";
import { generateReconnectCode } from "@/lib/utils/reconnect";
import { cookies } from "next/headers";

async function generateUniqueReconnectCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateReconnectCode();
    const existing = await prisma.leagueMember.findUnique({
      where: { reconnectCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Failed to generate reconnect code");
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

export async function POST(request: NextRequest) {
  const err = validateDevPanel(request);
  if (err) return err;

  let body: { code?: string; year?: number };
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
      { ok: false, error: "code must be exactly 6 digits" },
      { status: 400 }
    );
  }

  const year = typeof body.year === "number" ? body.year : 2025;

  const tournamentYear = await prisma.tournamentYear.upsert({
    where: { year },
    update: {},
    create: {
      year,
      name: `NCAA ${year}`,
    },
    select: { id: true, year: true },
  });

  const teamCount = await prisma.team.count({
    where: { tournamentYearId: tournamentYear.id },
  });

  if (teamCount === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `No teams for year ${year}. Run: npm run seed:2025`,
      },
      { status: 400 }
    );
  }

  const existing = await prisma.league.findUnique({
    where: { code },
    select: { id: true },
  });

  if (existing) {
    const leagueId = existing.id;
    await prisma.portfolioPick.deleteMany({ where: { leagueId } });
    await prisma.draftPick.deleteMany({ where: { leagueId } });
    await prisma.leagueEvent.deleteMany({ where: { leagueId } });
    await prisma.leagueScoreSnapshot.deleteMany({ where: { leagueId } });
    await prisma.leagueScore.deleteMany({ where: { leagueId } });
    await prisma.teamResult.deleteMany({ where: { leagueId } });
    await prisma.tournamentGame.deleteMany({ where: { leagueId } });
    await prisma.leagueMember.deleteMany({ where: { leagueId } });
    await prisma.league.delete({ where: { code } });
  }

  const league = await prisma.league.create({
    data: {
      tournamentYearId: tournamentYear.id,
      name: "Dev Pre-Draft League (Test)",
      code,
      status: "SETUP",
    },
    select: { id: true, code: true, status: true },
  });

  const displayName = "Host";
  const nicknameKey = makeNicknameKey(displayName);
  const reconnectCode = await generateUniqueReconnectCode();
  const deviceToken = crypto.randomUUID();

  const host = await prisma.leagueMember.create({
    data: {
      leagueId: league.id,
      nickname: displayName,
      displayName,
      nicknameKey,
      reconnectCode,
      deviceToken,
      isAdmin: true,
    },
    select: { id: true, reconnectCode: true },
  });

  const cookieStore = await cookies();
  cookieStore.set(`cl_member_${league.id}`, host.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return NextResponse.json({
    ok: true,
    leagueId: league.id,
    code: league.code,
    status: league.status,
    hostReconnectCode: host.reconnectCode,
  });
}
