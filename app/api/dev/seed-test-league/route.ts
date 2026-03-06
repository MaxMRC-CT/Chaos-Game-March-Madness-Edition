import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { LeagueStatus, DraftRole } from "@prisma/client";

function validateDevPanel() {
  if (process.env.ENV_NAME !== "development") {
    return NextResponse.json(
      { ok: false, error: "Dev panel only available in development" },
      { status: 403 }
    );
  }

  const key = process.env.DEV_PANEL_KEY;
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "DEV_PANEL_KEY not configured" },
      { status: 500 }
    );
  }

  return null;
}

function nicknameKeyOf(nickname: string) {
  return nickname.trim().toLowerCase().replace(/\s+/g, "");
}

function randomCode(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function POST(request: NextRequest) {
  const envCheck = validateDevPanel();
  if (envCheck) return envCheck;

  const xKey = request.headers.get("x-dev-key");
  if (xKey !== process.env.DEV_PANEL_KEY) {
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

  let body: { pin?: string; year?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const pin = String(body.pin ?? "123456").trim();
  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json(
      { ok: false, error: "pin must be 6 digits" },
      { status: 400 }
    );
  }

  const year = typeof body.year === "number" ? body.year : 2025;
  if (year < 2020 || year > 2030) {
    return NextResponse.json(
      { ok: false, error: "year must be between 2020 and 2030" },
      { status: 400 }
    );
  }

  const rawMembers = [
    { nickname: "Max", displayName: "Max", isAdmin: true },
    { nickname: "Kara", displayName: "Kara", isAdmin: false },
    { nickname: "Linus", displayName: "Linus", isAdmin: false },
    { nickname: "Pickle", displayName: "Pickle", isAdmin: false },
  ];

  const tournamentYear = await prisma.tournamentYear.upsert({
    where: { year },
    update: {},
    create: {
      year,
      name: `NCAA ${year}`,
    },
    select: { id: true, year: true },
  });

  const existing = await prisma.league.findUnique({
    where: { code: pin },
    select: { id: true },
  });

  if (existing) {
    const leagueId = existing.id;
    await prisma.draftPick.deleteMany({ where: { leagueId } });
    await prisma.leagueEvent.deleteMany({ where: { leagueId } });
    await prisma.leagueScoreSnapshot.deleteMany({ where: { leagueId } });
    await prisma.leagueScore.deleteMany({ where: { leagueId } });
    await prisma.teamResult.deleteMany({ where: { leagueId } });
    await prisma.tournamentGame.deleteMany({ where: { leagueId } });
    await prisma.leagueMember.deleteMany({ where: { leagueId } });
    await prisma.league.delete({ where: { code: pin } });
  }

  const league = await prisma.league.create({
    data: {
      tournamentYearId: tournamentYear.id,
      name: "Dev Chaos League (Test)",
      code: pin,
      status: LeagueStatus.DRAFT,
      currentPick: 0,
    },
    select: { id: true, code: true },
  });

  const leagueId = league.id;
  const members: Array<{
    id: string;
    nickname: string;
    displayName: string;
    draftPosition: number;
    reconnectCode: string;
  }> = [];

  for (let i = 0; i < rawMembers.length; i++) {
    const m = rawMembers[i];
    const reconnectCode = `RC-${randomCode(10)}`;
    const deviceToken = crypto.randomUUID();
    const created = await prisma.leagueMember.create({
      data: {
        leagueId,
        nickname: m.nickname,
        displayName: m.displayName,
        nicknameKey: nicknameKeyOf(m.nickname),
        isAdmin: m.isAdmin,
        draftPosition: i + 1,
        reconnectCode,
        deviceToken,
      },
      select: {
        id: true,
        nickname: true,
        displayName: true,
        draftPosition: true,
        reconnectCode: true,
      },
    });
    members.push({
      id: created.id,
      nickname: created.nickname,
      displayName: created.displayName ?? m.displayName,
      draftPosition: created.draftPosition ?? i + 1,
      reconnectCode: created.reconnectCode,
    });
  }

  const teams = await prisma.team.findMany({
    where: { tournamentYearId: tournamentYear.id },
    orderBy: [{ region: "asc" }, { seed: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  if (teams.length < 12) {
    return NextResponse.json(
      {
        ok: false,
        error: `Not enough teams for year ${year}. Run seed first. Found ${teams.length}.`,
      },
      { status: 400 }
    );
  }

  const roles: DraftRole[] = [
    DraftRole.HERO,
    DraftRole.VILLAIN,
    DraftRole.CINDERELLA,
  ];
  let pickNumber = 1;
  let teamIndex = 0;
  let picksCreated = 0;

  for (const role of roles) {
    for (const member of members) {
      const team = teams[teamIndex++];
      await prisma.draftPick.create({
        data: {
          leagueId,
          memberId: member.id,
          teamId: team.id,
          pickNumber,
          role,
        },
      });
      pickNumber++;
      picksCreated++;
    }
  }

  await prisma.league.update({
    where: { id: leagueId },
    data: {
      status: LeagueStatus.LIVE,
      currentPick: pickNumber - 1,
    },
  });

  return NextResponse.json({
    ok: true,
    leagueId,
    pin,
    year,
    members: members.map((m) => ({
      id: m.id,
      nickname: m.nickname,
      displayName: m.displayName,
      draftPosition: m.draftPosition,
      reconnectCode: m.reconnectCode,
    })),
    picksCreated,
  });
}
