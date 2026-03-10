import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateBetaAdmin } from "@/lib/beta-admin/validate-beta-admin";

const EXPECTED: Record<string, number> = {
  R64: 32,
  R32: 16,
  S16: 8,
  E8: 4,
  F4: 2,
  NCG: 1,
};

/** GET /api/beta-admin/snapshot?code=123456 or ?leagueId=X - Round counts, standings, recent events */
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
      snapshot: null,
      message: "League not found.",
    });
  }

  const [games, score, events, members, yearRow] = await Promise.all([
    prisma.tournamentGame.findMany({
      where: { leagueId: league.id },
      select: { round: true },
    }),
    prisma.leagueScore.findUnique({
      where: { leagueId: league.id },
      select: { totals: true, updatedAt: true },
    }),
    prisma.leagueEvent.findMany({
      where: { leagueId: league.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { type: true, payload: true, createdAt: true },
    }),
    prisma.leagueMember.findMany({
      where: { leagueId: league.id },
      select: { id: true, displayName: true },
      orderBy: [{ isAdmin: "desc" }, { createdAt: "asc" }],
    }),
    prisma.tournamentYear.findUnique({
      where: { id: league.tournamentYearId },
      select: { year: true },
    }),
  ]);

  const counts: Record<string, number> = {
    R64: 0,
    R32: 0,
    S16: 0,
    E8: 0,
    F4: 0,
    NCG: 0,
  };
  for (const g of games) {
    const key = g.round === "FINAL" ? "NCG" : g.round;
    if (key in counts) counts[key]++;
  }

  const standings =
    Array.isArray(score?.totals) &&
    (
      score.totals as Array<{
        memberId: string;
        displayName: string;
        total: number;
      }>
    ).length > 0
      ? (
          score.totals as Array<{
            memberId: string;
            displayName: string;
            total: number;
          }>
        ).sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
      : members.map((m) => ({
          memberId: m.id,
          displayName: m.displayName,
          total: 0,
        }));

  return NextResponse.json({
    ok: true,
    snapshot: {
      leagueId: league.id,
      code: league.code,
      status: league.status,
      name: league.name,
      year: yearRow?.year ?? 2025,
      counts,
      expected: EXPECTED,
      standings,
      recentEvents: events.map((e) => ({
        type: e.type,
        payload: e.payload,
        createdAt: e.createdAt,
      })),
      scoreUpdatedAt: score?.updatedAt ?? null,
    },
    message: null,
  });
}
