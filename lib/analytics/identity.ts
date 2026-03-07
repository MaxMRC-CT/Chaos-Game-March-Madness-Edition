/**
 * Portfolio Identity — locked to initial picks only.
 * Season-long strategic identity derived from roster composition at lock.
 * Does NOT use tournament outcomes. Remains stable throughout the season.
 */

import type { PickWithOwnership } from "./leverage";

export type IdentityMetrics = {
  /** 0-100: avg ownership. Higher = more popular picks. */
  fieldAlignment: number;
  /** 0-100: inverse of field alignment. Higher = more contrarian upside. */
  upsideVsField: number;
  /** 0-100: seed spread, role mix, ownership spread. */
  riskProfile: number;
  /** 0-100: avg inverse ownership for villain picks. Higher = more anti-chalk villains. */
  antiChalkExposure: number;
  /** 0-100: seed boldness + inverse ownership for cinderella picks. */
  upsetDependency: number;
};

export type IdentityArchetype = {
  name: string;
  explanation: string;
};

/** Field Alignment (0-100): average ownership of selected picks. Higher = more chalky. */
function computeFieldAlignment(picks: PickWithOwnership[]): number {
  if (picks.length === 0) return 0;
  const sum = picks.reduce((acc, p) => acc + p.ownershipPct, 0);
  return Math.round(sum / picks.length);
}

/** Upside vs Field: inverse of field alignment. Higher = more contrarian potential. */
function computeUpsideVsField(fieldAlignment: number): number {
  return Math.round(100 - fieldAlignment);
}

/** Risk Profile: seed spread, villain/cinderella mix, ownership spread. */
function computeRiskProfile(picks: PickWithOwnership[]): number {
  if (picks.length === 0) return 0;
  const seeds = picks.map((p) => p.seed);
  const minSeed = Math.min(...seeds);
  const maxSeed = Math.max(...seeds);
  const seedSpread = maxSeed - minSeed;
  const villainCount = picks.filter((p) => p.role === "VILLAIN").length;
  const cinderellaCount = picks.filter((p) => p.role === "CINDERELLA").length;
  const riskRoleBonus = (villainCount + cinderellaCount) / picks.length;
  const ownershipSpread =
    Math.max(...picks.map((p) => p.ownershipPct)) - Math.min(...picks.map((p) => p.ownershipPct));

  const seedComponent = Math.min(100, (seedSpread / 15) * 50);
  const roleComponent = riskRoleBonus * 30;
  const ownershipComponent = Math.min(20, ownershipSpread / 5);

  return Math.min(100, Math.round(seedComponent + roleComponent + ownershipComponent));
}

/** Anti-Chalk Exposure: avg inverse ownership for villain picks. Initial-picks only. */
function computeAntiChalkExposure(picks: PickWithOwnership[]): number {
  const villains = picks.filter((p) => p.role === "VILLAIN");
  if (villains.length === 0) return 0;
  const avgInverse = villains.reduce((acc, p) => acc + (100 - p.ownershipPct), 0) / villains.length;
  return Math.round(avgInverse);
}

/** Upset Dependency: seed boldness + inverse ownership for cinderella picks. */
function computeUpsetDependency(picks: PickWithOwnership[]): number {
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
 * Compute identity metrics from initial picks only.
 * No tournament results. Locked at roster submission.
 */
export function computeIdentityMetrics(picks: PickWithOwnership[]): IdentityMetrics {
  const fieldAlignment = computeFieldAlignment(picks);
  return {
    fieldAlignment,
    upsideVsField: computeUpsideVsField(fieldAlignment),
    riskProfile: computeRiskProfile(picks),
    antiChalkExposure: computeAntiChalkExposure(picks),
    upsetDependency: computeUpsetDependency(picks),
  };
}

/**
 * Map identity metrics to archetype. Deterministic, threshold-based.
 */
export function getIdentityArchetype(m: IdentityMetrics): IdentityArchetype {
  const { fieldAlignment, upsideVsField, riskProfile, antiChalkExposure, upsetDependency } = m;

  if (fieldAlignment >= 55 && upsideVsField < 40) {
    return {
      name: "Chalk Controller",
      explanation: "You leaned into popular picks and rode with the field.",
    };
  }
  if (fieldAlignment < 40 && antiChalkExposure >= 55 && upsetDependency >= 45) {
    return {
      name: "Chaos Agent",
      explanation: "You faded the field and embraced volatility. Your season rides on disruption.",
    };
  }
  if (antiChalkExposure >= 60 && fieldAlignment < 55) {
    return {
      name: "Field Assassin",
      explanation: "You targeted low-owned villains to differentiate from the field.",
    };
  }
  if (upsetDependency >= 55 && fieldAlignment < 60) {
    return {
      name: "Upset Hunter",
      explanation: "Your portfolio leans heavily on underdog runs for upside.",
    };
  }
  if (riskProfile >= 65) {
    return {
      name: "Wildcard Architect",
      explanation: "You embraced volatility with bold seeds and spread ownership.",
    };
  }
  return {
    name: "Strategic Builder",
    explanation: "You balanced chalk and contrarian picks for steady differentiation.",
  };
}

/** Interpretation label for Field Alignment (0-100). */
export function getFieldAlignmentLabel(score: number): string {
  if (score >= 60) return "Chalky";
  if (score >= 45) return "Balanced";
  if (score >= 30) return "Contrarian";
  return "Heavy Fade";
}

export function getFieldAlignmentExplanation(score: number): string {
  if (score >= 60) return "You leaned into the favorites.";
  if (score >= 45) return "You mixed popular and unique picks.";
  if (score >= 30) return "You intentionally faded popular teams.";
  return "You intentionally faded popular teams.";
}

/** Interpretation label for Upside vs Field. */
export function getUpsideVsFieldLabel(score: number): string {
  if (score >= 70) return "High";
  if (score >= 50) return "Moderate";
  if (score >= 30) return "Low";
  return "Minimal";
}

export function getUpsideVsFieldExplanation(score: number): string {
  if (score >= 70) return "Your picks create strong separation if they hit.";
  if (score >= 50) return "Your picks create strong separation if they hit.";
  if (score >= 30) return "Limited separation from consensus.";
  return "You tracked closely with popular picks.";
}

/** Interpretation label for Risk Profile. */
export function getRiskProfileLabel(score: number): string {
  if (score >= 65) return "High";
  if (score >= 40) return "Balanced";
  return "Low";
}

export function getRiskProfileExplanation(score: number): string {
  if (score >= 65) return "Your build has high volatility.";
  if (score >= 40) return "Your build has medium volatility.";
  return "Your build has low volatility.";
}

/** Interpretation label for Anti-Chalk Exposure. */
export function getAntiChalkExposureLabel(score: number): string {
  if (score >= 60) return "High";
  if (score >= 40) return "Moderate";
  return "Low";
}

export function getAntiChalkExposureExplanation(score: number): string {
  if (score >= 60) return "You're betting against popular favorites.";
  if (score >= 40) return "You're betting against popular favorites.";
  return "Your villains align with popular chalk.";
}

/** Interpretation label for Upset Dependency. */
export function getUpsetDependencyLabel(score: number): string {
  if (score >= 60) return "High";
  if (score >= 40) return "Moderate";
  return "Low";
}

export function getUpsetDependencyExplanation(score: number): string {
  if (score >= 60) return "Your success partially depends on underdog runs.";
  if (score >= 40) return "Your success partially depends on underdog runs.";
  return "Your build is less dependent on upsets.";
}
