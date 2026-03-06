import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateDevPanel } from "@/lib/dev/validate-dev";
import { RoleType } from "@prisma/client";

const PICKS_PER_ROLE = 2;

/** GET /api/dev/managed-league?leagueId=X or ?code=123456 */
export async function GET(request: NextRequest) {
  const err = validateDevPanel(request);
  if (err) return err;

  const { searchParams } = new URL(request.url);
  const leagueIdParam = searchParams.get("leagueId")?.trim();
  const codeParam = searchParams.get("code")?.trim();

  const league = leagueIdParam
    ? await prisma.league.findUnique({
        where: { id: leagueIdParam },
        select: {
          id: true,
          code: true,
          status: true,
          name: true,
          tournamentYearId: true,
        },
      })
    : codeParam && /^\d{6}$/.test(codeParam)
      ? await prisma.league.findUnique({
          where: { code: codeParam },
          select: {
            id: true,
            code: true,
            status: true,
            name: true,
            tournamentYearId: true,
          },
        })
      : null;

  if (!league) {
    return NextResponse.json({
      ok: true,
      league: null,
      members: [],
      rosterStatus: [],
      message: "No managed league. Create one from Test League Factory.",
    });
  }

  const tournamentYear = await prisma.tournamentYear.findUnique({
    where: { id: league.tournamentYearId },
    select: { year: true },
  });
  const year = tournamentYear?.year ?? 2025;

  const members = await prisma.leagueMember.findMany({
    where: { leagueId: league.id },
    orderBy: [{ isAdmin: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      nickname: true,
      displayName: true,
      reconnectCode: true,
      isAdmin: true,
    },
  });

  const picks = await prisma.portfolioPick.findMany({
    where: { leagueId: league.id },
    select: { memberId: true, role: true },
  });

  const picksByMember = new Map<string, Record<RoleType, number>>();
  for (const m of members) {
    picksByMember.set(m.id, { HERO: 0, VILLAIN: 0, CINDERELLA: 0 });
  }
  for (const p of picks) {
    const counts = picksByMember.get(p.memberId);
    if (counts && p.role in counts) counts[p.role as RoleType]++;
  }

  const rosterStatus = members.map((m) => {
    const counts = picksByMember.get(m.id) ?? {
      HERO: 0,
      VILLAIN: 0,
      CINDERELLA: 0,
    };
    const complete =
      counts.HERO === PICKS_PER_ROLE &&
      counts.VILLAIN === PICKS_PER_ROLE &&
      counts.CINDERELLA === PICKS_PER_ROLE;
    return {
      memberId: m.id,
      nickname: m.nickname,
      displayName: m.displayName,
      heroes: counts.HERO,
      villains: counts.VILLAIN,
      cinderellas: counts.CINDERELLA,
      complete,
    };
  });

  const origin =
    request.headers.get("host")?.startsWith("localhost")
      ? `http://${request.headers.get("host")}`
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return NextResponse.json({
    ok: true,
    league: {
      id: league.id,
      code: league.code,
      status: league.status,
      name: league.name,
      year,
    },
    members: members.map((m) => ({
      ...m,
      loginUrl: `${origin}/api/dev/dev-login?leagueId=${encodeURIComponent(league.id)}&memberId=${encodeURIComponent(m.id)}`,
    })),
    rosterStatus,
    message: null,
  });
}
