import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { LeagueStatus, RoleType } from "@prisma/client";
import { validateDevPanel } from "@/lib/dev/validate-dev";

const PICKS_PER_ROLE = 2;
const CINDERELLA_MIN_SEED = 10;

/** POST /api/dev/roster-actions - autofill, reset, lock, unlock */
export async function POST(request: NextRequest) {
  const err = validateDevPanel(request);
  if (err) return err;

  let body: { leagueId?: string; code?: string; action: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const action = String(body.action ?? "").toLowerCase();
  const leagueIdParam = body.leagueId?.trim();
  const codeParam = body.code?.trim();

  const league = leagueIdParam
    ? await prisma.league.findUnique({ where: { id: leagueIdParam } })
    : codeParam && /^\d{6}$/.test(codeParam)
      ? await prisma.league.findUnique({ where: { code: codeParam } })
      : null;

  if (!league) {
    return NextResponse.json(
      { ok: false, error: "League not found. Provide leagueId or code." },
      { status: 404 },
    );
  }

  if (action === "autofill") {
    if (league.status !== "SETUP") {
      return NextResponse.json(
        { ok: false, error: "League must be SETUP to autofill rosters." },
        { status: 400 },
      );
    }

    const members = await prisma.leagueMember.findMany({
      where: { leagueId: league.id },
      select: { id: true },
    });
    const teams = await prisma.team.findMany({
      where: { tournamentYearId: league.tournamentYearId },
      select: { id: true, seed: true },
      orderBy: [{ region: "asc" }, { seed: "asc" }, { name: "asc" }],
    });
    const cinderellaTeams = teams.filter((t) => t.seed >= CINDERELLA_MIN_SEED);
    const heroVillainTeams = teams.filter((t) => t.seed < CINDERELLA_MIN_SEED);

    if (cinderellaTeams.length < 2 || heroVillainTeams.length < 4) {
      return NextResponse.json(
        {
          ok: false,
          error: "Not enough teams for valid portfolios (need seed 10+ for Cinderellas).",
        },
        { status: 400 },
      );
    }

    function shuffle<T>(arr: T[]): T[] {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    }

    let autofilled = 0;
    for (const member of members) {
      const existing = await prisma.portfolioPick.findMany({
        where: { leagueId: league.id, memberId: member.id },
        select: { teamId: true, role: true },
      });
      const counts = { HERO: 0, VILLAIN: 0, CINDERELLA: 0 };
      for (const p of existing) {
        counts[p.role as RoleType]++;
      }
      if (
        counts.HERO === PICKS_PER_ROLE &&
        counts.VILLAIN === PICKS_PER_ROLE &&
        counts.CINDERELLA === PICKS_PER_ROLE
      ) {
        continue;
      }

      await prisma.portfolioPick.deleteMany({
        where: { leagueId: league.id, memberId: member.id },
      });

      const hvShuffled = shuffle([...heroVillainTeams]);
      const cinShuffled = shuffle([...cinderellaTeams]);
      const usedThisMember = new Set<string>();

      const toCreate: { memberId: string; teamId: string; role: RoleType }[] = [];

      for (let i = 0; i < PICKS_PER_ROLE; i++) {
        const t = hvShuffled.find((x) => !usedThisMember.has(x.id));
        if (t) {
          toCreate.push({ memberId: member.id, teamId: t.id, role: "HERO" });
          usedThisMember.add(t.id);
        }
      }
      for (let i = 0; i < PICKS_PER_ROLE; i++) {
        const t = hvShuffled.find((x) => !usedThisMember.has(x.id));
        if (t) {
          toCreate.push({ memberId: member.id, teamId: t.id, role: "VILLAIN" });
          usedThisMember.add(t.id);
        }
      }
      for (let i = 0; i < PICKS_PER_ROLE; i++) {
        const t = cinShuffled.find((x) => !usedThisMember.has(x.id));
        if (t) {
          toCreate.push({ memberId: member.id, teamId: t.id, role: "CINDERELLA" });
          usedThisMember.add(t.id);
        }
      }

      if (toCreate.length === 6) {
        await prisma.portfolioPick.createMany({
          data: toCreate.map((p) => ({
            leagueId: league.id,
            memberId: p.memberId,
            teamId: p.teamId,
            role: p.role,
          })),
        });
        autofilled++;
      }
    }

    return NextResponse.json({
      ok: true,
      action: "autofill",
      autofilled,
      message: `Autofilled rosters for ${autofilled} member(s).`,
    });
  }

  if (action === "reset") {
    if (league.status !== "SETUP") {
      return NextResponse.json(
        { ok: false, error: "Set league to SETUP first (unlock picks)." },
        { status: 400 },
      );
    }
    await prisma.portfolioPick.deleteMany({ where: { leagueId: league.id } });
    return NextResponse.json({
      ok: true,
      action: "reset",
      message: "Rosters cleared.",
    });
  }

  if (action === "lock") {
    const allMembers = await prisma.leagueMember.findMany({
      where: { leagueId: league.id },
      select: { id: true },
    });
    for (const m of allMembers) {
      const count = await prisma.portfolioPick.count({
        where: { leagueId: league.id, memberId: m.id },
      });
      if (count !== 6) {
        return NextResponse.json(
          {
            ok: false,
            error: `All members need 6 picks before locking. Use Autofill to complete.`,
          },
          { status: 400 },
        );
      }
    }
    await prisma.league.update({
      where: { id: league.id },
      data: { status: LeagueStatus.LIVE },
    });
    return NextResponse.json({
      ok: true,
      action: "lock",
      message: "Picks locked. League is now LIVE.",
    });
  }

  if (action === "unlock") {
    await prisma.league.update({
      where: { id: league.id },
      data: { status: LeagueStatus.SETUP },
    });
    return NextResponse.json({
      ok: true,
      action: "unlock",
      message: "Picks unlocked. League is SETUP (dev only).",
    });
  }

  return NextResponse.json(
    { ok: false, error: `Unknown action: ${action}. Use: autofill, reset, lock, unlock` },
    { status: 400 },
  );
}
