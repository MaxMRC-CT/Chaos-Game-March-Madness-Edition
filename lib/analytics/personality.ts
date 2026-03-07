/**
 * v2.2 Phase 1B: Portfolio personality metrics.
 * Quantified portfolio identity derived from composition + outcomes.
 */

import type { PickWithOwnership } from "./leverage";
import { computePortfolioLeverage, getPickLeverage } from "./leverage";
import type { TeamResult } from "./leverage";

export type PersonalityMetrics = {
  chalkIndex: number;
  leverageIndex: number;
  volatilityIndex: number;
  villainAggressionScore: number;
  cinderellaRiskScore: number;
};

/**
 * Chalk Index (0–100): Average ownership of selected picks.
 * Higher = more chalky (popular picks).
 */
export function computeChalkIndex(picks: PickWithOwnership[]): number {
  if (picks.length === 0) return 0;
  const sum = picks.reduce((acc, p) => acc + p.ownershipPct, 0);
  return Math.round(sum / picks.length);
}

/**
 * Leverage Index (0–100): Normalized inverse-ownership weighted performance.
 * Higher = more contrarian/leverage-oriented portfolio.
 * Uses portfolio leverage normalized by a rough max (e.g. 50).
 */
export function computeLeverageIndex(
  picks: PickWithOwnership[],
  resultByTeamId: Map<string, TeamResult>,
): number {
  const portfolioLeverage = computePortfolioLeverage(picks, resultByTeamId);
  const maxTypical = 40;
  return Math.min(100, Math.round((portfolioLeverage / maxTypical) * 100));
}

/**
 * Volatility Index (0–100): Portfolio risk profile.
 * Based on: seed spread, role mix (villain/cinderella = riskier), ownership spread.
 */
export function computeVolatilityIndex(picks: PickWithOwnership[]): number {
  if (picks.length === 0) return 0;
  const seeds = picks.map((p) => p.seed);
  const minSeed = Math.min(...seeds);
  const maxSeed = Math.max(...seeds);
  const seedSpread = maxSeed - minSeed;

  const villainCount = picks.filter((p) => p.role === "VILLAIN").length;
  const cinderellaCount = picks.filter((p) => p.role === "CINDERELLA").length;
  const riskRoleBonus = (villainCount + cinderellaCount) / picks.length;

  const ownershipSpread = Math.max(...picks.map((p) => p.ownershipPct)) - Math.min(...picks.map((p) => p.ownershipPct));

  const seedComponent = Math.min(100, (seedSpread / 15) * 50);
  const roleComponent = riskRoleBonus * 30;
  const ownershipComponent = Math.min(20, ownershipSpread / 5);

  return Math.min(100, Math.round(seedComponent + roleComponent + ownershipComponent));
}

/**
 * Villain Aggression Score (0–100): Concentration and effectiveness of villain strategy.
 * High = low-owned villains that paid off.
 */
export function computeVillainAggressionScore(
  picks: PickWithOwnership[],
  resultByTeamId: Map<string, TeamResult>,
): number {
  const villains = picks.filter((p) => p.role === "VILLAIN");
  if (villains.length === 0) return 0;

  let totalLeverage = 0;
  for (const pick of villains) {
    const { leverage } = getPickLeverage(pick, resultByTeamId);
    totalLeverage += leverage;
  }
  const avgLeverage = totalLeverage / villains.length;
  return Math.min(100, Math.round((avgLeverage / 15) * 100));
}

/**
 * Cinderella Risk Score (0–100): How bold the cinderella picks are.
 * Higher seed + lower ownership = bolder.
 */
export function computeCinderellaRiskScore(picks: PickWithOwnership[]): number {
  const cinderellas = picks.filter((p) => p.role === "CINDERELLA");
  if (cinderellas.length === 0) return 0;

  let score = 0;
  for (const p of cinderellas) {
    const seedBoldness = Math.max(0, (p.seed - 10) / 6) * 40;
    const contrarianBoldness = (1 - p.ownershipPct / 100) * 60;
    score += seedBoldness + contrarianBoldness;
  }
  return Math.min(100, Math.round(score / cinderellas.length));
}

/**
 * Compute all personality metrics.
 */
export function computePersonalityMetrics(
  picks: PickWithOwnership[],
  resultByTeamId: Map<string, TeamResult>,
): PersonalityMetrics {
  return {
    chalkIndex: computeChalkIndex(picks),
    leverageIndex: computeLeverageIndex(picks, resultByTeamId),
    volatilityIndex: computeVolatilityIndex(picks),
    villainAggressionScore: computeVillainAggressionScore(picks, resultByTeamId),
    cinderellaRiskScore: computeCinderellaRiskScore(picks),
  };
}
