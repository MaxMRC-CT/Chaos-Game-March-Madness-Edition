/**
 * v2.2 Phase 1A: True leverage analytics.
 * Leverage = inverse-ownership weighted payoff. Low-owned hits score higher leverage.
 */

import type { Round } from "@prisma/client";
import {
  computeCinderellaPoints,
  computeHeroPoints,
  computeVillainPoints,
} from "@/lib/scoring/compute";

export type PickWithOwnership = {
  teamId: string;
  role: "HERO" | "VILLAIN" | "CINDERELLA";
  teamName: string;
  ownershipPct: number;
  seed: number;
};

export type TeamResult = {
  teamId: string;
  wins: number;
  eliminatedRound: Round | null;
};

/**
 * Compute points for a pick based on role and result.
 */
function pointsForPick(
  role: "HERO" | "VILLAIN" | "CINDERELLA",
  result: TeamResult | null | undefined,
): number {
  if (!result) return 0;
  if (role === "HERO") return computeHeroPoints(result.wins);
  if (role === "VILLAIN") return computeVillainPoints(result.eliminatedRound);
  const reachedS16 = result.wins >= 2;
  const reachedE8 = result.wins >= 3;
  const reachedF4 = result.wins >= 4;
  return computeCinderellaPoints(result.wins, reachedS16, reachedE8, reachedF4);
}

/**
 * Pick leverage score: points × inverse-ownership weight.
 * Formula: leverage = points × max(0.05, 1 - ownershipPct/100)^1.2
 * - 0% owned = full leverage multiplier 1
 * - 50% owned ≈ 0.44
 * - 100% owned = 0.05 floor
 */
export function computePickLeverage(points: number, ownershipPct: number): number {
  if (points <= 0) return 0;
  const invOwn = Math.max(0.05, 1 - ownershipPct / 100);
  return Math.round(points * Math.pow(invOwn, 1.2) * 10) / 10;
}

/**
 * For a single pick, get leverage score.
 */
export function getPickLeverage(
  pick: PickWithOwnership,
  resultByTeamId: Map<string, TeamResult>,
): { points: number; leverage: number } {
  const result = resultByTeamId.get(pick.teamId);
  const points = pointsForPick(pick.role, result);
  const leverage = computePickLeverage(points, pick.ownershipPct);
  return { points, leverage };
}

/**
 * Portfolio leverage: average leverage across all picks, or 0 if none.
 */
export function computePortfolioLeverage(
  picks: PickWithOwnership[],
  resultByTeamId: Map<string, TeamResult>,
): number {
  if (picks.length === 0) return 0;
  let sum = 0;
  for (const pick of picks) {
    const { leverage } = getPickLeverage(pick, resultByTeamId);
    sum += leverage;
  }
  return Math.round((sum / picks.length) * 10) / 10;
}

/**
 * Highest leverage hit: pick with max leverage (points × inverse-ownership).
 */
export function getHighestLeverageHit(
  picks: PickWithOwnership[],
  resultByTeamId: Map<string, TeamResult>,
): { teamId: string; teamName: string; role: string; points: number; leverage: number; ownershipPct: number } | null {
  let best: { pick: PickWithOwnership; points: number; leverage: number } | null = null;
  for (const pick of picks) {
    const { points, leverage } = getPickLeverage(pick, resultByTeamId);
    if (points > 0 && (!best || leverage > best.leverage)) {
      best = { pick, points, leverage };
    }
  }
  if (!best) return null;
  return {
    teamId: best.pick.teamId,
    teamName: best.pick.teamName,
    role: best.pick.role,
    points: best.points,
    leverage: best.leverage,
    ownershipPct: best.pick.ownershipPct,
  };
}

/**
 * v2.3 Leverage Index formula: teamPoints × (1 - ownershipPercent).
 * ownershipPct is 0–100.
 */
export function computeLeverageIndexV23(points: number, ownershipPct: number): number {
  if (points <= 0) return 0;
  const invOwn = Math.max(0, 1 - ownershipPct / 100);
  return Math.round(points * invOwn * 10) / 10;
}

/**
 * v2.3 Per-pick leverage using spec formula.
 */
export function getPickLeverageV23(
  pick: PickWithOwnership,
  resultByTeamId: Map<string, TeamResult>,
): { points: number; leverage: number } {
  const result = resultByTeamId.get(pick.teamId);
  const points = pointsForPick(pick.role, result);
  const leverage = computeLeverageIndexV23(points, pick.ownershipPct);
  return { points, leverage };
}

/**
 * v2.3 Chaos Index: sum of pick leverage (v2.3 formula) across all picks.
 */
export function computeChaosIndex(
  picks: PickWithOwnership[],
  resultByTeamId: Map<string, TeamResult>,
): number {
  let sum = 0;
  for (const pick of picks) {
    const result = resultByTeamId.get(pick.teamId);
    const points = pointsForPick(pick.role, result);
    sum += computeLeverageIndexV23(points, pick.ownershipPct);
  }
  return Math.round(sum * 10) / 10;
}

/**
 * v2.3 Top N league-wide picks by leverage (v2.3 formula).
 */
export function getTopLeveragePicksLeagueWide(
  picks: Array<PickWithOwnership & { memberId?: string; memberDisplayName?: string }>,
  resultByTeamId: Map<string, TeamResult>,
  limit = 5,
): Array<{
  teamId: string;
  teamName: string;
  role: string;
  points: number;
  leverage: number;
  ownershipPct: number;
  memberDisplayName?: string;
}> {
  const withLeverage = picks.map((pick) => {
    const result = resultByTeamId.get(pick.teamId);
    const points = pointsForPick(pick.role, result);
    const leverage = computeLeverageIndexV23(points, pick.ownershipPct);
    return { ...pick, points, leverage };
  });
  return withLeverage
    .filter((p) => p.points > 0)
    .sort((a, b) => b.leverage - a.leverage)
    .slice(0, limit)
    .map((p) => ({
      teamId: p.teamId,
      teamName: p.teamName,
      role: p.role,
      points: p.points,
      leverage: p.leverage,
      ownershipPct: p.ownershipPct,
      memberDisplayName: p.memberDisplayName,
    }));
}

/**
 * Most valuable contrarian hit: low-owned (<50%) pick with high points.
 * Contrarian = you were right when most weren't.
 */
export function getMostValuableContrarianHit(
  picks: PickWithOwnership[],
  resultByTeamId: Map<string, TeamResult>,
): { teamId: string; teamName: string; role: string; points: number; ownershipPct: number } | null {
  const contrarian = picks.filter((p) => p.ownershipPct < 50);
  let best: { pick: PickWithOwnership; points: number } | null = null;
  for (const pick of contrarian) {
    const result = resultByTeamId.get(pick.teamId);
    const points = pointsForPick(pick.role, result);
    if (points > 0 && (!best || points > best.points)) {
      best = { pick, points };
    }
  }
  if (!best) return null;
  return {
    teamId: best.pick.teamId,
    teamName: best.pick.teamName,
    role: best.pick.role,
    points: best.points,
    ownershipPct: best.pick.ownershipPct,
  };
}
