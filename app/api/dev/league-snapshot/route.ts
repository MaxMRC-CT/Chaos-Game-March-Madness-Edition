import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateDevPanel } from "@/lib/dev/validate-dev";

const EXPECTED: Record<string, number> = {
  R64: 32,
  R32: 16,
  S16: 8,
  E8: 4,
  F4: 2,
  NCG: 1,
};

/** GET /api/dev/league-snapshot?leagueId=X or ?code=123456 */
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
      snapshot: null,
      message: "No league found.",
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
    (score.totals as Array<{ memberId: string; displayName: string; total: number }>).length > 0
      ? (score.totals as Array<{ memberId: string; displayName: string; total: number }>)
          .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
      : members.map((m) => ({
          memberId: m.id,
          displayName: m.displayName,
          total: 0,
        }));

  const snapshots = await prisma.leagueScoreSnapshot.findMany({
    where: { leagueId: league.id },
    orderBy: { createdAt: "desc" },
    take: 2,
    select: { totals: true, createdAt: true },
  });
  const deltas: Record<string, number> = {};
  if (snapshots.length >= 2 && Array.isArray(snapshots[0].totals) && Array.isArray(snapshots[1].totals)) {
    const latest = new Map(
      (snapshots[0].totals as Array<{ memberId: string; total: number }>).map((r) => [
        r.memberId,
        r.total ?? 0,
      ]),
    );
    const previous = new Map(
      (snapshots[1].totals as Array<{ memberId: string; total: number }>).map((r) => [
        r.memberId,
        r.total ?? 0,
      ]),
    );
    for (const m of members) {
      deltas[m.id] = (latest.get(m.id) ?? 0) - (previous.get(m.id) ?? 0);
    }
  }
  const topDeltas = Object.entries(deltas)
    .filter(([, v]) => v !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 5)
    .map(([memberId, delta]) => {
      const m = members.find((x) => x.id === memberId);
      return { displayName: m?.displayName ?? memberId.slice(0, 8), delta };
    });

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
      topDeltas,
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
