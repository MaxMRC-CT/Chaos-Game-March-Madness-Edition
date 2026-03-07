/**
 * v2.2 Phase 1C: Momentum / chaos derived events and summaries.
 * Computed from standings, snapshots, events — no schema changes.
 */

import type { Round } from "@prisma/client";

export type StandingRow = {
  memberId: string;
  displayName: string;
  total: number;
};

export type OwnershipByRole = {
  heroPct: number;
  villainPct: number;
  cinderellaPct: number;
};

export type MomentumSummaries = {
  biggestJump: { memberId: string; displayName: string; spots: number; delta: number } | null;
  momentumLeader: { memberId: string; displayName: string; total: number } | null;
  leaderUnderPressure: boolean;
  chaosSpike: { memberId: string; displayName: string; label: string } | null;
};

/**
 * Compute rank order from totals array (sorted by total desc).
 */
function getRankOrder(
  totals: Array<{ memberId: string; total: number }>,
): Map<string, number> {
  const sorted = [...totals].sort((a, b) => b.total - a.total);
  const map = new Map<string, number>();
  sorted.forEach((row, i) => map.set(row.memberId, i + 1));
  return map;
}

/**
 * Extract totals from snapshot.
 */
function extractTotals(totals: unknown): Array<{ memberId: string; total: number }> {
  if (!Array.isArray(totals)) return [];
  return (totals as Array<{ memberId?: unknown; total?: unknown }>)
    .map((row) => ({
      memberId: typeof row.memberId === "string" ? row.memberId : "",
      total: typeof row.total === "number" ? row.total : 0,
    }))
    .filter((r) => r.memberId);
}

/**
 * Biggest Jump: member with largest positive rank improvement this round.
 */
export function computeBiggestJump(
  currentStandings: StandingRow[],
  snapshots: Array<{ totals: unknown }>,
): { memberId: string; displayName: string; spots: number; delta: number } | null {
  if (snapshots.length < 2) return null;
  const prevTotals = extractTotals(snapshots[1].totals);
  const currTotals = currentStandings.map((s) => ({ memberId: s.memberId, total: s.total }));
  const prevRank = getRankOrder(prevTotals);
  const currRank = getRankOrder(currTotals);

  let best: { memberId: string; displayName: string; spots: number; delta: number } | null = null;
  for (const row of currentStandings) {
    const prev = prevRank.get(row.memberId) ?? currentStandings.length + 1;
    const curr = currRank.get(row.memberId) ?? currentStandings.length + 1;
    const spots = prev - curr;
    if (spots <= 0) continue;

    const prevTotal = prevTotals.find((t) => t.memberId === row.memberId)?.total ?? 0;
    const delta = row.total - prevTotal;

    if (!best || spots > best.spots || (spots === best.spots && delta > best.delta)) {
      best = {
        memberId: row.memberId,
        displayName: row.displayName,
        spots,
        delta,
      };
    }
  }
  return best;
}

/**
 * Momentum Leader: current #1.
 */
export function getMomentumLeader(
  standings: StandingRow[],
): { memberId: string; displayName: string; total: number } | null {
  if (standings.length === 0) return null;
  const first = standings[0];
  return {
    memberId: first.memberId,
    displayName: first.displayName,
    total: first.total,
  };
}

/**
 * Leader Under Pressure: #1 lead over #2 is small (< 15 pts).
 */
export function isLeaderUnderPressure(standings: StandingRow[]): boolean {
  if (standings.length < 2) return false;
  const lead = standings[0].total - standings[1].total;
  return lead >= 0 && lead < 15;
}

/**
 * Chaos Spike: biggest jumper who had a villain/rivalry gain in recent events.
 * Simplified: biggest jumper with positive delta.
 */
export function computeChaosSpike(
  biggestJump: { memberId: string; displayName: string; spots: number; delta: number } | null,
  highlightEvents: Array<{ type: string; payload: unknown }>,
  ownershipMap: Record<string, Array<{ ownerMemberId: string; role: string }>>,
): { memberId: string; displayName: string; label: string } | null {
  if (!biggestJump || biggestJump.spots < 2) return null;

  let reason = "";
  for (const event of highlightEvents) {
    const p = (event.payload || {}) as Record<string, unknown>;
    if (event.type === "RIVALRY_BONUS" && String(p.memberId ?? "") === biggestJump.memberId) {
      reason = "rivalry bonus";
      break;
    }
    if (event.type === "TEAM_ELIMINATED") {
      const teamId = String(p.teamId ?? "");
      const owners = ownershipMap[teamId] ?? [];
      const hadVillain = owners.some(
        (o) => o.ownerMemberId === biggestJump.memberId && o.role === "VILLAIN",
      );
      if (hadVillain) {
        reason = "low-owned villain hit";
        break;
      }
    }
  }
  if (!reason) reason = "big round";

  return {
    memberId: biggestJump.memberId,
    displayName: biggestJump.displayName,
    label: `${biggestJump.displayName} jumped ${biggestJump.spots} spots after ${reason}`,
  };
}

/**
 * Build all momentum summaries.
 */
export function buildMomentumSummaries(
  standings: StandingRow[],
  snapshots: Array<{ totals: unknown }>,
  highlightEvents: Array<{ type: string; payload: unknown }>,
  ownershipMap: Record<string, Array<{ ownerMemberId: string; role: string }>>,
): MomentumSummaries {
  const biggestJump = computeBiggestJump(standings, snapshots);
  return {
    biggestJump,
    momentumLeader: getMomentumLeader(standings),
    leaderUnderPressure: isLeaderUnderPressure(standings),
    chaosSpike: computeChaosSpike(biggestJump, highlightEvents, ownershipMap),
  };
}

/**
 * Event-level momentum labels. Used when formatting existing events.
 */
export function getEventMomentumLabel(
  eventType: string,
  payload: Record<string, unknown>,
  ownershipByRole: Record<string, OwnershipByRole>,
): string | null {
  if (eventType === "TEAM_ELIMINATED") {
    const teamId = String(payload.teamId ?? "");
    const obr = ownershipByRole[teamId] ?? { heroPct: 0, villainPct: 0, cinderellaPct: 0 };
    if (obr.heroPct >= 50) return "Chalk Collapse";
    if (obr.villainPct < 30 && obr.villainPct > 0) return "Villain Shockwave";
    return null;
  }
  if (eventType === "RIVALRY_BONUS") {
    const rule = String(payload.rule ?? "");
    if (rule === "CINDERELLA_OVER_HERO") return "Cinderella Surge";
    if (rule === "VILLAIN_OVER_HERO") return "Villain Shockwave";
    return null;
  }
  return null;
}
