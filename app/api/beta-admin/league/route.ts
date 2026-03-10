import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateBetaAdmin } from "@/lib/beta-admin/validate-beta-admin";
import { RoleType } from "@prisma/client";

const PICKS_PER_ROLE = 2;

/** GET /api/beta-admin/league?code=123456 or ?leagueId=X - Load league metadata (no dev-login links) */
export async function GET(request: NextRequest) {
  const err = validateBetaAdmin(request);
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
      rosterComplete: 0,
      rosterTotal: 0,
      message: "League not found.",
    });
  }

  const [tournamentYear, members, picks] = await Promise.all([
    prisma.tournamentYear.findUnique({
      where: { id: league.tournamentYearId },
      select: { year: true },
    }),
    prisma.leagueMember.findMany({
      where: { leagueId: league.id },
      select: { id: true },
    }),
    prisma.portfolioPick.findMany({
      where: { leagueId: league.id },
      select: { memberId: true, role: true },
    }),
  ]);

  const picksByMember = new Map<string, Record<RoleType, number>>();
  for (const m of members) {
    picksByMember.set(m.id, { HERO: 0, VILLAIN: 0, CINDERELLA: 0 });
  }
  for (const p of picks) {
    const counts = picksByMember.get(p.memberId);
    if (counts && p.role in counts) counts[p.role as RoleType]++;
  }

  let rosterComplete = 0;
  for (const m of members) {
    const counts = picksByMember.get(m.id) ?? {
      HERO: 0,
      VILLAIN: 0,
      CINDERELLA: 0,
    };
    const complete =
      counts.HERO === PICKS_PER_ROLE &&
      counts.VILLAIN === PICKS_PER_ROLE &&
      counts.CINDERELLA === PICKS_PER_ROLE;
    if (complete) rosterComplete++;
  }

  return NextResponse.json({
    ok: true,
    league: {
      id: league.id,
      code: league.code,
      status: league.status,
      name: league.name,
      year: tournamentYear?.year ?? 2025,
      memberCount: members.length,
      rosterComplete,
      rosterTotal: members.length,
    },
    message: null,
  });
}
