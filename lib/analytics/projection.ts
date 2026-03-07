/**
 * v2.3 Projection Preview: next-round point value and swing for active teams.
 * No scoring modifiers – uses existing compute functions.
 */

import type { Round } from "@prisma/client";
import {
  computeCinderellaPoints,
  computeHeroPoints,
  computeVillainPoints,
} from "@/lib/scoring/compute";

const ROUND_ORDER: Round[] = ["R64", "R32", "S16", "E8", "F4", "FINAL", "CHAMP"];

type TeamResultLite = {
  teamId: string;
  wins: number;
  eliminatedRound: Round | null;
};

type PickLite = {
  teamId: string;
  role: "HERO" | "VILLAIN" | "CINDERELLA";
  memberId: string;
  teamName: string;
  seed: number;
};

type OwnershipByRole = {
  heroPct: number;
  villainPct: number;
  cinderellaPct: number;
};

function nextRound(round: Round): Round | null {
  const idx = ROUND_ORDER.indexOf(round);
  if (idx < 0 || idx >= ROUND_ORDER.length - 1) return null;
  return ROUND_ORDER[idx + 1];
}

function pointsForPick(
  role: "HERO" | "VILLAIN" | "CINDERELLA",
  result: TeamResultLite | null | undefined,
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
 * Next-round points if this team wins (HERO/CINDERELLA) or loses (VILLAIN).
 */
function nextRoundPointsIfScenario(
  role: "HERO" | "VILLAIN" | "CINDERELLA",
  result: TeamResultLite | null,
  currentRound: Round,
  scenario: "wins" | "loses",
): number {
  if (!result) return 0;
  if (role === "VILLAIN") {
    if (scenario === "loses") return computeVillainPoints(currentRound);
    return 0;
  }
  if (scenario === "loses") return 0;
  const wins = result.wins + 1;
  if (role === "HERO") return computeHeroPoints(wins);
  const reachedS16 = wins >= 2;
  const reachedE8 = wins >= 3;
  const reachedF4 = wins >= 4;
  return computeCinderellaPoints(wins, reachedS16, reachedE8, reachedF4);
}

export type ProjectionPreview = {
  teamId: string;
  teamName: string;
  role: string;
  currentPoints: number;
  nextRoundPoints: number;
  pointsDelta: number;
  avgOwnershipPct: number;
  youSwing: number;
  leagueSwing: number;
  netSwing: number;
};

/**
 * Projection for one active team: if they win next round, what's the swing?
 */
export function computeProjectionForActiveTeam(
  pick: PickLite,
  result: TeamResultLite | null,
  currentRound: Round,
  ownershipByRole: Record<string, OwnershipByRole>,
  memberId: string,
  allPicks: PickLite[],
): ProjectionPreview | null {
  const isAlive =
    !result || result.eliminatedRound === null || result.eliminatedRound === "CHAMP";
  if (!isAlive) return null;

  const nextRnd = nextRound(currentRound);
  if (!nextRnd) return null;

  const obr = ownershipByRole[pick.teamId] ?? {
    heroPct: 0,
    villainPct: 0,
    cinderellaPct: 0,
  };
  const ownershipPct =
    pick.role === "HERO" ? obr.heroPct : pick.role === "VILLAIN" ? obr.villainPct : obr.cinderellaPct;

  const currentPoints = pointsForPick(pick.role, result);
  const nextPoints =
    pick.role === "VILLAIN"
      ? nextRoundPointsIfScenario(pick.role, result, currentRound, "loses")
      : nextRoundPointsIfScenario(pick.role, result, currentRound, "wins");
  const pointsDelta = nextPoints - currentPoints;

  // You swing = points you gain (win for HERO/CINDERELLA, lose for VILLAIN)
  const youSwing = pick.memberId === memberId ? pointsDelta : 0;

  // League swing = sum of points gained by all owners of this team
  let leagueSwing = 0;
  for (const p of allPicks) {
    if (p.teamId === pick.teamId && p.role === pick.role) {
      leagueSwing += pointsDelta;
    }
  }

  // Net swing for you: you gain, minus league avg (simplified: you - (league/n))
  const memberCount = new Set(allPicks.map((p) => p.memberId)).size;
  const avgLeagueGain = memberCount > 0 ? leagueSwing / memberCount : 0;
  const netSwing = Math.round((youSwing - avgLeagueGain) * 10) / 10;

  return {
    teamId: pick.teamId,
    teamName: pick.teamName,
    role: pick.role,
    currentPoints,
    nextRoundPoints: nextPoints,
    pointsDelta,
    avgOwnershipPct: ownershipPct,
    youSwing,
    leagueSwing,
    netSwing,
  };
}
