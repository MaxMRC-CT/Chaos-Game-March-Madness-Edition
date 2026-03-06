// prisma/seed-dev.ts
import "dotenv/config";
import { PrismaClient, LeagueStatus, DraftRole } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * 2025 replay dev league. Change these for a fresh test league.
 */
const TEST_TOURNAMENT_YEAR = 2025;
const TEST_LEAGUE_NAME = "Dev Chaos League (2025 Replay)";
const TEST_LEAGUE_CODE = "123456"; // 6-digit PIN for /join flow

function nicknameKeyOf(nickname: string) {
  return nickname.trim().toLowerCase().replace(/\s+/g, "");
}

function randomCode(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function main() {
  // 1) Ensure TournamentYear 2025 exists and has teams
  const tournamentYear = await prisma.tournamentYear.upsert({
    where: { year: TEST_TOURNAMENT_YEAR },
    update: {},
    create: {
      year: TEST_TOURNAMENT_YEAR,
      name: `NCAA ${TEST_TOURNAMENT_YEAR}`,
    },
    select: { id: true, year: true, name: true },
  });

  const teamCount = await prisma.team.count({
    where: { tournamentYearId: tournamentYear.id },
  });

  if (teamCount < 12) {
    throw new Error(
      `No teams found for year ${TEST_TOURNAMENT_YEAR}. Run: npm run seed:all`
    );
  }

  // 2) Delete existing test league (safe cleanup)
  const existing = await prisma.league.findUnique({
    where: { code: TEST_LEAGUE_CODE },
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
    await prisma.league.delete({ where: { code: TEST_LEAGUE_CODE } });
  }

  // 3) Create league
  const league = await prisma.league.create({
    data: {
      tournamentYearId: tournamentYear.id,
      name: TEST_LEAGUE_NAME,
      code: TEST_LEAGUE_CODE,
      status: LeagueStatus.DRAFT,
      currentPick: 0,
    },
    select: { id: true, code: true },
  });

  const leagueId = league.id;

  // 4) Create members: Host, Kara, Player3, Player4
  const rawMembers = [
    { nickname: "Host", displayName: "Host", isAdmin: true },
    { nickname: "Kara", displayName: "Kara", isAdmin: false },
    { nickname: "Player3", displayName: "Player 3", isAdmin: false },
    { nickname: "Player4", displayName: "Player 4", isAdmin: false },
  ];

  const members: Array<{ id: string; nickname: string; draftPosition: number | null; reconnectCode: string }> = [];

  for (let i = 0; i < rawMembers.length; i++) {
    const m = rawMembers[i];
    const reconnectCode = `RC-${randomCode(10)}`;
    const created = await prisma.leagueMember.create({
      data: {
        leagueId,
        nickname: m.nickname,
        displayName: m.displayName,
        nicknameKey: nicknameKeyOf(m.nickname),
        isAdmin: m.isAdmin,
        draftPosition: i + 1,
        reconnectCode,
      },
      select: { id: true, nickname: true, draftPosition: true },
    });
    members.push({ ...created, reconnectCode });
  }

  // 5) Pull teams for this tournament year
  const teams = await prisma.team.findMany({
    where: { tournamentYearId: tournamentYear.id },
    orderBy: [{ region: "asc" }, { seed: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  if (teams.length < 12) {
    throw new Error(
      `Not enough teams for year ${tournamentYear.year}. Found ${teams.length}.`
    );
  }

  // 6) Create draft picks: 4 members × 3 roles (HERO, VILLAIN, CINDERELLA)
  const roles: DraftRole[] = [DraftRole.HERO, DraftRole.VILLAIN, DraftRole.CINDERELLA];
  let pickNumber = 1;
  let teamIndex = 0;

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
    }
  }

  // 7) Set league to LIVE
  await prisma.league.update({
    where: { id: leagueId },
    data: {
      status: LeagueStatus.LIVE,
      currentPick: pickNumber - 1,
    },
  });

  console.log("✅ Dev 2025 replay league created");
  console.log("PIN:", league.code);
  console.log("leagueId:", leagueId);
  console.log("Reconnect codes (league is LIVE - use /join → Reconnect):");
  for (const m of members) {
    console.log(`  ${m.nickname}: ${m.reconnectCode}`);
  }
}

main()
  .catch((e) => {
    console.error("❌ seed-dev failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
