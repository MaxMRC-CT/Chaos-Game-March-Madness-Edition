/**
 * Member-level submission and editability state.
 * Separates member state from league lifecycle for pre-tip UX.
 */

const PICKS_PER_MEMBER = 6;

export type LeagueStatus = "SETUP" | "LOCKED" | "DRAFT" | "LIVE" | "COMPLETE";

/** Member has 6 picks (2/2/2) and championship tiebreaker. */
export function memberHasSubmittedPortfolio(
  myPicksCount: number,
  championshipPrediction: number | null | undefined,
): boolean {
  return myPicksCount >= PICKS_PER_MEMBER && championshipPrediction != null;
}

/** Picks are editable until league goes LIVE. */
export function canEditPortfolio(leagueStatus: string): boolean {
  return leagueStatus === "SETUP" || leagueStatus === "LOCKED" || leagueStatus === "DRAFT";
}

/** League is pre-tip (not yet live). */
export function isPreTip(leagueStatus: string): boolean {
  return leagueStatus === "SETUP" || leagueStatus === "LOCKED" || leagueStatus === "DRAFT";
}

/** All members have submitted: each has 6 picks + tiebreaker. */
export function allMembersSubmitted(
  members: Array<{ id: string }>,
  picks: Array<{ memberId: string }>,
  championshipByMemberId: Map<string, number | null | undefined>,
): boolean {
  if (members.length === 0) return false;
  const picksPerMember = new Map<string, number>();
  for (const p of picks) {
    picksPerMember.set(p.memberId, (picksPerMember.get(p.memberId) ?? 0) + 1);
  }
  return members.every(
    (m) =>
      (picksPerMember.get(m.id) ?? 0) >= PICKS_PER_MEMBER &&
      championshipByMemberId.get(m.id) != null,
  );
}
