"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { RoleType } from "@prisma/client";

const PICKS_PER_ROLE = 2;
const CINDERELLA_MIN_SEED = 10;

export type PortfolioValidation =
  | { ok: true }
  | { ok: false; error: string };

function validatePortfolio(
  picks: Array<{ teamId: string; role: RoleType }>,
  teamsByRole: Map<string, { seed: number }>,
): PortfolioValidation {
  const byRole = { HERO: 0, VILLAIN: 0, CINDERELLA: 0 };
  const teamIds = new Set<string>();

  for (const p of picks) {
    if (teamIds.has(p.teamId)) {
      return { ok: false, error: "Same team cannot be selected twice." };
    }
    teamIds.add(p.teamId);
    byRole[p.role]++;
  }

  if (byRole.HERO !== PICKS_PER_ROLE || byRole.VILLAIN !== PICKS_PER_ROLE || byRole.CINDERELLA !== PICKS_PER_ROLE) {
    return {
      ok: false,
      error: `Select exactly 2 Heroes, 2 Villains, and 2 Cinderellas (current: ${byRole.HERO}/${byRole.VILLAIN}/${byRole.CINDERELLA}).`,
    };
  }

  for (const p of picks) {
    if (p.role === "CINDERELLA") {
      const team = teamsByRole.get(p.teamId);
      if (team && team.seed < CINDERELLA_MIN_SEED) {
        return {
          ok: false,
          error: `Cinderella picks must be seed ${CINDERELLA_MIN_SEED}+. This team is seed ${team.seed}.`,
        };
      }
    }
  }

  return { ok: true };
}

export async function savePortfolioPicks(
  leagueId: string,
  picks: Array<{ teamId: string; role: RoleType }>,
): Promise<PortfolioValidation & { saved?: boolean }> {
  const cookieStore = await cookies();
  const memberId = cookieStore.get(`cl_member_${leagueId}`)?.value;
  if (!memberId) {
    return { ok: false, error: "Not signed in to this league." };
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, status: true, tournamentYearId: true },
  });
  if (!league) {
    return { ok: false, error: "League not found." };
  }
  if (league.status !== "SETUP") {
    return { ok: false, error: "Picks are locked. Tournament has started." };
  }

  const member = await prisma.leagueMember.findFirst({
    where: { leagueId, id: memberId },
    select: { id: true },
  });
  if (!member) {
    return { ok: false, error: "You are not a member of this league." };
  }

  const teamIds = [...new Set(picks.map((p) => p.teamId))];
  const teams = await prisma.team.findMany({
    where: {
      id: { in: teamIds },
      tournamentYearId: league.tournamentYearId,
    },
    select: { id: true, seed: true },
  });
  const teamsByRole = new Map(teams.map((t) => [t.id, { seed: t.seed }]));

  const validation = validatePortfolio(picks, teamsByRole);
  if (!validation.ok) return validation;

  await prisma.$transaction(async (tx) => {
    await tx.portfolioPick.deleteMany({
      where: { leagueId, memberId },
    });
    await tx.portfolioPick.createMany({
      data: picks.map((p) => ({
        leagueId,
        memberId,
        teamId: p.teamId,
        role: p.role,
      })),
    });
  });

  revalidatePath(`/league/${leagueId}/dashboard`);
  redirect(`/league/${leagueId}/dashboard`);
}
