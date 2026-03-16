import { DraftRole, LeagueStatus, type RoleType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { makeNicknameKey } from "@/lib/league/nickname";
import { generateReconnectCode } from "@/lib/utils/reconnect";
import { computeLeagueStandings } from "@/lib/scoring/compute";

const DEMO_LEAGUE_CODE = "424242";
const DEMO_LEAGUE_NAME = "Chaos League Demo";
const DEMO_YEAR = 2026;

const DEMO_MEMBERS = [
  {
    nickname: "Max",
    displayName: "Max",
    isAdmin: true,
    championshipPrediction: 148,
    picks: {
      HERO: "Florida",
      VILLAIN: "Duke",
      CINDERELLA: "McNeese",
    },
  },
  {
    nickname: "Kara",
    displayName: "Kara",
    isAdmin: false,
    championshipPrediction: 141,
    picks: {
      HERO: "Houston",
      VILLAIN: "Kansas",
      CINDERELLA: "Northern Iowa",
    },
  },
  {
    nickname: "Jordan",
    displayName: "Jordan",
    isAdmin: false,
    championshipPrediction: 152,
    picks: {
      HERO: "Arizona",
      VILLAIN: "Michigan State",
      CINDERELLA: "High Point",
    },
  },
  {
    nickname: "Riley",
    displayName: "Riley",
    isAdmin: false,
    championshipPrediction: 136,
    picks: {
      HERO: "Tennessee",
      VILLAIN: "UConn",
      CINDERELLA: "VCU",
    },
  },
  {
    nickname: "Quinn",
    displayName: "Quinn",
    isAdmin: false,
    championshipPrediction: 133,
    picks: {
      HERO: "Alabama",
      VILLAIN: "Texas Tech",
      CINDERELLA: "Akron",
    },
  },
  {
    nickname: "Avery",
    displayName: "Avery",
    isAdmin: false,
    championshipPrediction: 144,
    picks: {
      HERO: "Purdue",
      VILLAIN: "Illinois",
      CINDERELLA: "UCF",
    },
  },
] as const;

type DemoSeedResult = {
  leagueId: string;
  memberId: string;
  code: string;
};

function isLocalSafe() {
  const envName = (process.env.ENV_NAME ?? "").toLowerCase();
  const vercelEnv = (process.env.VERCEL_ENV ?? "").toLowerCase();

  if (envName === "production" || vercelEnv === "production") {
    return false;
  }

  return true;
}

function isDevelopmentRuntime() {
  const nodeEnv = (process.env.NODE_ENV ?? "").toLowerCase();
  const envName = (process.env.ENV_NAME ?? "").toLowerCase();
  const vercelEnv = (process.env.VERCEL_ENV ?? "").toLowerCase();

  return (
    nodeEnv !== "production" ||
    envName === "development" ||
    vercelEnv === "development" ||
    vercelEnv === "preview"
  );
}

function normalizeTeamName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

async function generateUniqueReconnectCode() {
  for (let i = 0; i < 10; i += 1) {
    const code = generateReconnectCode();
    const existing = await prisma.leagueMember.findUnique({
      where: { reconnectCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }

  throw new Error("Failed to generate unique reconnect code for demo league.");
}

async function removeLeague(leagueId: string) {
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

async function createDemoLeague(): Promise<DemoSeedResult> {
  const tournamentYear = await prisma.tournamentYear.upsert({
    where: { year: DEMO_YEAR },
    update: {},
    create: { year: DEMO_YEAR, name: `NCAA ${DEMO_YEAR}` },
    select: { id: true },
  });

  const teams = await prisma.team.findMany({
    where: { tournamentYearId: tournamentYear.id },
    select: { id: true, name: true, shortName: true },
    orderBy: [{ region: "asc" }, { seed: "asc" }, { name: "asc" }],
  });

  if (teams.length < 64) {
    throw new Error(`Need 64 seeded ${DEMO_YEAR} teams before creating the demo league.`);
  }

  const teamIdByName = new Map<string, string>();
  for (const team of teams) {
    teamIdByName.set(normalizeTeamName(team.name), team.id);
    if (team.shortName) {
      teamIdByName.set(normalizeTeamName(team.shortName), team.id);
    }
  }

  const existing = await prisma.league.findUnique({
    where: { code: DEMO_LEAGUE_CODE },
    select: { id: true },
  });

  if (existing) {
    await removeLeague(existing.id);
  }

  const league = await prisma.league.create({
    data: {
      tournamentYearId: tournamentYear.id,
      name: DEMO_LEAGUE_NAME,
      code: DEMO_LEAGUE_CODE,
      status: LeagueStatus.LIVE,
      currentPick: DEMO_MEMBERS.length * 3,
      championshipTotalPoints: 148,
    },
    select: { id: true },
  });

  const memberRecords: Array<{ id: string; nickname: string }> = [];

  for (let index = 0; index < DEMO_MEMBERS.length; index += 1) {
    const member = DEMO_MEMBERS[index];
    const created = await prisma.leagueMember.create({
      data: {
        leagueId: league.id,
        nickname: member.nickname,
        displayName: member.displayName,
        nicknameKey: makeNicknameKey(member.displayName),
        isAdmin: member.isAdmin,
        draftPosition: index + 1,
        deviceToken: crypto.randomUUID(),
        reconnectCode: await generateUniqueReconnectCode(),
        championshipPrediction: member.championshipPrediction,
      },
      select: { id: true, nickname: true },
    });
    memberRecords.push(created);
  }

  const portfolioRows: Array<{
    leagueId: string;
    memberId: string;
    teamId: string;
    role: RoleType;
  }> = [];
  const draftRows: Array<{
    leagueId: string;
    memberId: string;
    teamId: string;
    role: DraftRole;
    pickNumber: number;
  }> = [];

  let pickNumber = 1;
  const roleOrder: Array<keyof (typeof DEMO_MEMBERS)[number]["picks"]> = [
    "HERO",
    "VILLAIN",
    "CINDERELLA",
  ];

  for (let memberIndex = 0; memberIndex < DEMO_MEMBERS.length; memberIndex += 1) {
    const member = DEMO_MEMBERS[memberIndex];
    const memberRecord = memberRecords[memberIndex];

    for (const role of roleOrder) {
      const teamName = member.picks[role];
      const teamId = teamIdByName.get(normalizeTeamName(teamName));

      if (!teamId) {
        throw new Error(`Demo team "${teamName}" was not found in the ${DEMO_YEAR} seed data.`);
      }

      portfolioRows.push({
        leagueId: league.id,
        memberId: memberRecord.id,
        teamId,
        role,
      });
      draftRows.push({
        leagueId: league.id,
        memberId: memberRecord.id,
        teamId,
        role: role as DraftRole,
        pickNumber,
      });
      pickNumber += 1;
    }
  }

  await prisma.portfolioPick.createMany({ data: portfolioRows });
  await prisma.draftPick.createMany({ data: draftRows });

  await computeLeagueStandings(league.id);

  return {
    leagueId: league.id,
    memberId: memberRecords[0].id,
    code: DEMO_LEAGUE_CODE,
  };
}

export async function ensureDemoLeague(): Promise<DemoSeedResult> {
  if (!isDevelopmentRuntime() || !isLocalSafe()) {
    throw new Error("Demo league is only available in local development.");
  }

  const existing = await prisma.league.findUnique({
    where: { code: DEMO_LEAGUE_CODE },
    select: {
      id: true,
      status: true,
      tournamentYear: { select: { year: true } },
      members: {
        orderBy: { draftPosition: "asc" },
        select: { id: true, nickname: true },
      },
      portfolioPicks: { select: { id: true } },
      tournamentGames: { select: { id: true } },
      score: { select: { id: true } },
    },
  });

  if (
    existing &&
    existing.tournamentYear.year === DEMO_YEAR &&
    existing.status === LeagueStatus.LIVE &&
    existing.members.length === DEMO_MEMBERS.length &&
    existing.portfolioPicks.length === DEMO_MEMBERS.length * 3 &&
    existing.tournamentGames.length === 0 &&
    existing.score &&
    existing.members[0]
  ) {
    return {
      leagueId: existing.id,
      memberId: existing.members[0].id,
      code: DEMO_LEAGUE_CODE,
    };
  }

  return createDemoLeague();
}
