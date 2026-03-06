import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { LeagueStatus, DraftRole } from "@prisma/client";
import { makeNicknameKey } from "@/lib/league/nickname";
import { generateReconnectCode } from "@/lib/utils/reconnect";
import { cookies } from "next/headers";

const RAW_MEMBERS = [
  { nickname: "Max", isAdmin: true },
  { nickname: "Kara", isAdmin: false },
  { nickname: "Linus", isAdmin: false },
  { nickname: "Pickle", isAdmin: false },
];

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

  if (teamCount < 12) {
    return NextResponse.json(
      {
        ok: false,
        error: `Need at least 12 teams for year ${year}. Run: npm run seed:2025. Found ${teamCount}.`,
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
      name: "Dev Live League (Test)",
      code,
      status: LeagueStatus.LIVE,
      currentPick: 0,
    },
    select: { id: true, code: true, status: true },
  });

  const leagueId = league.id;
  const members: Array<{
    id: string;
    nickname: string;
    draftPosition: number;
    reconnectCode: string;
  }> = [];

  for (let i = 0; i < RAW_MEMBERS.length; i++) {
    const m = RAW_MEMBERS[i];
    const displayName = m.nickname;
    const nicknameKey = makeNicknameKey(displayName);
    const reconnectCode = await generateUniqueReconnectCode();
    const deviceToken = crypto.randomUUID();

    const created = await prisma.leagueMember.create({
      data: {
        leagueId,
        nickname: displayName,
        displayName,
        nicknameKey,
        isAdmin: m.isAdmin,
        draftPosition: i + 1,
        reconnectCode,
        deviceToken,
      },
      select: { id: true, nickname: true, draftPosition: true, reconnectCode: true },
    });
    members.push({
      id: created.id,
      nickname: created.nickname,
      draftPosition: created.draftPosition ?? i + 1,
      reconnectCode: created.reconnectCode,
    });
  }

  const teams = await prisma.team.findMany({
    where: { tournamentYearId: tournamentYear.id },
    orderBy: [{ seed: "asc" }, { name: "asc" }],
    take: 12,
    select: { id: true },
  });

  if (teams.length < 12) {
    return NextResponse.json(
      {
        ok: false,
        error: `Need 12 teams, found ${teams.length}. Run seed:2025.`,
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
      currentPick: 12,
    },
  });

  const maxMember = members.find((m) => m.nickname === "Max");
  if (maxMember) {
    const cookieStore = await cookies();
    cookieStore.set(`cl_member_${leagueId}`, maxMember.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  return NextResponse.json({
    ok: true,
    leagueId,
    code: league.code,
    status: "LIVE",
    members: members.map((m) => ({
      id: m.id,
      nickname: m.nickname,
      draftPosition: m.draftPosition,
      reconnectCode: m.reconnectCode,
    })),
    picksCreated,
  });
}
