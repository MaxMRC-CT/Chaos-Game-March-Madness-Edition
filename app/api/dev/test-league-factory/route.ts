import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { LeagueStatus } from "@prisma/client";
import { validateDevPanel } from "@/lib/dev/validate-dev";
import { getAppBaseUrl } from "@/lib/utils/app-url";
import { generateReconnectCode } from "@/lib/utils/reconnect";
import { makeNicknameKey } from "@/lib/league/nickname";

const NICKNAMES = [
  "Host",
  "Kara",
  "Alex",
  "Jordan",
  "Sam",
  "Riley",
  "Morgan",
  "Casey",
  "Taylor",
  "Quinn",
  "Avery",
  "Reese",
  "Parker",
  "Blake",
] as const;

function randomPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function generateUniqueReconnectCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateReconnectCode();
    const existing = await prisma.leagueMember.findUnique({
      where: { reconnectCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Failed to generate unique reconnect code");
}

/** POST /api/dev/test-league-factory - Create fresh 2025 Chaos v2 test league */
export async function POST(request: NextRequest) {
  const err = validateDevPanel(request);
  if (err) return err;

  let body: { numUsers?: number; pin?: string; resetExisting?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const numUsers = Math.min(14, Math.max(1, Number(body.numUsers) ?? 4));
  const pinRaw = body.pin?.trim();
  const pin = pinRaw && /^\d{6}$/.test(pinRaw) ? pinRaw : randomPin();
  const resetExisting = Boolean(body.resetExisting);

  const year = 2025;
  const tournamentYear = await prisma.tournamentYear.upsert({
    where: { year },
    update: {},
    create: { year, name: `NCAA ${year}` },
    select: { id: true, year: true },
  });

  const teamCount = await prisma.team.count({
    where: { tournamentYearId: tournamentYear.id },
  });
  if (teamCount < 12) {
    return NextResponse.json(
      {
        ok: false,
        error: `Need 2025 teams. Run: npm run seed:all. Found ${teamCount} teams.`,
      },
      { status: 400 },
    );
  }

  const existing = await prisma.league.findUnique({
    where: { code: pin },
    select: { id: true },
  });

  if (existing) {
    if (!resetExisting) {
      return NextResponse.json(
        {
          ok: false,
          error: `League with PIN ${pin} already exists. Set resetExisting: true to overwrite.`,
        },
        { status: 400 },
      );
    }
    const leagueId = existing.id;
    await prisma.portfolioPick.deleteMany({ where: { leagueId } });
    await prisma.draftPick.deleteMany({ where: { leagueId } });
    await prisma.leagueEvent.deleteMany({ where: { leagueId } });
    await prisma.leagueScoreSnapshot.deleteMany({ where: { leagueId } });
    await prisma.leagueScore.deleteMany({ where: { leagueId } });
    await prisma.teamResult.deleteMany({ where: { leagueId } });
    await prisma.tournamentGame.deleteMany({ where: { leagueId } });
    await prisma.leagueMember.deleteMany({ where: { leagueId } });
    await prisma.league.delete({ where: { id: leagueId } });
  }

  const league = await prisma.league.create({
    data: {
      tournamentYearId: tournamentYear.id,
      name: "Dev 2025 Test League (Chaos v2)",
      code: pin,
      status: LeagueStatus.SETUP,
      currentPick: 0,
    },
    select: { id: true, code: true, status: true },
  });

  const leagueId = league.id;
  const members: Array<{
    id: string;
    nickname: string;
    displayName: string;
    reconnectCode: string;
    loginUrl: string;
  }> = [];

  const baseUrl = getAppBaseUrl();

  for (let i = 0; i < numUsers; i++) {
    const nickname = NICKNAMES[i] ?? `Player${i + 1}`;
    const displayName = nickname;
    const reconnectCode = await generateUniqueReconnectCode();
    const member = await prisma.leagueMember.create({
      data: {
        leagueId,
        nickname,
        displayName,
        nicknameKey: makeNicknameKey(displayName),
        reconnectCode,
        deviceToken: crypto.randomUUID(),
        isAdmin: i === 0,
      },
      select: { id: true, nickname: true, displayName: true, reconnectCode: true },
    });
    const loginUrl = `${baseUrl}/api/dev/dev-login?leagueId=${encodeURIComponent(leagueId)}&memberId=${encodeURIComponent(member.id)}`;
    members.push({
      ...member,
      loginUrl,
    });
  }

  return NextResponse.json({
    ok: true,
    leagueId,
    pin: league.code,
    status: league.status,
    year,
    members,
    message: "Chaos v2 test league created. Build rosters, then start tournament.",
  });
}
