/**
 * Rivalry Layer: Derived analytics for narrative tension and strategic storytelling.
 * No schema changes. Uses existing picks, standings, ownership, and events.
 *
 * Heuristics:
 * - Roster overlap: shared picks on same team (collision potential)
 * - Inverse builds: my Hero = your Villain (direct conflict)
 * - Score proximity: close in standings
 * - Head-to-head tension: RIVALRY_BONUS events between members
 * - Live leverage collision: both have picks on same active team
 */

export type PickLite = {
  memberId: string;
  teamId: string;
  role: "HERO" | "VILLAIN" | "CINDERELLA";
};

export type StandingRowLite = {
  memberId: string;
  displayName: string;
  total: number;
};

export type RivalryInsight = {
  type: "closest_rival" | "strategic_collision" | "direct_conflict" | "biggest_threat" | "most_opposed";
  label: string;
  memberId: string;
  displayName: string;
  detail: string;
  score: number;
};

export type ContrarianLabel =
  | "League Antagonist"
  | "Contrarian Builder"
  | "Chalk Challenger"
  | null;

export type RivalryPanel = {
  closestRival: RivalryInsight | null;
  strategicCollision: RivalryInsight | null;
  directConflict: RivalryInsight | null;
  biggestThreat: RivalryInsight | null;
  mostOpposed: RivalryInsight | null;
};

/**
 * Compute roster overlap between two members (shared picks on same team).
 * Returns count of overlapping team picks (any role).
 */
export function rosterOverlapCount(
  picks: PickLite[],
  memberA: string,
  memberB: string,
): number {
  const aTeams = new Set(
    picks.filter((p) => p.memberId === memberA).map((p) => p.teamId),
  );
  let count = 0;
  for (const p of picks) {
    if (p.memberId === memberB && aTeams.has(p.teamId)) count++;
  }
  return count;
}

/**
 * Check for inverse build: my Hero is your Villain, or vice versa.
 * Returns true if any team has opposite roles between the two members.
 */
export function hasInverseBuild(
  picks: PickLite[],
  memberA: string,
  memberB: string,
): { teamId: string; myRole: string; theirRole: string } | null {
  const aByTeam = new Map<string, PickLite>();
  for (const p of picks) {
    if (p.memberId === memberA) aByTeam.set(p.teamId, p);
  }
  for (const p of picks) {
    if (p.memberId !== memberB) continue;
    const a = aByTeam.get(p.teamId);
    if (!a) continue;
    if (
      (a.role === "HERO" && p.role === "VILLAIN") ||
      (a.role === "VILLAIN" && p.role === "HERO") ||
      (a.role === "HERO" && p.role === "CINDERELLA") ||
      (a.role === "CINDERELLA" && p.role === "HERO")
    ) {
      return { teamId: p.teamId, myRole: a.role, theirRole: p.role };
    }
  }
  return null;
}

/**
 * Score proximity: how close two members are in standings.
 * Returns 0–100, higher = closer (fewer points apart).
 */
export function scoreProximity(
  standings: StandingRowLite[],
  memberA: string,
  memberB: string,
): number {
  const a = standings.find((s) => s.memberId === memberA);
  const b = standings.find((s) => s.memberId === memberB);
  if (!a || !b) return 0;
  const diff = Math.abs(a.total - b.total);
  if (diff >= 50) return 0;
  return Math.max(0, 100 - diff * 2);
}

/**
 * RIVALRY_BONUS payload: memberId, winnerTeamId, loserTeamId, delta, rule.
 * Use ownershipMap to infer head-to-head: if A owns winner and B owns loser (or vice versa), they collided.
 */
function rivalryTensionScore(
  events: Array<{ type: string; payload: unknown }>,
  memberA: string,
  memberB: string,
  ownershipMap: Record<string, Array<{ ownerMemberId: string }>>,
): number {
  let score = 0;
  for (const e of events) {
    if (e.type !== "RIVALRY_BONUS") continue;
    const p = (e.payload || {}) as Record<string, unknown>;
    const memberId = String(p.memberId ?? "");
    const winnerTeamId = String(p.winnerTeamId ?? "");
    const loserTeamId = String(p.loserTeamId ?? "");

    const winnerOwners = (ownershipMap[winnerTeamId] ?? []).map((o) => o.ownerMemberId);
    const loserOwners = (ownershipMap[loserTeamId] ?? []).map((o) => o.ownerMemberId);
    const aInWinner = winnerOwners.includes(memberA);
    const aInLoser = loserOwners.includes(memberA);
    const bInWinner = winnerOwners.includes(memberB);
    const bInLoser = loserOwners.includes(memberB);

    if ((aInWinner && bInLoser) || (aInLoser && bInWinner)) {
      score += 15;
    } else if (memberId === memberA || memberId === memberB) {
      score += 5;
    }
  }
  return score;
}

/**
 * Portfolio overlap: % of my picks that overlap (same team) with another member.
 * 0 = no overlap, 100 = all picks overlap.
 */
export function portfolioOverlapPct(
  picks: PickLite[],
  myMemberId: string,
  otherMemberId: string,
): number {
  const myPicks = picks.filter((p) => p.memberId === myMemberId);
  const theirTeams = new Set(
    picks.filter((p) => p.memberId === otherMemberId).map((p) => p.teamId),
  );
  if (myPicks.length === 0) return 0;
  let overlap = 0;
  for (const p of myPicks) {
    if (theirTeams.has(p.teamId)) overlap++;
  }
  return Math.round((overlap / myPicks.length) * 100);
}

/**
 * Inverse overlap: count of inverse-role conflicts.
 */
export function inverseConflictCount(
  picks: PickLite[],
  myMemberId: string,
  otherMemberId: string,
): number {
  const myByTeam = new Map<string, PickLite>();
  for (const p of picks) {
    if (p.memberId === myMemberId) myByTeam.set(p.teamId, p);
  }
  let count = 0;
  for (const p of picks) {
    if (p.memberId !== otherMemberId) continue;
    const mine = myByTeam.get(p.teamId);
    if (!mine) continue;
    if (
      (mine.role === "HERO" && p.role === "VILLAIN") ||
      (mine.role === "VILLAIN" && p.role === "HERO") ||
      (mine.role === "HERO" && p.role === "CINDERELLA") ||
      (mine.role === "CINDERELLA" && p.role === "HERO")
    ) {
      count++;
    }
  }
  return count;
}

/**
 * Compute rivalry score between two members (0–100).
 * Weighted: overlap, inverse, proximity, tension.
 */
export function computeRivalryScore(
  picks: PickLite[],
  standings: StandingRowLite[],
  events: Array<{ type: string; payload: unknown }>,
  ownershipMap: Record<string, Array<{ ownerMemberId: string }>>,
  memberA: string,
  memberB: string,
): number {
  const overlap = rosterOverlapCount(picks, memberA, memberB);
  const inverse = hasInverseBuild(picks, memberA, memberB) ? 1 : 0;
  const proximity = scoreProximity(standings, memberA, memberB);
  const tension = rivalryTensionScore(events, memberA, memberB, ownershipMap);

  const overlapScore = Math.min(100, overlap * 20);
  const inverseScore = inverse * 40;
  const proximityScore = proximity * 0.3;
  const tensionScore = Math.min(30, tension);

  return Math.min(100, Math.round(overlapScore + inverseScore + proximityScore + tensionScore));
}

/**
 * Build rivalry panel for a given member.
 */
export function buildRivalryPanel(
  memberId: string,
  picks: PickLite[],
  standings: StandingRowLite[],
  events: Array<{ type: string; payload: unknown }>,
  ownershipMap: Record<string, Array<{ ownerMemberId: string }>>,
  teamById: Record<string, { shortName?: string | null; name: string }>,
): RivalryPanel {
  const others = standings
    .filter((s) => s.memberId !== memberId)
    .map((s) => s.memberId);

  let closestRival: RivalryInsight | null = null;
  let strategicCollision: RivalryInsight | null = null;
  let directConflict: RivalryInsight | null = null;
  let biggestThreat: RivalryInsight | null = null;
  let mostOpposed: RivalryInsight | null = null;

  const myTotal =
    standings.find((s) => s.memberId === memberId)?.total ?? 0;
  const myRank =
    standings.findIndex((s) => s.memberId === memberId) + 1 || standings.length + 1;

  let bestProximity = -1;
  let bestOverlap = -1;
  let bestInverse: { memberId: string; displayName: string; teamName: string; myRole: string; theirRole: string } | null = null;
  let closestBehind: { memberId: string; displayName: string; ptsBehind: number } | null = null;
  let lowestOverlap = 101;

  for (const otherId of others) {
    const other = standings.find((s) => s.memberId === otherId);
    if (!other) continue;

    const overlap = rosterOverlapCount(picks, memberId, otherId);
    const inverse = hasInverseBuild(picks, memberId, otherId);
    const proximity = scoreProximity(standings, memberId, otherId);
    const overlapPct = portfolioOverlapPct(picks, memberId, otherId);

    if (overlap > 0 && overlap > bestOverlap) {
      bestOverlap = overlap;
      const teamIds = new Set<string>();
      for (const p of picks) {
        if (p.memberId === memberId) teamIds.add(p.teamId);
      }
      let sharedTeamName = "";
      for (const p of picks) {
        if (p.memberId === otherId && teamIds.has(p.teamId)) {
          const t = teamById[p.teamId];
          sharedTeamName = t?.shortName || t?.name || "team";
          break;
        }
      }
      strategicCollision = {
        type: "strategic_collision",
        label: `Strategic Collision`,
        memberId: otherId,
        displayName: other.displayName,
        detail: `You and ${other.displayName} share ${overlap} pick${overlap > 1 ? "s" : ""}${sharedTeamName ? ` (${sharedTeamName})` : ""}`,
        score: overlap * 15,
      };
    }

    if (inverse && (!bestInverse || inverse.myRole === "HERO" && inverse.theirRole === "VILLAIN")) {
      const t = teamById[inverse.teamId];
      bestInverse = {
        memberId: otherId,
        displayName: other.displayName,
        teamName: t?.shortName || t?.name || "team",
        myRole: inverse.myRole,
        theirRole: inverse.theirRole,
      };
    }

    if (other.total > myTotal) {
      const ptsBehind = other.total - myTotal;
      if (!closestBehind || ptsBehind < closestBehind.ptsBehind) {
        closestBehind = { memberId: otherId, displayName: other.displayName, ptsBehind };
      }
    }

    if (proximity > bestProximity && other.total < myTotal) {
      const ptsDiff = myTotal - other.total;
      if (ptsDiff <= 15 && ptsDiff >= 0) {
        bestProximity = proximity;
        closestRival = {
          type: "closest_rival",
          label: `Closest Rival`,
          memberId: otherId,
          displayName: other.displayName,
          detail: `${other.displayName} is ${ptsDiff} pt${ptsDiff === 1 ? "" : "s"} behind you`,
          score: proximity,
        };
      }
    }

    if (overlapPct < lowestOverlap && overlapPct < 50) {
      lowestOverlap = overlapPct;
      const inverseCnt = inverseConflictCount(picks, memberId, otherId);
      mostOpposed = {
        type: "most_opposed",
        label: `Most Opposed Portfolio`,
        memberId: otherId,
        displayName: other.displayName,
        detail: inverseCnt > 0
          ? `${inverseCnt} inverse role${inverseCnt > 1 ? "s" : ""} vs ${other.displayName}`
          : `Only ${overlapPct}% overlap with ${other.displayName}`,
        score: 100 - overlapPct,
      };
    }
  }

  if (bestInverse) {
    directConflict = {
      type: "direct_conflict",
      label: `Direct Conflict`,
      memberId: bestInverse.memberId,
      displayName: bestInverse.displayName,
      detail: `Your ${bestInverse.myRole} is ${bestInverse.displayName}'s ${bestInverse.theirRole} (${bestInverse.teamName})`,
      score: 50,
    };
  }

  if (closestBehind) {
    biggestThreat = {
      type: "biggest_threat",
      label: `Biggest Threat`,
      memberId: closestBehind.memberId,
      displayName: closestBehind.displayName,
      detail: `${closestBehind.displayName} leads by ${closestBehind.ptsBehind} pt${closestBehind.ptsBehind === 1 ? "" : "s"}`,
      score: 40,
    };
  }

  return {
    closestRival,
    strategicCollision,
    directConflict,
    biggestThreat,
    mostOpposed,
  };
}

/**
 * Derive chalk index from picks + ownership (when personality not available).
 */
function deriveChalkIndex(
  picks: PickLite[],
  memberId: string,
  ownershipByRole: Record<string, { heroPct: number; villainPct: number; cinderellaPct: number }>,
): number {
  const myPicks = picks.filter((p) => p.memberId === memberId);
  if (myPicks.length === 0) return 0;
  let sum = 0;
  for (const p of myPicks) {
    const obr = ownershipByRole[p.teamId] ?? { heroPct: 0, villainPct: 0, cinderellaPct: 0 };
    const pct = p.role === "HERO" ? obr.heroPct : p.role === "VILLAIN" ? obr.villainPct : obr.cinderellaPct;
    sum += pct;
  }
  return Math.round(sum / myPicks.length);
}

/**
 * Detect contrarian / antagonist identity.
 * Sparse and meaningful. At most one label per member.
 */
export function getContrarianLabel(
  memberId: string,
  picks: PickLite[],
  ownershipByRole: Record<string, { heroPct: number; villainPct: number; cinderellaPct: number }>,
  personality: { chalkIndex: number; leverageIndex: number } | null,
): ContrarianLabel {
  const myPicks = picks.filter((p) => p.memberId === memberId);
  if (myPicks.length === 0) return null;

  let popularAsVillain = 0;
  const chalkIndex = personality?.chalkIndex ?? deriveChalkIndex(picks, memberId, ownershipByRole);
  const lowChalk = chalkIndex < 40;
  const highLeverage = personality ? personality.leverageIndex >= 60 : false;

  for (const p of myPicks) {
    const obr = ownershipByRole[p.teamId] ?? {
      heroPct: 0,
      villainPct: 0,
      cinderellaPct: 0,
    };
    if (p.role === "VILLAIN" && obr.heroPct >= 40) {
      popularAsVillain++;
    }
  }

  if (popularAsVillain >= 2 && lowChalk) return "League Antagonist";
  if (highLeverage && chalkIndex < 30) return "Contrarian Builder";
  if (popularAsVillain >= 1 && lowChalk) return "Chalk Challenger";

  return null;
}
